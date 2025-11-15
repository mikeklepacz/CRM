import { addDays, addMinutes } from 'date-fns';
import { toZonedTime, fromZonedTime as zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz';
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

// ============================================================================
// Coordinator Utilities
// ============================================================================

/**
 * Check if a date falls on a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

/**
 * Check if current time is within admin's active sending window
 */
export function inActiveWindow(now: Date, settings: EhubSettings): boolean {
  const hour = now.getHours();
  return hour >= settings.sendingHoursStart && hour < settings.sendingHoursEnd;
}

/**
 * Calculate how many coordinator runs are left in today's admin window
 * Assumes coordinator runs every 5 minutes
 */
export function runsLeftInWindow(now: Date, settings: EhubSettings): number {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const endMinutes = settings.sendingHoursEnd * 60;
  
  if (currentMinutes >= endMinutes) return 1;
  
  const remainingMinutes = endMinutes - currentMinutes;
  return Math.ceil(remainingMinutes / 5); // 5-minute coordinator cadence
}

/**
 * Check if email can be sent in client's local business hours
 * Validates:
 * - Not a weekend (if skipWeekends enabled)
 * - After opening hour + offset
 * - Before cutoff hour
 */
export function clientWindowAllows(
  clientLocalTime: Date,
  recipientBusinessHours: string,
  recipientTimezone: string,
  settings: EhubSettings
): boolean {
  // Check weekend
  if (settings.skipWeekends && isWeekend(clientLocalTime)) {
    return false;
  }
  
  // Parse opening hour from business hours (e.g., "9-17" -> 9)
  const openHour = parseInt(recipientBusinessHours.split('-')[0]) || 9;
  
  // Calculate start and cutoff hours
  const startHour = openHour + settings.clientWindowStartOffset;
  const cutoffHour = settings.clientWindowEndHour;
  
  const hour = clientLocalTime.getHours();
  
  if (hour < startHour) return false;
  if (hour >= cutoffHour) return false;
  
  return true;
}

/**
 * Generate random jitter with seconds-level precision for human-like timing
 * Ensures no two consecutive jitters are the same
 * 
 * @param minMinutes - Minimum delay in minutes
 * @param maxMinutes - Maximum delay in minutes
 * @param previousJitterSeconds - Previous jitter to avoid (optional, for duplicate prevention)
 * @returns Total delay in milliseconds (includes random seconds, respects max)
 */
export function randomJitter(minMinutes: number, maxMinutes: number, previousJitterSeconds?: number): number {
  let totalSeconds: number;
  let attempts = 0;
  
  do {
    // Convert min/max to seconds for range
    const minSeconds = minMinutes * 60;
    const maxSeconds = maxMinutes * 60;
    
    // For zero-delay ranges (instant sends), respect that
    if (minSeconds === 0 && maxSeconds === 0) {
      totalSeconds = 0;
    } else {
      // Generate random delay within the full seconds range
      // This gives us sub-minute precision while respecting the max
      totalSeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
    }
    
    attempts++;
    // Prevent infinite loop (should never happen, but safety check)
    if (attempts > 10) {
      break;
    }
  } while (previousJitterSeconds !== undefined && totalSeconds === previousJitterSeconds);
  
  // Return milliseconds
  return totalSeconds * 1000;
}

/**
 * Get start of today (midnight) for daily quota tracking in a specific timezone
 * @param now - Current time
 * @param timezone - Timezone to calculate midnight in (e.g., 'America/New_York')
 * @returns Date representing midnight in the target timezone (as UTC instant)
 */
export function getStartOfToday(now: Date, timezone: string): Date {
  // Get the date in the target timezone (e.g., "2025-05-05")
  const dateString = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  
  // Create midnight timestamp in that timezone (e.g., "2025-05-05 00:00:00")
  const midnightString = `${dateString} 00:00:00`;
  
  // Parse and convert to UTC instant
  return zonedTimeToUtc(midnightString, timezone);
}

/**
 * Find the next valid admin sending window
 * Returns { windowStart, windowEnd, dayStart } for the next available sending period
 * 
 * Logic:
 * - If current time is before today's window start → use today
 * - If current time is after today's window end → use tomorrow
 * - Skip weekends if configured
 * 
 * @param now - Current time
 * @param timezone - Admin's timezone
 * @param settings - E-Hub settings
 * @returns Object with windowStart (when window opens), windowEnd (when it closes), dayStart (midnight)
 */
export function findNextAdminWindowBounds(
  now: Date,
  timezone: string,
  settings: EhubSettings
): { windowStart: Date; windowEnd: Date; dayStart: Date } {
  const nowLocal = toZonedTime(now, timezone);
  const currentHour = nowLocal.getHours();
  
  let candidateDate = new Date(nowLocal);
  
  // If we're past today's window end, start checking from tomorrow
  if (currentHour >= settings.sendingHoursEnd) {
    candidateDate = addDays(candidateDate, 1);
  }
  
  // Skip weekends
  while (settings.skipWeekends && isWeekend(candidateDate)) {
    candidateDate = addDays(candidateDate, 1);
  }
  
  // Get midnight of the candidate day
  const dateString = formatInTimeZone(candidateDate, timezone, 'yyyy-MM-dd');
  const dayStart = zonedTimeToUtc(`${dateString} 00:00:00`, timezone);
  
  // Calculate window start and end
  const windowStartLocal = zonedTimeToUtc(
    `${dateString} ${settings.sendingHoursStart.toString().padStart(2, '0')}:00:00`,
    timezone
  );
  const windowEndLocal = zonedTimeToUtc(
    `${dateString} ${settings.sendingHoursEnd.toString().padStart(2, '0')}:00:00`,
    timezone
  );
  
  return {
    windowStart: windowStartLocal,
    windowEnd: windowEndLocal,
    dayStart,
  };
}

// ============================================================================
// Coordinator Tick - Eligibility-Based Scheduling
// ============================================================================

/**
 * Coordinator tick function - runs every 5 minutes to assign send slots
 * 
 * NEW ARCHITECTURE (Fixed):
 * - ALWAYS runs - no early returns for time/weekends
 * - Pre-fills queue for next available window
 * - Uses scheduling anchor = max(eligible_at, nextWindowStart)
 * - Preserves eligible_at (sequence logic), only modifies scheduled_at
 * - Stores jitter in DB for transparency
 * 
 * Flow:
 * 1. Find next admin window (today if not started, tomorrow if past, skip weekends)
 * 2. Count sent emails for quota day
 * 3. Calculate batch capacity (inside vs outside window logic)
 * 4. Query eligible emails (eligible_at <= now, scheduled_at IS NULL)
 * 5. For each: anchor = max(eligible_at, queueTail), call computeNextSendSlot
 * 6. Store scheduled_at + jitterMinutes in database
 * 7. Commit transaction
 */
export async function coordinatorTick(): Promise<void> {
  const now = new Date();
  
  // Get settings
  const settings = await storage.getEhubSettings();
  if (!settings) {
    console.log('[Coordinator] No E-Hub settings found');
    return;
  }
  
  // Get admin user timezone from user_preferences
  const { db } = await import('../db');
  const { users, userPreferences } = await import('@shared/schema');
  const { eq } = await import('drizzle-orm');
  
  const adminUsers = await db
    .select({
      userId: users.id,
      timezone: userPreferences.timezone,
    })
    .from(users)
    .leftJoin(userPreferences, eq(users.id, userPreferences.userId))
    .where(eq(users.role, 'admin'))
    .limit(1);
  
  const adminUser = adminUsers[0];
  
  if (!adminUser?.timezone) {
    console.log('[Coordinator] No admin user timezone found in preferences, using UTC');
  }
  
  const adminTimezone = adminUser?.timezone || 'UTC';
  console.log(`[Coordinator] Using admin timezone: ${adminTimezone}`);
  
  // Find next valid admin sending window (handles weekends, past windows, etc.)
  const { windowStart, windowEnd, dayStart } = findNextAdminWindowBounds(
    now,
    adminTimezone,
    settings
  );
  
  const inWindow = now >= windowStart && now < windowEnd;
  
  console.log(`[Coordinator] Window: ${windowStart.toISOString()} - ${windowEnd.toISOString()}, inWindow: ${inWindow}`);
  
  // Count emails sent in the quota day (starting from dayStart)
  const { sequenceScheduledSends, sequenceRecipients } = await import('@shared/schema');
  const { and, gte, lte, isNull, isNotNull, sql, desc } = await import('drizzle-orm');
  
  const [sentCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sequenceScheduledSends)
    .where(
      and(
        gte(sequenceScheduledSends.sentAt, dayStart),
        isNotNull(sequenceScheduledSends.sentAt)
      )
    );
  
  const sentToday = sentCountResult?.count || 0;
  const remainingCapacity = settings.dailyEmailLimit - sentToday;
  
  console.log(`[Coordinator] Sent today: ${sentToday}/${settings.dailyEmailLimit}, remaining: ${remainingCapacity}`);
  
  if (remainingCapacity <= 0) {
    console.log('[Coordinator] Daily limit reached - but still checking for eligible emails');
    // Don't return - we still want to see what's eligible
  }
  
  // Calculate batch capacity based on whether we're inside or outside window
  let batchSize: number;
  if (inWindow) {
    // Inside window: distribute remaining capacity across remaining runs today
    const adminLocalTime = toZonedTime(now, adminTimezone);
    const remainingRuns = runsLeftInWindow(adminLocalTime, settings);
    batchSize = Math.max(1, Math.min(5, Math.ceil(remainingCapacity / remainingRuns)));
  } else {
    // Outside window: pre-fill entire next window
    const windowDurationHours = settings.sendingHoursEnd - settings.sendingHoursStart;
    const windowCapacity = Math.floor((windowDurationHours * 60) / 5); // 5-minute coordinator cadence
    batchSize = Math.min(windowCapacity, remainingCapacity, 50); // Cap at 50 to avoid huge batches
  }
  
  console.log(`[Coordinator] Batch size: ${batchSize} (${inWindow ? 'inside window' : 'pre-fill next window'})`);
  
  // Fetch eligible candidates (increased limit for client window filtering)
  const candidatesLimit = batchSize * 3;
  
  // Start transaction
  const result = await db.transaction(async (tx) => {
    // Find current queue tail (latest scheduled_at across all pending sends)
    const [tailResult] = await tx
      .select({ latestScheduled: sql<Date | null>`max(scheduled_at)` })
      .from(sequenceScheduledSends)
      .where(isNotNull(sequenceScheduledSends.scheduledAt));
    
    let queueTail = tailResult?.latestScheduled ? new Date(tailResult.latestScheduled) : null;
    
    // If no queue tail, use windowStart as the starting point
    if (!queueTail || queueTail < windowStart) {
      queueTail = windowStart;
    }
    
    console.log(`[Coordinator] Queue tail: ${queueTail.toISOString()}`);
    
    // Query eligible emails with FOR UPDATE SKIP LOCKED
    const candidates = await tx
      .select({
        id: sequenceScheduledSends.id,
        recipientId: sequenceScheduledSends.recipientId,
        stepNumber: sequenceScheduledSends.stepNumber,
        eligibleAt: sequenceScheduledSends.eligibleAt,
        timezone: sequenceRecipients.timezone,
        businessHours: sequenceRecipients.businessHours,
      })
      .from(sequenceScheduledSends)
      .innerJoin(
        sequenceRecipients,
        eq(sequenceScheduledSends.recipientId, sequenceRecipients.id)
      )
      .where(
        and(
          lte(sequenceScheduledSends.eligibleAt, now),
          isNull(sequenceScheduledSends.scheduledAt),
          isNull(sequenceScheduledSends.sentAt),
          eq(sequenceScheduledSends.status, 'pending')
        )
      )
      .orderBy(
        sequenceScheduledSends.eligibleAt,
        sequenceScheduledSends.recipientId,
        sequenceScheduledSends.stepNumber
      )
      .limit(candidatesLimit)
      .for('update', { skipLocked: true });
    
    if (candidates.length === 0) {
      console.log('[Coordinator] No eligible emails found');
      return 0;
    }
    
    console.log(`[Coordinator] Found ${candidates.length} eligible candidates`);
    
    // Use eligibility planner to balance timezone distribution
    const { planEligibleSchedule } = await import('./eligibilityPlanner');
    const planResult = planEligibleSchedule({
      candidates,
      adminTimezone,
      adminWindowStart: windowStart,
      adminWindowEnd: windowEnd,
      clientWindowStartOffset: settings.clientWindowStartOffset,
      clientWindowEndHour: settings.clientWindowEndHour,
      batchSize,
    });
    
    const balancedCandidates = planResult.balancedCandidates;
    
    // Log timezone distribution for observability
    console.log(`[Coordinator] Timezone distribution:`);
    for (const plan of planResult.timezonePlans) {
      const overlap = Math.round(plan.windowOverlap.overlapMinutes / 60 * 10) / 10; // Round to 1 decimal
      console.log(`  ${plan.timezone}: ${plan.quota}/${plan.candidates.length} (${overlap}h overlap)`);
    }
    console.log(`[Coordinator] Schedulable: ${planResult.totalSchedulable}/${planResult.totalEligible} candidates`);
    
    // Calculate rate-limit spacing (minutes between sends)
    const adminWindowHours = settings.sendingHoursEnd - settings.sendingHoursStart;
    const adminWindowMinutes = adminWindowHours * 60;
    const minutesBetweenSends = settings.dailyEmailLimit > 0
      ? adminWindowMinutes / settings.dailyEmailLimit
      : (settings.minDelayMinutes || 1);
    
    console.log(`[Coordinator] Spacing: ${minutesBetweenSends.toFixed(2)} minutes between sends`);
    
    let scheduledCount = 0;
    let previousJitterSeconds: number | undefined = undefined;
    
    for (const candidate of balancedCandidates) {
      if (scheduledCount >= batchSize) {
        break;
      }
      
      const eligibleAt = new Date(candidate.eligibleAt);
      const anchorTime = eligibleAt > queueTail! ? eligibleAt : queueTail!;
      
      // Generate random jitter with seconds-level precision (returns milliseconds)
      // Pass previous jitter to avoid back-to-back duplicates
      const baseJitterMs = randomJitter(settings.minDelayMinutes, settings.maxDelayMinutes, previousJitterSeconds);
      previousJitterSeconds = baseJitterMs / 1000; // Store for next iteration
      
      // Enforce rate-limit spacing - use whichever is larger
      const rateLimitSpacingMs = minutesBetweenSends * 60 * 1000;
      const appliedJitterMs = Math.max(baseJitterMs, rateLimitSpacingMs);
      
      // Calculate the actual minimum send time (queue tail + applied spacing)
      const minimumSendTime = new Date(queueTail!.getTime() + appliedJitterMs);
      
      // Ensure it's not before eligible_at
      const proposedTime = minimumSendTime > eligibleAt ? minimumSendTime : eligibleAt;
      
      // Call computeNextSendSlot to find next valid slot (respects admin + client windows)
      // Pass proposedTime as minimumTime to ensure slot can't be earlier than jittered baseline
      const sendSlot = computeNextSendSlot({
        baselineTime: proposedTime,
        adminTimezone,
        adminStartHour: settings.sendingHoursStart,
        adminEndHour: settings.sendingHoursEnd,
        recipientBusinessHours: candidate.businessHours || '9-17',
        recipientTimezone: candidate.timezone || 'UTC',
        clientWindowStartOffset: settings.clientWindowStartOffset,
        clientWindowEndHour: settings.clientWindowEndHour,
        skipWeekends: settings.skipWeekends,
        minimumTime: proposedTime, // Enforce jittered time minimum
      });
      
      if (!sendSlot) {
        console.log(`[Coordinator] ⚠️ No valid slot found for candidate ${candidate.id}`);
        continue;
      }
      
      // Calculate actual jitter (in minutes) for transparency
      // This is the total delay from when email became eligible/queue-ready
      const jitterMs = sendSlot.getTime() - anchorTime.getTime();
      const jitterMinutes = Math.round(jitterMs / 60000);
      
      // Update scheduled_at and jitterMinutes
      await tx
        .update(sequenceScheduledSends)
        .set({ 
          scheduledAt: sendSlot,
          jitterMinutes: jitterMinutes.toString()
        })
        .where(eq(sequenceScheduledSends.id, candidate.id));
      
      // Update recipient's nextSendAt for queue visibility
      await tx
        .update(sequenceRecipients)
        .set({ nextSendAt: sendSlot })
        .where(eq(sequenceRecipients.id, candidate.recipientId));
      
      // Advance queue tail to maintain FIFO ordering
      queueTail = sendSlot;
      scheduledCount++;
    }
    
    return scheduledCount;
  });
  
  console.log(`[Coordinator] ✅ Scheduled ${result} emails (${sentToday}/${settings.dailyEmailLimit} sent today)`);
}

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
  
  // Step 2: Calculate rate-limit spacing if applicable
  let rateLimitSpacingMinutes = 0;
  if (request.dailyRateLimit > 0) {
    const adminWindowMinutes = (request.adminEndHour - request.adminStartHour) * 60;
    rateLimitSpacingMinutes = adminWindowMinutes / request.dailyRateLimit;
  }
  
  // Step 3: Calculate initial jitter from baseline (for first email or after step delay)
  const initialJitterMs = randomJitter(request.minDelayMinutes, request.maxDelayMinutes);
  const initialJitterSeconds = initialJitterMs / 1000;
  let minimumTime = new Date(baselineTime.getTime() + initialJitterMs);
  
  // Step 4: Enforce FIFO queue ordering with FRESH random delay
  if (request.queueTailTime) {
    // Queue exists - ensure we're AFTER the tail plus a NEW random jitter
    // Pass previous jitter to avoid back-to-back duplicates
    const queueJitterMs = randomJitter(request.minDelayMinutes, request.maxDelayMinutes, initialJitterSeconds);
    
    // Also respect rate limit spacing
    const effectiveSpacingMs = Math.max(queueJitterMs, rateLimitSpacingMinutes * 60 * 1000);
    const afterTail = new Date(request.queueTailTime.getTime() + effectiveSpacingMs);
    
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
 * Recalculate all pending scheduled sends based on current sequence step delays
 * Called when step delays change - updates eligibleAt in place using SQL
 * Clears scheduledAt so coordinator re-assigns times with current settings
 */
export async function recalculateAllPendingRecipients(settings: EhubSettings): Promise<number> {
  try {
    const { db } = await import('../db');
    const { sequenceScheduledSends, sequenceRecipients, sequences } = await import('@shared/schema');
    const { sql, eq, and, isNull } = await import('drizzle-orm');
    
    console.log('[QueueRecalc] Recalculating eligibleAt for all pending scheduled sends');
    
    // Single SQL UPDATE: Recalculate eligibleAt for all pending sends
    // Two formulas:
    // - First step (no last_step_sent_at): enrolled_at + cumulative_delay(all delays up to step)
    // - Follow-up step (has last_step_sent_at): last_step_sent_at + current_step_gap
    // Note: step_number is 0-indexed, array is 1-indexed
    // Only clamp to NOW() if computed time is in the past (preserve future timing)
    const result = await db.execute(sql`
      UPDATE sequence_scheduled_sends ss
      SET 
        eligible_at = (
          CASE 
            WHEN (
              CASE
                WHEN r.last_step_sent_at IS NULL THEN
                  r.enrolled_at + (
                    SELECT COALESCE(SUM(delay::numeric), 0) 
                    FROM unnest(s.step_delays[1:(ss.step_number+1)]) AS delay
                  ) * INTERVAL '1 day'
                ELSE
                  r.last_step_sent_at + 
                  COALESCE(s.step_delays[ss.step_number+1]::numeric, 0) * INTERVAL '1 day'
              END
            ) < NOW()
            THEN NOW()
            ELSE (
              CASE
                WHEN r.last_step_sent_at IS NULL THEN
                  r.enrolled_at + (
                    SELECT COALESCE(SUM(delay::numeric), 0) 
                    FROM unnest(s.step_delays[1:(ss.step_number+1)]) AS delay
                  ) * INTERVAL '1 day'
                ELSE
                  r.last_step_sent_at + 
                  COALESCE(s.step_delays[ss.step_number+1]::numeric, 0) * INTERVAL '1 day'
              END
            )
          END
        ),
        scheduled_at = NULL
      FROM sequence_recipients r
      JOIN sequences s ON s.id = r.sequence_id
      WHERE ss.recipient_id = r.id
        AND ss.sequence_id = s.id
        AND ss.sent_at IS NULL
        AND ss.status = 'pending'
    `);
    
    const rowCount = parseInt(String(result.rowCount || 0));
    console.log(`[QueueRecalc] ✅ Updated eligibleAt for ${rowCount} pending scheduled sends`);
    
    // Clear recipient nextSendAt so coordinator re-assigns
    await db.execute(sql`
      UPDATE sequence_recipients
      SET next_send_at = NULL
      WHERE status IN ('pending', 'in_sequence')
    `);
    
    return rowCount;
    
  } catch (error: any) {
    console.error('[QueueRecalc] ❌ Fatal error during recalculation:', error);
    throw error;
  }
}
