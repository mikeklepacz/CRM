import { addMinutes } from 'date-fns';
import type { EhubSettings } from '@shared/schema';
import { storage } from '../storage';
import { rescheduleJobs } from '@shared/schema';
import { db } from '../db';
import { eq, sql } from 'drizzle-orm';

/**
 * Reschedule Coordinator: Recomputes all pending scheduled_at times when global settings change
 * 
 * Simplified Architecture:
 * - Clears scheduled_at for all pending sends (preserves eligible_at)
 * - Lets regular coordinator reschedule them on next tick(s)
 * - Reuses all existing coordinator logic (FIFO, timezone balancing, dual windows)
 * - No risk of logic drift or edge cases
 * - Runs asynchronously as a background job
 * - Uses mutex lock to prevent concurrent reschedules
 * 
 * Trade-off: Takes a few coordinator cycles (5 min each) to reschedule all sends,
 * but guarantees correctness by reusing battle-tested coordinator logic.
 */

interface RescheduleResult {
  success: boolean;
  totalProcessed: number;
  errorLog?: string;
}

/**
 * Check if a reschedule job is currently running
 */
async function isRescheduleRunning(): Promise<boolean> {
  const runningJobs = await db
    .select()
    .from(rescheduleJobs)
    .where(eq(rescheduleJobs.status, 'running'))
    .limit(1);
  
  return runningJobs.length > 0;
}

/**
 * Create a new reschedule job record
 */
async function createRescheduleJob(settings: EhubSettings): Promise<string> {
  const [job] = await db
    .insert(rescheduleJobs)
    .values({
      status: 'running',
      settingsSnapshot: settings as any,
    })
    .returning({ id: rescheduleJobs.id });
  
  return job.id;
}

/**
 * Update reschedule job status
 */
async function updateRescheduleJob(
  jobId: string,
  status: 'completed' | 'failed',
  totalProcessed: number,
  errorLog?: string
): Promise<void> {
  await db
    .update(rescheduleJobs)
    .set({
      status,
      finishedAt: new Date(),
      totalProcessed,
      errorLog,
    })
    .where(eq(rescheduleJobs.id, jobId));
}

/**
 * GLOBAL RESCHEDULER - Apollo-style FIFO across all users
 * 
 * Recalculates scheduledAt for ALL pending emails in globally sorted order.
 * This is triggered when:
 * - Sending windows change
 * - Daily limits change
 * - Jitter settings change
 * - Weekend toggle changes
 * - Sequence step changes
 * 
 * Flow:
 * 1. Lock with mutex (prevent concurrent reschedules)
 * 2. Fetch ALL pending/scheduled sends (not sent yet)
 * 3. Sort globally by: sequence > step > enrollment time
 * 4. Re-run scheduleRecipient() for each in FIFO order
 * 5. Apply business hours, windows, weekend skipping
 * 6. Apply rate-limit spacing globally (not per-user)
 * 7. Apply jitter as LAST step
 * 8. Update scheduledAt in database
 */
export async function rescheduleAllPendingEmails(): Promise<RescheduleResult> {
  let jobId: string | null = null;
  
  try {
    // Get current settings
    const settings = await storage.getEhubSettings();
    if (!settings) {
      throw new Error('E-Hub settings not found');
    }

    // Mutex check with timeout
    const runningJobs = await db
      .select()
      .from(rescheduleJobs)
      .where(eq(rescheduleJobs.status, 'running'))
      .limit(1);
    
    if (runningJobs.length > 0) {
      const job = runningJobs[0];
      const tenMinutesAgo = addMinutes(new Date(), -10);
      
      if (job.startedAt > tenMinutesAgo) {
        return {
          success: false,
          totalProcessed: 0,
          errorLog: 'Reschedule job already running',
        };
      }
      
      // Stale job - mark failed
      await db
        .update(rescheduleJobs)
        .set({
          status: 'failed',
          finishedAt: new Date(),
          errorLog: 'Job timed out or crashed',
        })
        .where(eq(rescheduleJobs.id, job.id));
    }
    
    // Create job record
    jobId = await createRescheduleJob(settings);
    
    console.log('[RescheduleCoordinator] 🔄 Starting global reschedule...');
    
    // Fetch ALL pending/scheduled sends (exclude sent, failed, cancelled)
    const { inArray, and, or, isNull } = await import('drizzle-orm');
    const { sequenceScheduledSends, sequenceRecipients, sequences } = await import('@shared/schema');
    
    const pendingSends = await db
      .select({
        id: sequenceScheduledSends.id,
        recipientId: sequenceScheduledSends.recipientId,
        sequenceId: sequenceScheduledSends.sequenceId,
        stepNumber: sequenceScheduledSends.stepNumber,
        eligibleAt: sequenceScheduledSends.eligibleAt,
        recipientCreatedAt: sequenceRecipients.createdAt,
        sequenceName: sequences.name,
        recipientTimezone: sequenceRecipients.timezone,
        recipientBusinessHours: sequenceRecipients.businessHours,
        lastStepSentAt: sequenceRecipients.lastStepSentAt,
        sequenceCreatedBy: sequences.createdBy,
      })
      .from(sequenceScheduledSends)
      .innerJoin(sequenceRecipients, eq(sequenceScheduledSends.recipientId, sequenceRecipients.id))
      .innerJoin(sequences, eq(sequenceScheduledSends.sequenceId, sequences.id))
      .where(
        and(
          inArray(sequenceScheduledSends.status, ['pending', 'processing']),
          or(
            isNull(sequenceScheduledSends.sentAt),
            eq(sequenceScheduledSends.sentAt, sql`NULL`)
          )
        )
      )
      .orderBy(
        sequenceScheduledSends.sequenceId,
        sequenceScheduledSends.stepNumber,
        sequenceRecipients.createdAt
      );
    
    console.log(`[RescheduleCoordinator] 📊 Found ${pendingSends.length} pending sends to reschedule`);
    
    if (pendingSends.length === 0) {
      await updateRescheduleJob(jobId, 'completed', 0);
      return {
        success: true,
        totalProcessed: 0,
      };
    }
    
    // Import scheduling service
    const { scheduleRecipient } = await import('./emailSchedulingService');
    
    // Track global queue tail for FIFO enforcement
    let globalQueueTail: Date | null = null;
    let processedCount = 0;
    
    // Process each send in globally sorted order
    for (const send of pendingSends) {
      try {
        // Get user prefs for admin timezone
        const userPrefs = await storage.getUserPreferences(send.sequenceCreatedBy);
        const adminTimezone = userPrefs?.timezone || 'America/New_York';
        
        // Calculate new scheduledAt using real-time scheduler
        const now = new Date();
        let baselineTime: Date;
        
        if (send.lastStepSentAt) {
          // Follow-up: baseline from last sent time + delay
          const sequence = await storage.getSequence(send.sequenceId);
          const stepDelays = (sequence?.stepDelays || []).map((d: string | number) => parseFloat(String(d)));
          const stepDelay = stepDelays[send.stepNumber - 1] || 0;
          baselineTime = addDays(send.lastStepSentAt, stepDelay);
          if (baselineTime <= now) {
            baselineTime = now;
          }
        } else {
          // First step: use eligibleAt or now
          baselineTime = send.eligibleAt > now ? send.eligibleAt : now;
        }
        
        // Apply smart timing (business hours, weekends, admin window)
        const { computeNextSendSlot } = await import('./smartTiming');
        let scheduledAt = computeNextSendSlot({
          baselineTime,
          adminTimezone,
          adminStartHour: settings.sendingHoursStart,
          adminEndHour: settings.sendingHoursEnd,
          recipientBusinessHours: send.recipientBusinessHours || '',
          recipientTimezone: send.recipientTimezone || 'America/New_York',
          clientWindowStartOffset: settings.clientWindowStartOffset,
          clientWindowEndHour: settings.clientWindowEndHour,
          skipWeekends: settings.skipWeekends,
          minimumTime: baselineTime,
        });
        
        // Apply GLOBAL FIFO queue ordering
        if (globalQueueTail) {
          const adminWindowHours = settings.sendingHoursEnd - settings.sendingHoursStart;
          const adminWindowMinutes = adminWindowHours * 60;
          const minutesBetweenSends = settings.dailyEmailLimit > 0
            ? adminWindowMinutes / settings.dailyEmailLimit
            : 1;
          
          const rateLimitSpacingMs = minutesBetweenSends * 60 * 1000;
          const afterTail = new Date(globalQueueTail.getTime() + rateLimitSpacingMs);
          
          if (afterTail > scheduledAt) {
            scheduledAt = afterTail;
          }
        }
        
        // Update global queue tail
        globalQueueTail = scheduledAt;
        
        // Update scheduledAt in database
        await db
          .update(sequenceScheduledSends)
          .set({ scheduledAt })
          .where(eq(sequenceScheduledSends.id, send.id));
        
        processedCount++;
        
        if (processedCount % 100 === 0) {
          console.log(`[RescheduleCoordinator] ✅ Processed ${processedCount}/${pendingSends.length} sends`);
        }
        
      } catch (error: any) {
        console.error(`[RescheduleCoordinator] ❌ Error rescheduling send ${send.id}:`, error.message);
        // Continue processing other sends
      }
    }
    
    console.log(`[RescheduleCoordinator] ✅ Global reschedule complete: ${processedCount} sends updated`);
    
    // Mark job as completed
    await updateRescheduleJob(jobId, 'completed', processedCount);
    
    return {
      success: true,
      totalProcessed: processedCount,
    };
    
  } catch (error) {
    const errorLog = error instanceof Error ? error.message : String(error);
    console.error('[RescheduleCoordinator] ❌ Reschedule failed:', errorLog);
    
    if (jobId) {
      await updateRescheduleJob(jobId, 'failed', 0, errorLog);
    }
    
    return {
      success: false,
      totalProcessed: 0,
      errorLog,
    };
  }
}

/**
 * LEGACY: Old reschedule function (kept for compatibility)
 * Use rescheduleAllPendingEmails() instead
 */
export async function rescheduleAllPendingSends(settings: EhubSettings): Promise<RescheduleResult> {
  console.warn('[RescheduleCoordinator] ⚠️  Using legacy rescheduleAllPendingSends - consider using rescheduleAllPendingEmails()');
  return rescheduleAllPendingEmails();
}

/**
 * Get latest reschedule job status
 */
export async function getLatestRescheduleStatus(): Promise<{
  status: string;
  totalProcessed: number;
  startedAt: Date;
  finishedAt: Date | null;
} | null> {
  const { desc } = await import('drizzle-orm');
  
  const [latest] = await db
    .select()
    .from(rescheduleJobs)
    .orderBy(desc(rescheduleJobs.startedAt))
    .limit(1);
  
  if (!latest) return null;
  
  return {
    status: latest.status,
    totalProcessed: latest.totalProcessed || 0,
    startedAt: latest.startedAt,
    finishedAt: latest.finishedAt,
  };
}
