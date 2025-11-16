import { parseBusinessHours } from './timezoneHours';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { addHours, addDays, isBefore } from 'date-fns';

export interface DualWindowOptions {
  baselineTime: Date; 
  adminTimezone: string; 
  adminStartHour: number; 
  adminEndHour: number; 
  recipientBusinessHours: string; 
  recipientTimezone: string; 
  clientWindowStartOffset: number; 
  clientWindowEndHour: number; 
  skipWeekends: boolean; 
  minimumTime?: Date;
}

// ===========================================================
// CREATE UTC INSTANT FOR SPECIFIC LOCAL DATE/TIME IN TIMEZONE
// ===========================================================
function createTimeInZone(
  base: Date,
  daysOffset: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  const zoned = toZonedTime(base, timezone);

  const baseStr = formatInTimeZone(zoned, timezone, 'yyyy-MM-dd');
  const [y, m, d] = baseStr.split('-').map(Number);

  const target = new Date(y, m - 1, d + daysOffset);
  const monthStr = String(target.getMonth() + 1).padStart(2, '0');
  const dayStr = String(target.getDate()).padStart(2, '0');

  const localString = `${target.getFullYear()}-${monthStr}-${dayStr}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`;

  return fromZonedTime(localString, timezone);
}

// ===========================================================
// GET DAY OF WEEK IN TIMEZONE
// ===========================================================
function getDayOfWeek(dateUtc: Date, timezone: string): number {
  const iso = parseInt(formatInTimeZone(dateUtc, timezone, 'i'), 10);
  return iso === 7 ? 0 : iso;
}

// ===========================================================
// RECIPIENT WINDOW FOR SPECIFIC DAY
// ===========================================================
function getRecipientWindow(
  baseline: Date,
  daysOffset: number,
  timezone: string,
  schedule: any,
  isClosed: boolean,
  is24_7: boolean,
  clientWindowStartOffset: number,
  clientWindowEndHour: number
): { start: Date; end: Date } | null {

  if (isClosed) {
    const noon = createTimeInZone(baseline, daysOffset, 12, 0, timezone);
    const cutoff = createTimeInZone(baseline, daysOffset, clientWindowEndHour, 0, timezone);
    return { start: noon, end: cutoff };
  }

  if (is24_7) {
    const start = createTimeInZone(baseline, daysOffset, 0, 0, timezone);
    const end = createTimeInZone(baseline, daysOffset, clientWindowEndHour, 0, timezone);
    return { start, end };
  }

  const candidateDay = getDayOfWeek(addDays(baseline, daysOffset), timezone);
  const hours = schedule[candidateDay];

  if (!hours || hours.length === 0) {
    const noon = createTimeInZone(baseline, daysOffset, 12, 0, timezone);
    const cutoff = createTimeInZone(baseline, daysOffset, clientWindowEndHour, 0, timezone);
    return { start: noon, end: cutoff };
  }

  const first = hours[0];
  const openMin = first.open;
  const openHour = Math.floor(openMin / 60);
  const openMinute = openMin % 60;

  const startHour = openHour + Math.floor(clientWindowStartOffset);
  const startMinute = openMinute + Math.floor((clientWindowStartOffset % 1) * 60);

  let h = startHour;
  let m = startMinute;

  if (m >= 60) {
    h += Math.floor(m / 60);
    m = m % 60;
  }

  if (h >= clientWindowEndHour) return null;

  const start = createTimeInZone(baseline, daysOffset, h, m, timezone);
  const end = createTimeInZone(baseline, daysOffset, clientWindowEndHour, 0, timezone);

  return { start, end };
}

// ===========================================================
// MAIN: ADMIN + RECIPIENT WINDOW OVERLAP
// ===========================================================
export function computeNextSendSlot(options: DualWindowOptions): Date {
  const {
    baselineTime,
    adminTimezone,
    adminStartHour,
    adminEndHour,
    recipientBusinessHours,
    recipientTimezone,
    clientWindowStartOffset,
    clientWindowEndHour,
    skipWeekends,
    minimumTime,
  } = options;

  const effectiveBaseline =
    minimumTime && minimumTime > baselineTime ? minimumTime : baselineTime;

  const parsed = parseBusinessHours(recipientBusinessHours, '');
  const { schedule, is24_7, isClosed } = parsed;

  const tz = recipientTimezone || parsed.timezone;

  let daysOffset = 0;
  const maxDays = 14;

  while (daysOffset < maxDays) {
    const candidateUtc = addDays(effectiveBaseline, daysOffset);

    if (skipWeekends) {
      const adminDay = getDayOfWeek(startUtc, adminTimezone);

      // HARD WEEKEND BLOCK — FIXES THE BUG
      if (adminDay === 0 || adminDay === 6) {
        const jump = 1 + (adminDay === 0 ? 0 : 1); // Sunday→1, Saturday→2
        startUtc = addDays(startUtc, jump);
        startUtc.setHours(sendingHoursStart, 0, 0, 0);

        // recompute adminDay after the jump
        const newDay = getDayOfWeek(startUtc, adminTimezone);
        // if still weekend (extremely rare edge), skip normally
        if (newDay === 0 || newDay === 6) {
          daysOffset++;
          continue;
        }
      }
    }

    const adminStart = createTimeInZone(effectiveBaseline, daysOffset, adminStartHour, 0, adminTimezone);
    const adminEnd = createTimeInZone(effectiveBaseline, daysOffset, adminEndHour, 0, adminTimezone);

    const recWindow = getRecipientWindow(
      effectiveBaseline,
      daysOffset,
      tz,
      schedule,
      isClosed,
      is24_7,
      clientWindowStartOffset,
      clientWindowEndHour
    );

    if (!recWindow) {
      daysOffset++;
      continue;
    }

    const overlapStart = adminStart > recWindow.start ? adminStart : recWindow.start;
    const overlapEnd = adminEnd < recWindow.end ? adminEnd : recWindow.end;

    if (overlapStart < overlapEnd) {
      if (effectiveBaseline >= overlapStart && effectiveBaseline < overlapEnd) {
        return effectiveBaseline;
      }
      if (overlapStart > effectiveBaseline) {
        return overlapStart;
      }
    }

    daysOffset++;
  }

  return addHours(effectiveBaseline, 1);
}