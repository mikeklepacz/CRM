// server/services/matrixScheduler.ts

import { storage } from '../storage';
import { parseBusinessHours } from './timezoneHours';
import { addDays, setHours, setMinutes, setSeconds } from 'date-fns';
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

export async function getNextMatrixSlot(params: MatrixSchedulerParams): Promise<Date> {
  const {
    stepDelay,
    lastStepSentAt,
    recipientTimezone,
    recipientBusinessHours,
    userId,
  } = params;

  // Load settings
  const settings = await storage.getAdminSettings(userId);
  const {
    sendingHoursStart,
    sendingHoursEnd,
    dailyEmailLimit,
    clientWindowStartOffset,
    clientWindowEndHour,
    skipWeekends,
    minDelayMinutes,
    maxDelayMinutes
  } = settings;

  // Admin timezone
  const adminTz = settings.adminTimezone || 'America/New_York';

  // 1. Baseline
  let baseline = lastStepSentAt
    ? addDays(lastStepSentAt, stepDelay)
    : addDays(new Date(), stepDelay);

  if (baseline < new Date()) baseline = new Date();

  // 2. Global queue tail
  const tail = await storage.getGlobalQueueTail(); 
  let globalMin = baseline;
  if (tail) globalMin = new Date(Math.max(globalMin.getTime(), tail.getTime()));

  // 3. Rate-limit spacing
  const adminWindowHours = sendingHoursEnd - sendingHoursStart;
  const spacingMs = (adminWindowHours * 3600000) / dailyEmailLimit;

  if (tail) {
    const spaced = new Date(tail.getTime() + spacingMs);
    if (spaced > globalMin) globalMin = spaced;
  }

  // 4. Recipient business hours parsed
  const parsed = parseBusinessHours(recipientBusinessHours);

  // 5. Begin day-loop
  let candidate = globalMin;
  for (let i = 0; i < 14; i++) {
    const d = candidate;

    // Admin window
    const adminStartUtc = new Date(
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        sendingHoursStart, 0, 0
      )
    );
    const adminEndUtc = new Date(
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        sendingHoursEnd, 0, 0
      )
    );

    // Weekend skip
    const adminDay = parseInt(formatInTimeZone(d, adminTz, 'e'), 10); 
    if (skipWeekends && (adminDay === 6 || adminDay === 7)) {
      candidate = addDays(
        new Date(
          Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            sendingHoursStart, 0, 0
          )
        ),
        1
      );
      continue;
    }

    // Recipient window for this day
    const localDay = parseInt(formatInTimeZone(d, recipientTimezone, 'e'), 10);
    const daySchedule = parsed.schedule[localDay];

    if (!parsed.is24_7) {
      if (!daySchedule || daySchedule.isClosed) {
        candidate = addDays(
          new Date(
            Date.UTC(
              d.getUTCFullYear(),
              d.getUTCMonth(),
              d.getUTCDate(),
              sendingHoursStart, 0, 0
            )
          ),
          1
        );
        continue;
      }
    }

    // Recipient opening local
    let recipientOpen = new Date(
      formatInTimeZone(
        d,
        recipientTimezone,
        `yyyy-MM-dd'T'${daySchedule ? daySchedule.open : "00:00"}`
      )
    );

    // Legal start
    recipientOpen = setHours(recipientOpen, recipientOpen.getHours() + clientWindowStartOffset);

    // Legal end
    let recipientEnd = new Date(
      formatInTimeZone(
        d,
        recipientTimezone,
        `yyyy-MM-ddT${clientWindowEndHour.toString().padStart(2, '0')}:00`
      )
    );

    // Convert both to UTC dates
    const legalStartUtc = new Date(recipientOpen);
    const legalEndUtc = new Date(recipientEnd);

    // Overlap
    const overlapStart = new Date(Math.max(adminStartUtc.getTime(), legalStartUtc.getTime()));
    const overlapEnd = new Date(Math.min(adminEndUtc.getTime(), legalEndUtc.getTime()));

    // No overlap
    if (overlapStart >= overlapEnd) {
      candidate = addDays(
        new Date(
          Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            sendingHoursStart, 0, 0
          )
        ),
        1
      );
      continue;
    }

    // Candidate inside valid window?
    if (candidate >= overlapStart && candidate < overlapEnd) {
      candidate = new Date(candidate);
      break;
    }

    // Candidate before window start
    if (candidate < overlapStart) {
      candidate = new Date(overlapStart);
      break;
    }

    // Else next day
    candidate = addDays(
      new Date(
        Date.UTC(
          d.getUTCFullYear(),
          d.getUTCMonth(),
          d.getUTCDate(),
          sendingHoursStart, 0, 0
        )
      ),
      1
    );
  }

  // 6. Jitter FINAL
  const jitterMs =
    Math.floor(
      Math.random() * ((maxDelayMinutes - minDelayMinutes) * 60000)
    ) +
    minDelayMinutes * 60000;

  let finalStamp = new Date(candidate.getTime() + jitterMs);

  // Final cap: must not exceed overlapEnd
  const finalDayAdminStart = new Date(
    Date.UTC(
      finalStamp.getUTCFullYear(),
      finalStamp.getUTCMonth(),
      finalStamp.getUTCDate(),
      sendingHoursStart, 0, 0
    )
  );

  const finalDayAdminEnd = new Date(
    Date.UTC(
      finalStamp.getUTCFullYear(),
      finalStamp.getUTCMonth(),
      finalStamp.getUTCDate(),
      sendingHoursEnd, 0, 0
    )
  );

  if (finalStamp > finalDayAdminEnd) finalStamp = finalDayAdminEnd;

  return finalStamp;
}