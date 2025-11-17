import { storage } from '../storage';
import { addDays, format } from 'date-fns';
import { parseBusinessHours } from './timezoneHours';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

interface MatrixSchedulerParams {
  recipientId: string;
  sequenceId: string;
  stepNumber: number;
  stepDelay: number;
  lastStepSentAt: Date | null;
  recipientTimezone: string;
  recipientBusinessHours: string;
  recipientState: string | null;
  userId: string;
}

export async function getNextMatrixSlot(
  params: MatrixSchedulerParams
): Promise<Date> {

  const {
    stepDelay,
    lastStepSentAt,
    userId,
    recipientBusinessHours,
    recipientTimezone,
    recipientState
  } = params;

  console.log("MATRIX_SCHEDULER_INPUT", {
    business_hours: recipientBusinessHours,
    timezone: recipientTimezone,
    state: recipientState,
    lastStepSentAt,
    stepDelay,
    userId
  });

  const settings = await storage.getEhubSettings();
  if (!settings) throw new Error("E-Hub settings not found");

  const {
    clientWindowStartOffset,
    clientWindowEndHour,
    sendingHoursStart,
    sendingHoursEnd,
    minDelayMinutes,
    maxDelayMinutes,
    skipWeekends,
    dailyEmailLimit
  } = settings;

  // load admin timezone
  const userPrefs = await storage.getUserPreferences(userId);
  const adminTimezone = userPrefs?.timezone || "America/New_York";

  // baseline
  let baseline = lastStepSentAt
    ? addDays(lastStepSentAt, stepDelay)
    : addDays(new Date(), stepDelay);

  if (baseline < new Date()) baseline = new Date();

  // FIFO queue tail
  const queueTail = await storage.getQueueTail();
  let globalMinimum = baseline;

  if (queueTail) {
    const tailTime = new Date(queueTail).getTime();
    const baseTime = baseline.getTime();
    globalMinimum = new Date(Math.max(tailTime, baseTime));
  }

  // rate limit spacing
  const adminWindowHours = sendingHoursEnd - sendingHoursStart;
  const spacingMs = (adminWindowHours * 3600000) / dailyEmailLimit;

  if (queueTail) {
    const spaced = new Date(new Date(queueTail).getTime() + spacingMs);
    globalMinimum = new Date(Math.max(globalMinimum.getTime(), spaced.getTime()));
  }

  // candidate
  let candidate = globalMinimum;

  // BUSINESS HOURS PARSING
  // Use recipient's state to correctly resolve timezone
  const parsed = parseBusinessHours(recipientBusinessHours, recipientState || "");

  const startingMoment = new Date();
  let overlapStart: Date = new Date();
  let overlapEnd: Date = new Date();

  // Use UTC as neutral reference - same calendar day for both timezones
  const utcBaseDate = formatInTimeZone(startingMoment, 'UTC', 'yyyy-MM-dd');

  // 14-day search loop using day offset
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    console.log("\n--- MATRIX LOOP DAY", dayOffset, "------------------------------");
    
    console.log("Admin TZ:", adminTimezone);
    console.log("Recipient TZ:", recipientTimezone);
    console.log("Recipient State:", recipientState);
    
    // Both build from same UTC base date + offset
    const targetDate = addDays(new Date(`${utcBaseDate}T12:00:00Z`), dayOffset);
    const adminDateStr = formatInTimeZone(targetDate, adminTimezone, 'yyyy-MM-dd');
    const recipientDateStr = formatInTimeZone(targetDate, recipientTimezone, 'yyyy-MM-dd');
    
    const isoAdminDay = parseInt(formatInTimeZone(new Date(`${adminDateStr}T12:00:00`), adminTimezone, 'e'), 10);
    console.log("Admin ISO Day:", isoAdminDay, "Date:", adminDateStr);
    
    const isoRecipDay = parseInt(formatInTimeZone(new Date(`${recipientDateStr}T12:00:00`), recipientTimezone, 'e'), 10);
    console.log("Recipient ISO Day:", isoRecipDay, "Date:", recipientDateStr);
    
    // Show parsed schedule for the recipient's day
    console.log("Parsed schedule:", parsed.schedule);
    
    // Convert ISO → JS weekday
    const jsRecipDay = isoRecipDay === 7 ? 0 : isoRecipDay;
    console.log("Recipient JS Day:", jsRecipDay);
    
    console.log("Today's schedule for this recipient:", parsed.schedule[jsRecipDay]);

    // weekend skip
    if (skipWeekends && (isoAdminDay === 6 || isoAdminDay === 7)) {
      candidate = new Date(`${adminDateStr}T${String(sendingHoursStart).padStart(2,'0')}:00:00`);
      continue;
    }

    // ADMIN WINDOW: Build using explicit date string
    const adminStartLocal = `${adminDateStr}T${String(sendingHoursStart).padStart(2,'0')}:00:00`;
    const adminEndLocal = `${adminDateStr}T${String(sendingHoursEnd).padStart(2,'0')}:00:00`;

    // Convert to UTC using admin's timezone (handles DST correctly)
    const adminStartUtc = fromZonedTime(adminStartLocal, adminTimezone);
    const adminEndUtc = fromZonedTime(adminEndLocal, adminTimezone);

    // RECIPIENT WINDOW
    const todaysSchedule = parsed.schedule[jsRecipDay];

    if (parsed.isClosed || !todaysSchedule || todaysSchedule.length === 0) {
      // no hours today → next day
      candidate = new Date(`${adminDateStr}T${String(sendingHoursStart).padStart(2,'0')}:00:00`);
      continue;
    }

    // Take FIRST range
    const range = todaysSchedule[0];     // {open: number, close: number}
    const openMin = range.open;          // minutes since midnight
    const closeMin = range.close;        // minutes since midnight

    // Convert to actual times in recipient TZ
    const openHour = Math.floor(openMin / 60);
    const openMinute = openMin % 60;

    // Build complete timestamp using explicit date string
    const recipientOpenString = `${recipientDateStr}T${String(openHour).padStart(2,'0')}:${String(openMinute).padStart(2,'0')}:00`;

    // Convert to UTC using recipient's timezone (handles DST correctly)
    const recipientOpenUtc = fromZonedTime(recipientOpenString, recipientTimezone);
    
    // Apply start offset (e.g., +1 hour after opening)
    const recipientLegalStartUtc = new Date(
      recipientOpenUtc.getTime() + clientWindowStartOffset * 3600000
    );

    // Build end timestamp using explicit date string
    const recipientEndString = `${recipientDateStr}T${String(clientWindowEndHour).padStart(2,'0')}:00:00`;

    // Convert to UTC using recipient's timezone (handles DST correctly)
    const recipientLegalEndUtc = fromZonedTime(recipientEndString, recipientTimezone);

    // OVERLAP
    overlapStart = new Date(
      Math.max(adminStartUtc.getTime(), recipientLegalStartUtc.getTime())
    );
    overlapEnd = new Date(
      Math.min(adminEndUtc.getTime(), recipientLegalEndUtc.getTime())
    );

    const hasOverlap = overlapStart < overlapEnd;
    const candidateInside = candidate >= overlapStart && candidate < overlapEnd;
    const candidateBefore = candidate < overlapStart;

    console.log("Admin UTC Window:", adminStartUtc.toISOString(), "→", adminEndUtc.toISOString());
    console.log("Recipient UTC Window:", recipientLegalStartUtc.toISOString(), "→", recipientLegalEndUtc.toISOString());
    console.log("Candidate (current):", candidate.toISOString());
    console.log("Overlap window:", overlapStart.toISOString(), "→", overlapEnd.toISOString());
    console.log("Has overlap?", overlapStart < overlapEnd);
    console.log("Candidate inside?", candidate >= overlapStart && candidate < overlapEnd);
    console.log("Candidate before?", candidate < overlapStart);

    if (!hasOverlap) {
      candidate = new Date(`${adminDateStr}T${String(sendingHoursStart).padStart(2,'0')}:00:00`);
      continue;
    }

    if (candidateInside) break;

    if (candidateBefore) {
      candidate = new Date(overlapStart);
      break;
    }

    // candidate after overlap
    candidate = new Date(`${adminDateStr}T${String(sendingHoursStart).padStart(2,'0')}:00:00`);
  }

  // sanity check
  if (!(candidate >= overlapStart && candidate < overlapEnd)) {
    throw new Error("No legal send slot found within 14 days");
  }

  // JITTER
  const jitterMin = minDelayMinutes * 60000;
  const jitterMax = maxDelayMinutes * 60000;
  const jitter = Math.floor(Math.random() * (jitterMax - jitterMin + 1)) + jitterMin;

  let finalStamp = new Date(candidate.getTime() + jitter);

  const finalAdminStart = new Date(Date.UTC(
    finalStamp.getUTCFullYear(),
    finalStamp.getUTCMonth(),
    finalStamp.getUTCDate(),
    sendingHoursStart,
    0,
    0
  ));
  const finalAdminEnd = new Date(Date.UTC(
    finalStamp.getUTCFullYear(),
    finalStamp.getUTCMonth(),
    finalStamp.getUTCDate(),
    sendingHoursEnd,
    0,
    0
  ));

  if (finalStamp < finalAdminStart) finalStamp = finalAdminStart;
  if (finalStamp > finalAdminEnd) finalStamp = finalAdminEnd;

  return finalStamp;
}