
import { computeNextSendSlot } from './smartTiming';
import { addDays } from 'date-fns';
import { storage } from '../storage';

/**
 * NEW REAL-TIME SCHEDULING SERVICE
 * 
 * Replaces batch coordinator with immediate per-recipient scheduling.
 * Called at enrollment time to calculate scheduledAt instantly.
 */

export interface ScheduleRecipientParams {
  recipientId: string;
  sequenceId: string;
  stepNumber: number;
  stepDelay: number; // in days (e.g., 0.0035 for 5 minutes)
  lastStepSentAt: Date | null; // null for step 1
  recipientTimezone: string;
  recipientBusinessHours: string;
  userId: string; // Admin/agent who created sequence
}

/**
 * Calculate scheduledAt for a single recipient step immediately
 * 
 * This is the ONLY function that assigns scheduledAt.
 * No batch coordinator. No null scheduledAt.
 * 
 * Flow:
 * 1. Calculate baseline time (now + stepDelay, or lastStepSentAt + stepDelay)
 * 2. Get queue tail (latest scheduledAt for this user)
 * 3. Apply weekend skipping and sending-window alignment via computeNextSendSlot
 * 4. Apply FIFO queue ordering (ensure after tail + rate limit spacing)
 * 5. Apply jitter as final step (so each enrollment gets unique randomization)
 * 
 * @returns scheduledAt as Date (never null)
 */
export async function scheduleRecipient(params: ScheduleRecipientParams): Promise<Date> {
  const {
    stepNumber,
    stepDelay,
    lastStepSentAt,
    recipientTimezone,
    recipientBusinessHours,
    userId,
  } = params;

  // Get E-Hub settings
  const settings = await storage.getEhubSettings();
  if (!settings) {
    throw new Error('E-Hub settings not found');
  }

  // Get admin timezone
  const userPrefs = await storage.getUserPreferences(userId);
  const adminTimezone = userPrefs?.timezone || 'America/New_York';

  const now = new Date();

  // STEP 1: Calculate baseline time from step delay
  let baselineTime: Date;
  
  if (lastStepSentAt) {
    // Follow-up step: add delay to last sent time
    baselineTime = addDays(lastStepSentAt, stepDelay);
    
    // If delay has already elapsed, use now
    if (baselineTime <= now) {
      baselineTime = now;
    }
  } else {
    // First step: add delay from now
    baselineTime = addDays(now, stepDelay);
  }

  // STEP 2: Get queue tail for this user (FIFO enforcement)
  const queueTail = await storage.getLastScheduledSendForUser(userId);

  // STEP 3: Apply business hours, weekends, admin window using smart timing
  let scheduledAt = computeNextSendSlot({
    baselineTime,
    adminTimezone,
    adminStartHour: settings.sendingHoursStart,
    adminEndHour: settings.sendingHoursEnd,
    recipientBusinessHours,
    recipientTimezone,
    clientWindowStartOffset: settings.clientWindowStartOffset,
    clientWindowEndHour: settings.clientWindowEndHour,
    skipWeekends: settings.skipWeekends,
    minimumTime: baselineTime,
  });

  // STEP 4: Apply FIFO queue ordering
  if (queueTail && queueTail.scheduledAt) {
    const adminWindowHours = settings.sendingHoursEnd - settings.sendingHoursStart;
    const adminWindowMinutes = adminWindowHours * 60;
    const minutesBetweenSends = settings.dailyEmailLimit > 0
      ? adminWindowMinutes / settings.dailyEmailLimit
      : 1;
    
    const rateLimitSpacingMs = minutesBetweenSends * 60 * 1000;
    const afterTail = new Date(queueTail.scheduledAt.getTime() + rateLimitSpacingMs);
    
    if (afterTail > scheduledAt) {
      scheduledAt = afterTail;
      
      // STEP 5: Only apply jitter when queue ordering pushed us forward
      const minJitterMs = (settings.minDelayMinutes || 0) * 60 * 1000;
      const maxJitterMs = (settings.maxDelayMinutes || 30) * 60 * 1000;
      const jitterMs = Math.floor(Math.random() * (maxJitterMs - minJitterMs + 1)) + minJitterMs;
      
      scheduledAt = new Date(scheduledAt.getTime() + jitterMs);
    }
  }
  // If no queue or we're already at earliest slot, return it without jitter

  return scheduledAt;
}

/**
 * Helper: Generate random jitter with seconds precision
 * Ensures human-like timing variability
 */
function randomJitter(minMinutes: number, maxMinutes: number): number {
  const minSeconds = minMinutes * 60;
  const maxSeconds = maxMinutes * 60;
  
  if (minSeconds === 0 && maxSeconds === 0) {
    return 0;
  }
  
  const totalSeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
  return totalSeconds * 1000; // Return milliseconds
}
