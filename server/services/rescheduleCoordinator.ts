import { addMinutes } from 'date-fns';
import type { EhubSettings } from '@shared/schema';
import { storage } from '../storage';
import { rescheduleJobs } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

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
 * Main reschedule function - clears scheduled_at for all pending sends
 * 
 * Simplified Flow:
 * 1. Check for concurrent reschedule jobs (mutex lock with timeout)
 * 2. Create new reschedule job record
 * 3. Clear scheduled_at for all pending sends (except imminent ones <5 min)
 * 4. Preserve eligible_at (sequence logic intact)
 * 5. Let coordinator naturally reschedule on next tick(s)
 * 6. Mark job as completed
 * 
 * Why this approach:
 * - Reuses all existing coordinator logic (no duplication)
 * - Guarantees FIFO, timezone balancing, dual-window validation
 * - No risk of breaking sequence timing (eligible_at untouched)
 * - Simple, safe, and bulletproof
 */
export async function rescheduleAllPendingSends(settings: EhubSettings): Promise<RescheduleResult> {
  let jobId: string | null = null;
  
  try {
    // Mutex check with timeout - allow reschedule if last job is >10 min old and still "running"
    const runningJobs = await db
      .select()
      .from(rescheduleJobs)
      .where(eq(rescheduleJobs.status, 'running'))
      .limit(1);
    
    if (runningJobs.length > 0) {
      const job = runningJobs[0];
      const tenMinutesAgo = addMinutes(new Date(), -10);
      
      // If job started < 10 min ago, it's still valid - block
      if (job.startedAt > tenMinutesAgo) {
        return {
          success: false,
          totalProcessed: 0,
          errorLog: 'Reschedule job already running',
        };
      }
      
      // Job is stale (>10 min old and still running) - mark it failed and continue
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
    
    // Clear scheduled_at for all pending sends (except imminent ones)
    const now = new Date();
    const fiveMinutesFromNow = addMinutes(now, 5);
    
    const count = await storage.clearScheduledAtForPendingSends(fiveMinutesFromNow);
    
    // Mark job as completed
    await updateRescheduleJob(jobId, 'completed', count);
    
    return {
      success: true,
      totalProcessed: count,
    };
    
  } catch (error) {
    const errorLog = error instanceof Error ? error.message : String(error);
    
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
