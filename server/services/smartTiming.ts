import { parseBusinessHours } from './timezoneHours';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { addHours, addDays, isBefore, getDay, startOfDay } from 'date-fns';

export interface SmartTimingOptions {
  businessHours: string;
  state: string; // Required for timezone resolution
  skipWeekends: boolean;
  baselineTime?: Date; // Optional baseline time (defaults to now)
}

/**
 * Compute the optimal send time for an email based on business hours and timezone
 * Rules:
 * - Send 1 hour after business opens
 * - Never send after 2pm local time
 * - Fallback to noon for "Closed" days
 * - Skip weekends if requested
 * 
 * @param options.baselineTime - Optional baseline time to start from (defaults to now)
 * @returns UTC Date object for optimal send time (next valid send window after baseline)
 */
export function computeOptimalSendTime(options: SmartTimingOptions): Date {
  const { businessHours, state, skipWeekends, baselineTime } = options;

  // Parse business hours and get timezone
  const parsed = parseBusinessHours(businessHours, state);
  const { schedule, is24_7, isClosed, timezone } = parsed;

  const nowUtc = baselineTime || new Date();

  // Helper to get day-of-week in recipient's timezone (0=Sunday, 6=Saturday)
  const getDayOfWeek = (utcDate: Date): number => {
    const dayStr = formatInTimeZone(utcDate, timezone, 'i'); // ISO day: 1=Mon, 7=Sun
    const isoDay = parseInt(dayStr, 10);
    return isoDay === 7 ? 0 : isoDay; // Convert to JS format: 0=Sun, 6=Sat
  };

  // Helper to create a UTC Date for a specific date/time in recipient's timezone
  const createSendTime = (utcDate: Date, daysOffset: number, hour: number, minute: number): Date => {
    // Get the date in recipient's timezone
    const localDateStr = formatInTimeZone(addDays(utcDate, daysOffset), timezone, 'yyyy-MM-dd');
    // Build ISO string for the specific time
    const isoStr = `${localDateStr}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    // Parse as if it's in the recipient's timezone and convert to UTC
    const [datePart, timePart] = isoStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [h, m] = timePart.split(':').map(Number);
    return fromZonedTime(new Date(year, month - 1, day, h, m, 0), timezone);
  };

  let daysOffset = 0;
  const maxAttempts = 14;

  while (daysOffset < maxAttempts) {
    const candidateUtc = addDays(nowUtc, daysOffset);
    const dayOfWeek = getDayOfWeek(candidateUtc);

    // Skip weekends if requested
    if (skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      daysOffset++;
      continue;
    }

    let sendTimeUtc: Date;

    // Handle special cases
    if (isClosed) {
      // Entire business is closed, use noon
      sendTimeUtc = createSendTime(nowUtc, daysOffset, 12, 0);
    } else if (is24_7) {
      // 24/7 business - try 1 hour from now if before 2pm, else noon
      const oneHourFromNow = addHours(nowUtc, 1);
      const oneHourLocalHour = parseInt(formatInTimeZone(oneHourFromNow, timezone, 'H'), 10);
      const oneHourLocalDate = formatInTimeZone(oneHourFromNow, timezone, 'yyyy-MM-dd');
      const candidateLocalDate = formatInTimeZone(candidateUtc, timezone, 'yyyy-MM-dd');

      // Only use "1 hour from now" if it's on the current candidate day and before 2pm
      if (oneHourLocalDate === candidateLocalDate && oneHourLocalHour < 14) {
        return oneHourFromNow;
      }

      // Otherwise use noon on this candidate day
      sendTimeUtc = createSendTime(nowUtc, daysOffset, 12, 0);
    } else {
      // Check if this specific day has a schedule
      const daySchedules = schedule[dayOfWeek];

      if (!daySchedules || daySchedules.length === 0) {
        // Day is closed, use noon
        sendTimeUtc = createSendTime(nowUtc, daysOffset, 12, 0);
      } else {
        // Day has opening hours - use first schedule
        const firstSchedule = daySchedules[0];

        // Convert opening minutes to hours and minutes
        const openMinutes = firstSchedule.open;
        const openHour = Math.floor(openMinutes / 60);
        const openMinute = openMinutes % 60;

        // Calculate send time: opening + 1 hour
        let sendHour = openHour + 1;
        let sendMinute = openMinute;

        // Enforce 2pm rule
        if (sendHour >= 14) {
          sendHour = 12;
          sendMinute = 0;
        }

        sendTimeUtc = createSendTime(nowUtc, daysOffset, sendHour, sendMinute);
      }
    }

    // Check if this send time is in the future
    if (isBefore(sendTimeUtc, nowUtc)) {
      daysOffset++;
      continue;
    }

    // Valid send time found
    return sendTimeUtc;
  }

  // Fallback: 1 hour from now
  return addHours(nowUtc, 1);
}

/**
 * Format a UTC date in the recipient's local timezone for display
 */
export function formatSendTimeLocal(utcDate: Date, timezone: string): string {
  return formatInTimeZone(utcDate, timezone, 'MMM d, yyyy h:mm a zzz');
}

export interface DualWindowOptions {
  baselineTime: Date; // Starting point (usually now or now + delay)
  adminTimezone: string; // Admin's timezone from user_preferences
  adminStartHour: number; // Admin's sending window start (e.g., 6 for 6am)
  adminEndHour: number; // Admin's sending window end (e.g., 23 for 11pm)
  recipientBusinessHours: string; // Recipient's business hours string
  recipientTimezone: string; // Recipient's timezone (e.g., 'America/Detroit')
  clientWindowStartOffset: number; // Hours after business opens to start sending (e.g., 1.0 = 1 hour after opening)
  clientWindowEndHour: number; // Client local cutoff hour (e.g., 14 = 2 PM local time)
  skipWeekends: boolean; // Whether to skip weekends
  minimumTime?: Date; // Optional minimum time - never schedule before this (for queue ordering)
}

/**
 * Compute next send time where BOTH admin and recipient windows overlap
 * 
 * Rules:
 * - Admin window: adminStartHour to adminEndHour in admin's timezone
 * - Recipient window: (opening + 1hr) to 2pm in recipient's timezone
 * - Returns earliest UTC time where both windows overlap
 * - If baseline is already inside overlap, returns baseline (immediate send)
 * 
 * @returns UTC Date object for next valid send time
 */
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
    minimumTime 
  } = options;

  // Use minimumTime as effective baseline if provided and greater than baselineTime
  const effectiveBaseline = minimumTime && minimumTime > baselineTime ? minimumTime : baselineTime;

  // Parse recipient business hours (pass empty string for state since we already have timezone)
  const parsed = parseBusinessHours(recipientBusinessHours, '');
  // Override timezone with the one we already have
  const { schedule, is24_7, isClosed } = parsed;
  const timezone = recipientTimezone || parsed.timezone;

  // Helper: Create UTC time for specific hour/minute in a timezone
  const createTimeInZone = (date: Date, daysOffset: number, hour: number, minute: number, timezone: string): Date => {
    const localDateStr = formatInTimeZone(addDays(date, daysOffset), timezone, 'yyyy-MM-dd');
    const isoStr = `${localDateStr}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    const [datePart, timePart] = isoStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [h, m] = timePart.split(':').map(Number);
    return fromZonedTime(new Date(year, month - 1, day, h, m, 0), timezone);
  };

  // Helper: Get day of week in a specific timezone
  const getDayOfWeek = (utcDate: Date, timezone: string): number => {
    const dayStr = formatInTimeZone(utcDate, timezone, 'i');
    const isoDay = parseInt(dayStr, 10);
    return isoDay === 7 ? 0 : isoDay;
  };

  // Helper: Get recipient window for a specific day [earliestSend, latestSend]
  const getRecipientWindow = (daysOffset: number): { start: Date; end: Date } | null => {
    const candidateUtc = addDays(effectiveBaseline, daysOffset);
    const dayOfWeek = getDayOfWeek(candidateUtc, timezone);

    // Closed business
    if (isClosed) {
      console.log(`[SmartTiming] Business is closed - using noon fallback`);
      const noon = createTimeInZone(effectiveBaseline, daysOffset, 12, 0, timezone);
      return { start: noon, end: createTimeInZone(effectiveBaseline, daysOffset, clientWindowEndHour, 0, timezone) };
    }

    // 24/7 business
    if (is24_7) {
      console.log(`[SmartTiming] 24/7 business - using midnight start`);
      const start = createTimeInZone(effectiveBaseline, daysOffset, 0, 0, timezone);
      const end = createTimeInZone(effectiveBaseline, daysOffset, clientWindowEndHour, 0, timezone);
      return { start, end };
    }

    // Scheduled hours
    const daySchedules = schedule[dayOfWeek];

    if (!daySchedules || daySchedules.length === 0) {
      // Day is closed, use noon
      console.log(`[SmartTiming] No schedule for day ${dayOfWeek} - using noon fallback`);
      const noon = createTimeInZone(effectiveBaseline, daysOffset, 12, 0, timezone);
      return { start: noon, end: createTimeInZone(effectiveBaseline, daysOffset, clientWindowEndHour, 0, timezone) };
    }

    const firstSchedule = daySchedules[0];
    const openMinutes = firstSchedule.open;
    const openHour = Math.floor(openMinutes / 60);
    const openMinute = openMinutes % 60;

    // Calculate send time based on configurable offset
    const offsetHours = Math.floor(clientWindowStartOffset);
    const offsetMinutes = Math.round((clientWindowStartOffset % 1) * 60);
    let sendHour = openHour + offsetHours;
    let sendMinute = openMinute + offsetMinutes;

    // Handle minute overflow
    if (sendMinute >= 60) {
      sendHour += Math.floor(sendMinute / 60);
      sendMinute = sendMinute % 60;
    }

    // Clamp to cutoff hour if offset pushes past it
    if (sendHour >= clientWindowEndHour) {
      sendHour = 12;
      sendMinute = 0;
    }

    const start = createTimeInZone(effectiveBaseline, daysOffset, sendHour, sendMinute, timezone);
    const end = createTimeInZone(effectiveBaseline, daysOffset, clientWindowEndHour, 0, timezone);
    return { start, end };
  };

  // Try up to 14 days
  let daysOffset = 0;
  const maxAttempts = 14;

  while (daysOffset < maxAttempts) {
    const candidateUtc = addDays(effectiveBaseline, daysOffset);

    // Check if we should skip weekends (in admin timezone)
    if (skipWeekends) {
      const adminDayOfWeek = getDayOfWeek(candidateUtc, adminTimezone);
      if (adminDayOfWeek === 0 || adminDayOfWeek === 6) {
        daysOffset++;
        continue;
      }
    }

    // Get admin window for this day
    const adminWindowStart = createTimeInZone(effectiveBaseline, daysOffset, adminStartHour, 0, adminTimezone);
    const adminWindowEnd = createTimeInZone(effectiveBaseline, daysOffset, adminEndHour, 0, adminTimezone);

    // Get recipient window for this day
    const recipientWindow = getRecipientWindow(daysOffset);
    if (!recipientWindow) {
      daysOffset++;
      continue;
    }

    // Find overlap: [max(start1, start2), min(end1, end2)]
    const overlapStart = adminWindowStart > recipientWindow.start ? adminWindowStart : recipientWindow.start;
    const overlapEnd = adminWindowEnd < recipientWindow.end ? adminWindowEnd : recipientWindow.end;

    // Check if there's a valid overlap
    if (overlapStart < overlapEnd) {
      // Overlap exists! Check if effectiveBaseline is already inside it
      if (effectiveBaseline >= overlapStart && effectiveBaseline < overlapEnd) {
        // Immediate send - we're currently in the overlap window
        return effectiveBaseline;
      }

      // Overlap is in the future
      if (overlapStart > effectiveBaseline) {
        return overlapStart;
      }
    }

    // No overlap today, try next day
    daysOffset++;
  }

  // Fallback: 1 hour from effective baseline
  return addHours(effectiveBaseline, 1);
}