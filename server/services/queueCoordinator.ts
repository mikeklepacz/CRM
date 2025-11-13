import { addDays, addMinutes } from 'date-fns';
import { computeNextSendSlot } from './smartTiming';
import type { EhubSettings } from '@shared/schema';
import { storage } from '../storage';

/**
 * Queue Coordinator: Central scheduler for email queue management
 * 
 * Responsibilities:
 * - Assigns monotonic time slots (FIFO ordering)
 * - Enforces daily rate limits
 * - Balances sends across timezones
 * - Coordinates with admin/client time windows
 */

export interface QueueSlotRequest {
  // Sequence timing
  stepDelay: number; // Days (e.g., 0 for instant, 0.0035 for 5 min)
  lastStepSentAt: Date | null; // When previous step was sent (null for step 1)
  
  // Admin settings
  adminTimezone: string;
  adminStartHour: number;
  adminEndHour: number;
  minDelayMinutes: number; // Minimum spacing between emails (from E-Hub settings)
  maxDelayMinutes: number; // Maximum spacing for random jitter (from E-Hub settings)
  
  // Recipient context
  recipientBusinessHours: string;
  recipientTimezone: string;
  clientWindowStartOffset: number;
  clientWindowEndHour: number;
  skipWeekends: boolean;
  
  // Queue coordination
  queueTailTime: Date | null; // Last scheduled send in entire queue
  dailyRateLimit: number; // Max emails per day
  currentDailyCount: number; // How many already scheduled today
}

export interface QueueSlotResult {
  nextSendAt: Date;
  queuePosition: number; // Position in queue (1 = first, 2 = second, etc.)
  reason: string; // Human-readable explanation
}

/**
 * Request the next available send slot for an email
 * 
 * Priority logic:
 * 1. Calculate baseline time from step delay
 * 2. Ensure slot is after queue tail (FIFO)
 * 3. Apply admin/client time windows
 * 4. Distribute across day if approaching rate limit
 */
export function requestNextSlot(request: QueueSlotRequest): QueueSlotResult {
  const now = new Date();
  
  // Step 1: Calculate baseline time from sequence delays
  let baselineTime: Date;
  
  if (request.lastStepSentAt) {
    // Follow-up: Add delay to last sent time
    const delayMs = request.stepDelay * 24 * 60 * 60 * 1000;
    baselineTime = new Date(request.lastStepSentAt.getTime() + delayMs);
    
    // If delay has already elapsed, use now
    if (baselineTime <= now) {
      baselineTime = now;
    }
  } else {
    // First email: Apply initial delay from now
    baselineTime = addDays(now, request.stepDelay);
  }
  
  // Step 2: Helper function to generate random delay with rate limit respect
  const generateRandomDelay = (): number => {
    // Pick a random delay between min and max for natural variation
    const randomJitter = request.minDelayMinutes + 
      Math.random() * (request.maxDelayMinutes - request.minDelayMinutes);
    
    let spacing = Math.max(1, randomJitter);
    
    // Respect rate limit if it requires wider spacing
    if (request.dailyRateLimit > 0) {
      const adminWindowMinutes = (request.adminEndHour - request.adminStartHour) * 60;
      const minutesBetweenSends = adminWindowMinutes / request.dailyRateLimit;
      spacing = Math.max(spacing, minutesBetweenSends);
    }
    
    return spacing;
  };
  
  // Step 3: Apply randomization to baseline time (ensures ALL emails get jitter)
  let minimumTime = addMinutes(baselineTime, generateRandomDelay());
  
  // Step 4: Enforce FIFO queue ordering with FRESH random delay
  if (request.queueTailTime) {
    // Queue exists - ensure we're AFTER the tail plus a NEW random spacing
    // This prevents deterministic spacing when queue is already populated
    const afterTail = addMinutes(request.queueTailTime, generateRandomDelay());
    if (afterTail > minimumTime) {
      minimumTime = afterTail;
    }
  }
  
  // Step 5: Apply admin/client time windows using smart timing
  const nextSendAt = computeNextSendSlot({
    baselineTime,
    adminTimezone: request.adminTimezone,
    adminStartHour: request.adminStartHour,
    adminEndHour: request.adminEndHour,
    recipientBusinessHours: request.recipientBusinessHours,
    recipientTimezone: request.recipientTimezone,
    clientWindowStartOffset: request.clientWindowStartOffset,
    clientWindowEndHour: request.clientWindowEndHour,
    skipWeekends: request.skipWeekends,
    minimumTime, // Pass minimumTime to enforce queue order
  });
  
  // Calculate queue position (approximate)
  const queuePosition = request.currentDailyCount + 1;
  
  // Generate human-readable reason
  let reason = '';
  if (request.stepDelay === 0) {
    reason = request.queueTailTime 
      ? `Instant send - queued at position ${queuePosition}`
      : 'Instant send - empty queue, sending at next window';
  } else if (request.queueTailTime && request.queueTailTime > baselineTime) {
    reason = `Joined queue at position ${queuePosition} (${Math.round((request.queueTailTime.getTime() - baselineTime.getTime()) / 60000)} min wait from delay)`;
  } else {
    reason = `Scheduled per ${request.stepDelay * 24 * 60} minute delay`;
  }
  
  return {
    nextSendAt,
    queuePosition,
    reason,
  };
}

/**
 * Get timezone diversity score for balancing sends
 * Returns a randomization factor to prevent all East Coast sends going first
 */
export function getTimezoneDiversityOffset(timezone: string): number {
  // Hash timezone string to get consistent but distributed offset
  let hash = 0;
  for (let i = 0; i < timezone.length; i++) {
    hash = ((hash << 5) - hash) + timezone.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Return offset between -30 and +30 minutes
  return (Math.abs(hash) % 60) - 30;
}

/**
 * Shuffle array with timezone-aware balancing
 * Prevents geographic clustering by adding small time offsets
 */
export function balanceByTimezone<T extends { timezone?: string | null }>(
  items: T[],
  getTimezone: (item: T) => string
): T[] {
  // Group by timezone
  const byTimezone = new Map<string, T[]>();
  
  for (const item of items) {
    const tz = getTimezone(item) || 'America/New_York';
    if (!byTimezone.has(tz)) {
      byTimezone.set(tz, []);
    }
    byTimezone.get(tz)!.push(item);
  }
  
  // Interleave items from different timezones
  const result: T[] = [];
  const timezones = Array.from(byTimezone.keys());
  let maxLength = Math.max(...Array.from(byTimezone.values()).map(arr => arr.length));
  
  for (let i = 0; i < maxLength; i++) {
    for (const tz of timezones) {
      const group = byTimezone.get(tz)!;
      if (i < group.length) {
        result.push(group[i]);
      }
    }
  }
  
  return result;
}

/**
 * Recalculate all pending recipient send times based on current E-Hub settings
 * Called when settings change (min/max delays, time windows, daily limits)
 * Deletes all pending scheduled sends and regenerates them with new jitter
 */
export async function recalculateAllPendingRecipients(settings: EhubSettings): Promise<number> {
  try {
    // Import pre-scheduling service
    const { preScheduleRecipientSends } = await import('./emailSchedulingService');
    
    // Get ALL active recipients (pending or in_sequence status)
    const recipients = await storage.getAllPendingRecipients();
    
    if (recipients.length === 0) {
      console.log('[QueueRecalc] No active recipients to recalculate');
      return 0;
    }
    
    console.log(`[QueueRecalc] Recalculating ${recipients.length} active recipients based on new settings`);
    
    // Delete all pending scheduled sends globally - they'll be regenerated with new settings
    console.log('[QueueRecalc] Deleting all pending scheduled sends...');
    const deletedCount = await storage.deleteAllPendingScheduledSends();
    console.log(`[QueueRecalc] Deleted ${deletedCount} pending scheduled sends`);
    
    // Skip recipients that sent very recently (< 1 hour ago) to avoid recalculating active sends
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const eligibleRecipients = recipients.filter(r => 
      !r.lastStepSentAt || r.lastStepSentAt < oneHourAgo
    );
    
    if (eligibleRecipients.length === 0) {
      console.log('[QueueRecalc] All recipients sent recently - skipping regeneration');
      return 0;
    }
    
    console.log(`[QueueRecalc] ${eligibleRecipients.length} recipients eligible for regeneration`);
    
    // Preload all sequence data (batch query to avoid N+1)
    const sequenceIds = [...new Set(eligibleRecipients.map(r => r.sequenceId))];
    const sequences = await Promise.all(
      sequenceIds.map(id => storage.getSequence(id))
    );
    const sequenceMap = new Map(
      sequences.filter(s => s !== undefined).map(s => [s!.id, s!])
    );
    
    // Pre-schedule and insert all future sends for each eligible recipient
    let regeneratedCount = 0;
    let totalScheduledSends = 0;
    
    for (const recipient of eligibleRecipients) {
      try {
        const sequence = sequenceMap.get(recipient.sequenceId);
        if (!sequence || !sequence.stepDelays) {
          console.warn(`[QueueRecalc] Skipping recipient ${recipient.id} - invalid sequence`);
          continue;
        }
        
        // Generate scheduled sends with new settings (pass settings override)
        const scheduledSends = await preScheduleRecipientSends(
          recipient.id,
          recipient.sequenceId,
          recipient.timezone || 'America/New_York',
          recipient.businessHours || '9-17',
          storage,
          settings  // Pass the new settings to ensure they're used immediately
        );
        
        // Insert the generated scheduled sends into the database
        if (scheduledSends.length > 0) {
          await storage.insertScheduledSends(scheduledSends);
          totalScheduledSends += scheduledSends.length;
        }
        
        regeneratedCount++;
        
      } catch (error: any) {
        console.error(`[QueueRecalc] Error regenerating sends for ${recipient.id}:`, error.message);
        // Continue with other recipients
      }
    }
    
    console.log(`[QueueRecalc] ✅ Regenerated ${totalScheduledSends} scheduled sends for ${regeneratedCount} recipients`);
    return regeneratedCount;
    
  } catch (error: any) {
    console.error('[QueueRecalc] ❌ Fatal error during recalculation:', error);
    throw error;
  }
}
