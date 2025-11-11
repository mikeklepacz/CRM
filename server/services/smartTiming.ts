import { parseBusinessHours } from './timezoneHours';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { addHours, addDays, isBefore, getDay, startOfDay } from 'date-fns';

export interface SmartTimingOptions {
  businessHours: string;
  state: string; // Required for timezone resolution
  skipWeekends: boolean;
}

/**
 * Compute the optimal send time for an email based on business hours and timezone
 * Rules:
 * - Send 1 hour after business opens
 * - Never send after 2pm local time
 * - Fallback to noon for "Closed" days
 * - Skip weekends if requested
 * 
 * @returns UTC Date object for optimal send time
 */
export function computeOptimalSendTime(options: SmartTimingOptions): Date {
  const { businessHours, state, skipWeekends } = options;

  // Parse business hours and get timezone
  const parsed = parseBusinessHours(businessHours, state);
  const { schedule, is24_7, isClosed, timezone } = parsed;

  const nowUtc = new Date();
  
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
