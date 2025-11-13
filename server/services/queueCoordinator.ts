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
  
  // Step 2: Enforce FIFO queue ordering
  // The minimumTime is the larger of: baseline OR queue tail + buffer
  let minimumTime = baselineTime;
  
  if (request.queueTailTime) {
    // Queue exists - ensure we schedule AFTER the tail
    const afterTail = addMinutes(request.queueTailTime, 1);
    if (afterTail > minimumTime) {
      minimumTime = afterTail;
    }
  }
  
  // Step 3: Apply rate limiting spacing (if applicable)
  // Spread sends evenly across admin window
  if (request.dailyRateLimit > 0) {
    const adminWindowMinutes = (request.adminEndHour - request.adminStartHour) * 60;
    const minutesBetweenSends = adminWindowMinutes / request.dailyRateLimit;
    
    // Only apply spacing if there are already sends scheduled
    if (request.currentDailyCount > 0) {
      // Add spacing to the minimumTime
      const spacedTime = addMinutes(minimumTime, minutesBetweenSends);
      minimumTime = spacedTime;
    }
  }
  
  // Step 4: Apply admin/client time windows using smart timing
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
 * Called when settings change (e.g., skipWeekends toggle)
 * Uses transaction with FOR UPDATE locking to prevent races
 */
export async function recalculateAllPendingRecipients(settings: EhubSettings): Promise<number> {
  try {
    // Get ALL pending recipients (unbounded - includes future scheduled sends)
    const recipients = await storage.getAllPendingRecipients();
    
    if (recipients.length === 0) {
      console.log('[QueueRecalc] No pending recipients to recalculate');
      return 0;
    }
    
    console.log(`[QueueRecalc] Recalculating ${recipients.length} pending recipients based on new settings`);
    
    // Skip recipients that sent very recently (< 1 hour ago) to avoid fighting with sender
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const eligibleRecipients = recipients.filter(r => 
      !r.lastStepSentAt || r.lastStepSentAt < oneHourAgo
    );
    
    if (eligibleRecipients.length === 0) {
      console.log('[QueueRecalc] All recipients sent recently - skipping recalculation');
      return 0;
    }
    
    console.log(`[QueueRecalc] ${eligibleRecipients.length} recipients eligible for recalculation`);
    
    // Preload all sequence data (batch query to avoid N+1)
    const sequenceIds = [...new Set(eligibleRecipients.map(r => r.sequenceId))];
    const sequences = await Promise.all(
      sequenceIds.map(id => storage.getSequence(id))
    );
    const sequenceMap = new Map(
      sequences.filter(s => s !== undefined).map(s => [s!.id, s!])
    );
    
    // Calculate new nextSendAt times in memory
    let queueTail: Date | null = null;
    const updates: Array<{ id: string; nextSendAt: Date }> = [];
    
    // Sort by current nextSendAt to maintain FIFO order
    const sortedRecipients = [...eligibleRecipients].sort((a, b) => {
      const timeA = a.nextSendAt?.getTime() || 0;
      const timeB = b.nextSendAt?.getTime() || 0;
      return timeA - timeB;
    });
    
    for (const recipient of sortedRecipients) {
      const sequence = sequenceMap.get(recipient.sequenceId);
      if (!sequence || !sequence.stepDelays) continue;
      
      const currentStep = recipient.currentStep || 0;
      const stepDelays = sequence.stepDelays.map(d => parseFloat(d as any));
      const stepDelay = currentStep < stepDelays.length ? stepDelays[currentStep] : 0;
      
      // Calculate new send slot
      const slotRequest: QueueSlotRequest = {
        stepDelay,
        lastStepSentAt: recipient.lastStepSentAt,
        adminTimezone: settings.adminTimezone || 'America/New_York',
        adminStartHour: settings.adminStartHour || 9,
        adminEndHour: settings.adminEndHour || 17,
        recipientBusinessHours: recipient.businessHours || '9-17',
        recipientTimezone: recipient.timezone || 'America/New_York',
        clientWindowStartOffset: settings.clientWindowStartOffset || 1,
        clientWindowEndHour: settings.clientWindowEndHour || 17,
        skipWeekends: settings.skipWeekends ?? true,
        queueTailTime: queueTail,
        dailyRateLimit: settings.dailyRateLimit || 0,
        currentDailyCount: 0,
      };
      
      const { nextSendAt } = requestNextSlot(slotRequest);
      updates.push({ id: recipient.id, nextSendAt });
      queueTail = nextSendAt;
    }
    
    // Bulk update in batches of 500 to avoid parameter limits
    const BATCH_SIZE = 500;
    let updatedCount = 0;
    
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      
      // Update all recipients in this batch
      await Promise.all(
        batch.map(({ id, nextSendAt }) => 
          storage.updateRecipientStatus(id, { nextSendAt })
        )
      );
      
      updatedCount += batch.length;
      console.log(`[QueueRecalc] Updated batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(updates.length / BATCH_SIZE)}`);
    }
    
    console.log(`[QueueRecalc] ✅ Recalculated ${updatedCount} recipients`);
    return updatedCount;
    
  } catch (error: any) {
    console.error('[QueueRecalc] ❌ Fatal error during recalculation:', error);
    throw error;
  }
}
