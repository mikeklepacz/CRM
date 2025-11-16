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

  // STEP 8: Prepare for day-rolling loop
  let dayLoopDate = candidate;
  let overlapStart: Date;
  let overlapEnd: Date;

  // STEP 14-Real: Full day-rolling loop
  for (let i = 0; i < 14; i++) {
    // Weekend skipping check
    const adminDay = parseInt(formatInTimeZone(dayLoopDate, adminTimezone, 'e'), 10);
    if (skipWeekends && (adminDay === 6 || adminDay === 7)) {
      candidate = new Date(Date.UTC(
        dayLoopDate.getUTCFullYear(),
        dayLoopDate.getUTCMonth(),
        dayLoopDate.getUTCDate(),
        settings.sendingHoursStart, 0, 0
      ));
      dayLoopDate = addDays(candidate, 1);
      continue;
    }

    // STEP 9: Admin window boundaries for current day
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

    // STEP 10: Recipient delivery window
    const localDay = parseInt(
      formatInTimeZone(dayLoopDate, recipientTimezone, 'e'),
      10
    );

    const daySchedule = parsed.schedule[localDay];

    let recipientOpenLocal = new Date(
      formatInTimeZone(
        dayLoopDate,
        recipientTimezone,
        `yyyy-MM-dd'T'${daySchedule ? daySchedule.open : '00:00'}:00`
      )
    );

    recipientOpenLocal = new Date(
      recipientOpenLocal.getTime() + clientWindowStartOffset * 3600000
    );

    const recipientEndLocal = new Date(
      formatInTimeZone(
        dayLoopDate,
        recipientTimezone,
        `yyyy-MM-dd'T'${clientWindowEndHour.toString().padStart(2, '0')}:00`
      )
    );

    const recipientLegalStartUtc = new Date(recipientOpenLocal);
    const recipientLegalEndUtc = new Date(recipientEndLocal);

    // STEP 11: Compute raw window overlap
    overlapStart = new Date(
      Math.max(adminStartUtc.getTime(), recipientLegalStartUtc.getTime())
    );

    overlapEnd = new Date(
      Math.min(adminEndUtc.getTime(), recipientLegalEndUtc.getTime())
    );

    // Overlap validation and candidate adjustment
    const hasOverlap = overlapStart < overlapEnd;
    const candidateInsideOverlap =
      candidate >= overlapStart && candidate < overlapEnd;
    const candidateBeforeOverlap = candidate < overlapStart;

    if (!hasOverlap) {
      candidate = new Date(Date.UTC(
        dayLoopDate.getUTCFullYear(),
        dayLoopDate.getUTCMonth(),
        dayLoopDate.getUTCDate(),
        settings.sendingHoursStart, 0, 0
      ));
      dayLoopDate = addDays(candidate, 1);
      continue;
    }

    if (candidateInsideOverlap) {
      break;
    }

    if (candidateBeforeOverlap) {
      candidate = new Date(overlapStart);
      break;
    }

    // candidate after overlap end → roll to next day
    candidate = new Date(Date.UTC(
      dayLoopDate.getUTCFullYear(),
      dayLoopDate.getUTCMonth(),
      dayLoopDate.getUTCDate(),
      settings.sendingHoursStart, 0, 0
    ));
    dayLoopDate = addDays(candidate, 1);
  }

  if (candidate < overlapStart! || candidate >= overlapEnd!) {
    throw new Error("No legal send slot found within 14 days");
  }

  // STEP: Final jitter
  const jitterMin = settings.minDelayMinutes * 60000;
  const jitterMax = settings.maxDelayMinutes * 60000;
  const jitter = Math.floor(Math.random() * (jitterMax - jitterMin + 1)) + jitterMin;

  let finalStamp = new Date(candidate.getTime() + jitter);

  // Compute admin window for final day (UTC)
  const finalAdminStart = new Date(Date.UTC(
    finalStamp.getUTCFullYear(),
    finalStamp.getUTCMonth(),
    finalStamp.getUTCDate(),
    settings.sendingHoursStart, 0, 0
  ));
  const finalAdminEnd = new Date(Date.UTC(
    finalStamp.getUTCFullYear(),
    finalStamp.getUTCMonth(),
    finalStamp.getUTCDate(),
    settings.sendingHoursEnd, 0, 0
  ));

  // Clamp if jitter pushes us outside the final day's admin window
  if (finalStamp < finalAdminStart) finalStamp = finalAdminStart;
  if (finalStamp > finalAdminEnd) finalStamp = finalAdminEnd;

  return finalStamp;
}