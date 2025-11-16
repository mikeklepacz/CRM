// server/services/matrixScheduler.ts

import { storage } from '../storage';
import { addDays } from 'date-fns';
import { parseBusinessHours } from './timezoneHours';
import { formatInTimeZone } from 'date-fns-tz';

interface MatrixSchedulerParams {
  recipientId: string;
  sequenceId: string;
  stepNumber: number;
  stepDelay: number;
  lastStepSentAt: Date | null;
  recipientTimezone: string;
  recipientBusinessHours: string;
  userId: string;
}

export async function getNextMatrixSlot(
  params: MatrixSchedulerParams
): Promise<Date> {
  const { stepDelay, lastStepSentAt, userId, recipientBusinessHours, recipientTimezone } = params;

  const settings = await storage.getEhubSettings();
  if (!settings) {
    throw new Error('E-Hub settings not found');
  }

  const { clientWindowStartOffset, clientWindowEndHour } = settings;

  const userPrefs = await storage.getUserPreferences(userId);
  const adminTimezone = userPrefs?.timezone || 'America/New_York';

  let baseline = lastStepSentAt
    ? addDays(lastStepSentAt, stepDelay)
    : addDays(new Date(), stepDelay);

  if (baseline < new Date()) {
    baseline = new Date();
  }

  // STEP 4: Get Global Queue Tail (across all users)
  const queueTail = await storage.getQueueTail();

  // Global minimum starts at baseline
  let globalMinimum = baseline;

  // If there is a queue tail, enforce FIFO
  if (queueTail) {
    const tailTime = new Date(queueTail).getTime();
    const baseTime = baseline.getTime();
    globalMinimum = new Date(Math.max(tailTime, baseTime));
  }

  // STEP 5: Apply rate-limit spacing
  const adminWindowHours = settings.sendingHoursEnd - settings.sendingHoursStart;
  const spacingMs = (adminWindowHours * 3600000) / settings.dailyEmailLimit;

  if (queueTail) {
    const tailPlusSpacing = new Date(new Date(queueTail).getTime() + spacingMs);
    globalMinimum = new Date(Math.max(globalMinimum.getTime(), tailPlusSpacing.getTime()));
  }

  // STEP 6: Initialize candidate
  let candidate = globalMinimum;

  // STEP 7: Parse recipient business hours
  const parsed = parseBusinessHours(recipientBusinessHours);

  // STEP 8: Prepare for day-rolling loop (no logic yet)
  let dayLoopDate = candidate;
  let attempts = 0;

  // STEP 9: Admin window boundaries for current day (scaffolding only)
  const adminStartUtc = new Date(Date.UTC(
    dayLoopDate.getUTCFullYear(),
    dayLoopDate.getUTCMonth(),
    dayLoopDate.getUTCDate(),
    settings.sendingHoursStart,
    0,
    0
  ));

  const adminEndUtc = new Date(Date.UTC(
    dayLoopDate.getUTCFullYear(),
    dayLoopDate.getUTCMonth(),
    dayLoopDate.getUTCDate(),
    settings.sendingHoursEnd,
    0,
    0
  ));

  // STEP 10: Recipient delivery window (scaffolding only)

  // Determine recipient's local day-of-week
  const localDay = parseInt(
    formatInTimeZone(dayLoopDate, recipientTimezone, 'e'),
    10
  );

  // Pull that day's schedule from parsed business hours
  const daySchedule = parsed.schedule[localDay];

  // Recipient opening time in local timezone
  let recipientOpenLocal = new Date(
    formatInTimeZone(
      dayLoopDate,
      recipientTimezone,
      `yyyy-MM-dd'T'${daySchedule ? daySchedule.open : '00:00'}:00`
    )
  );

  // Apply client window start offset (hours after opening)
  recipientOpenLocal = new Date(
    recipientOpenLocal.getTime() + clientWindowStartOffset * 3600000
  );

  // Recipient legal end (cutoff) in local timezone
  const recipientEndLocal = new Date(
    formatInTimeZone(
      dayLoopDate,
      recipientTimezone,
      `yyyy-MM-dd'T'${clientWindowEndHour.toString().padStart(2, '0')}:00`
    )
  );

  // Convert both to UTC
  const recipientLegalStartUtc = new Date(recipientOpenLocal);
  const recipientLegalEndUtc = new Date(recipientEndLocal);

  // STEP 11: Compute raw window overlap (scaffolding only)

  const overlapStart = new Date(
    Math.max(adminStartUtc.getTime(), recipientLegalStartUtc.getTime())
  );

  const overlapEnd = new Date(
    Math.min(adminEndUtc.getTime(), recipientLegalEndUtc.getTime())
  );

  return candidate;
}