import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

// ============================================================================
// State/Province to Timezone Mapping
// ============================================================================

// Map states to timezones (supports both full names and 2-letter codes)
export const STATE_TIMEZONES: Record<string, string> = {
  // Full state names
  'Alabama': 'America/Chicago', 'Alaska': 'America/Anchorage', 'Arizona': 'America/Phoenix',
  'Arkansas': 'America/Chicago', 'California': 'America/Los_Angeles', 'Colorado': 'America/Denver',
  'Connecticut': 'America/New_York', 'Delaware': 'America/New_York', 'Florida': 'America/New_York',
  'Georgia': 'America/New_York', 'Hawaii': 'Pacific/Honolulu', 'Idaho': 'America/Boise',
  'Illinois': 'America/Chicago', 'Indiana': 'America/Indianapolis', 'Iowa': 'America/Chicago',
  'Kansas': 'America/Chicago', 'Kentucky': 'America/New_York', 'Louisiana': 'America/Chicago',
  'Maine': 'America/New_York', 'Maryland': 'America/New_York', 'Massachusetts': 'America/New_York',
  'Michigan': 'America/Detroit', 'Minnesota': 'America/Chicago', 'Mississippi': 'America/Chicago',
  'Missouri': 'America/Chicago', 'Montana': 'America/Denver', 'Nebraska': 'America/Chicago',
  'Nevada': 'America/Los_Angeles', 'New Hampshire': 'America/New_York', 'New Jersey': 'America/New_York',
  'New Mexico': 'America/Denver', 'New York': 'America/New_York', 'North Carolina': 'America/New_York',
  'North Dakota': 'America/Chicago', 'Ohio': 'America/New_York', 'Oklahoma': 'America/Chicago',
  'Oregon': 'America/Los_Angeles', 'Pennsylvania': 'America/New_York', 'Rhode Island': 'America/New_York',
  'South Carolina': 'America/New_York', 'South Dakota': 'America/Chicago', 'Tennessee': 'America/Chicago',
  'Texas': 'America/Chicago', 'Utah': 'America/Denver', 'Vermont': 'America/New_York',
  'Virginia': 'America/New_York', 'Washington': 'America/Los_Angeles', 'West Virginia': 'America/New_York',
  'Wisconsin': 'America/Chicago', 'Wyoming': 'America/Denver',
  // 2-letter state codes
  'AL': 'America/Chicago', 'AK': 'America/Anchorage', 'AZ': 'America/Phoenix',
  'AR': 'America/Chicago', 'CA': 'America/Los_Angeles', 'CO': 'America/Denver',
  'CT': 'America/New_York', 'DE': 'America/New_York', 'FL': 'America/New_York',
  'GA': 'America/New_York', 'HI': 'Pacific/Honolulu', 'ID': 'America/Boise',
  'IL': 'America/Chicago', 'IN': 'America/Indianapolis', 'IA': 'America/Chicago',
  'KS': 'America/Chicago', 'KY': 'America/New_York', 'LA': 'America/Chicago',
  'ME': 'America/New_York', 'MD': 'America/New_York', 'MA': 'America/New_York',
  'MI': 'America/Detroit', 'MN': 'America/Chicago', 'MS': 'America/Chicago',
  'MO': 'America/Chicago', 'MT': 'America/Denver', 'NE': 'America/Chicago',
  'NV': 'America/Los_Angeles', 'NH': 'America/New_York', 'NJ': 'America/New_York',
  'NM': 'America/Denver', 'NY': 'America/New_York', 'NC': 'America/New_York',
  'ND': 'America/Chicago', 'OH': 'America/New_York', 'OK': 'America/Chicago',
  'OR': 'America/Los_Angeles', 'PA': 'America/New_York', 'RI': 'America/New_York',
  'SC': 'America/New_York', 'SD': 'America/Chicago', 'TN': 'America/Chicago',
  'TX': 'America/Chicago', 'UT': 'America/Denver', 'VT': 'America/New_York',
  'VA': 'America/New_York', 'WA': 'America/Los_Angeles', 'WV': 'America/New_York',
  'WI': 'America/Chicago', 'WY': 'America/Denver',
  // Canadian provinces (full names)
  'Alberta': 'America/Edmonton', 'British Columbia': 'America/Vancouver', 'Manitoba': 'America/Winnipeg',
  'New Brunswick': 'America/Moncton', 'Newfoundland and Labrador': 'America/St_Johns',
  'Northwest Territories': 'America/Yellowknife', 'Nova Scotia': 'America/Halifax',
  'Nunavut': 'America/Iqaluit', 'Ontario': 'America/Toronto', 'Prince Edward Island': 'America/Halifax',
  'Quebec': 'America/Montreal', 'Saskatchewan': 'America/Regina', 'Yukon': 'America/Whitehorse',
  // Canadian province codes
  'AB': 'America/Edmonton', 'BC': 'America/Vancouver', 'MB': 'America/Winnipeg',
  'NB': 'America/Moncton', 'NL': 'America/St_Johns', 'NT': 'America/Yellowknife',
  'NS': 'America/Halifax', 'NU': 'America/Iqaluit', 'ON': 'America/Toronto',
  'PE': 'America/Halifax', 'QC': 'America/Montreal', 'SK': 'America/Regina',
  'YT': 'America/Whitehorse',
};

// ============================================================================
// Timezone Resolution
// ============================================================================

/**
 * Resolves a state/province to its timezone
 */
export function resolveTimezone(state: string | null | undefined): string {
  if (!state) return 'America/New_York'; // Default timezone
  
  return STATE_TIMEZONES[state] || STATE_TIMEZONES[state.toUpperCase()] || 'America/New_York';
}

// ============================================================================
// Business Hours Parsing
// ============================================================================

export interface DaySchedule {
  open: number; // minutes since midnight
  close: number; // minutes since midnight
}

export interface ParsedBusinessHours {
  schedule: Record<number, DaySchedule[]>; // 0=Sunday, 1=Monday, etc.
  is24_7: boolean;
  isClosed: boolean;
  timezone: string;
}

/**
 * Parse business hours string into structured schedule
 * Returns schedule keyed by day of week (0-6) with open/close times in minutes since midnight
 */
export function parseBusinessHours(hoursStr: string, state: string): ParsedBusinessHours {
  const timezone = resolveTimezone(state);
  
  const result: ParsedBusinessHours = {
    schedule: {},
    is24_7: false,
    isClosed: false,
    timezone,
  };
  
  if (!hoursStr) {
    result.isClosed = true;
    return result;
  }
  
  const hoursLower = hoursStr.toLowerCase().trim();
  
  // Check for closed
  if (hoursLower === 'closed') {
    result.isClosed = true;
    return result;
  }
  
  // Check for 24/7
  if (hoursLower.includes('24/7') || hoursLower.includes('24 hours') || hoursLower === 'open 24 hours') {
    result.is24_7 = true;
    return result;
  }
  
  // Day name mappings
  const dayMap: Record<string, number> = {
    'sun': 0, 'sunday': 0,
    'mon': 1, 'monday': 1,
    'tue': 2, 'tuesday': 2, 'tues': 2,
    'wed': 3, 'wednesday': 3,
    'thu': 4, 'thursday': 4, 'thurs': 4,
    'fri': 5, 'friday': 5,
    'sat': 6, 'saturday': 6
  };
  
  // Helper to parse time string to minutes since midnight
  const parseTime = (timeStr: string): number | null => {
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!match) return null;
    
    let hour = parseInt(match[1]);
    const min = parseInt(match[2] || '0');
    const period = match[3]?.toLowerCase();
    
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    
    return hour * 60 + min;
  };
  
  // Parse hours string to find opening times for each day
  const segments = hoursStr.split(/[,;]/);
  let lastDayContext: number | null = null;
  
  for (const segment of segments) {
    const segmentLower = segment.trim().toLowerCase();
    let daysToApply: number[] = [];
    let hasExplicitDay = false;
    
    // Check for "Daily" or "Everyday"
    if (segmentLower.includes('daily') || segmentLower.includes('everyday') || segmentLower.includes('every day')) {
      hasExplicitDay = true;
      daysToApply = [0, 1, 2, 3, 4, 5, 6];
    }
    
    // Check for day ranges (e.g., "Mon-Fri")
    if (!hasExplicitDay) {
      const rangeMatch = segmentLower.match(/(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*[-–]\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*/);
      if (rangeMatch) {
        hasExplicitDay = true;
        const startDay = dayMap[rangeMatch[1]];
        const endDay = dayMap[rangeMatch[2]];
        if (startDay !== undefined && endDay !== undefined) {
          if (startDay <= endDay) {
            for (let d = startDay; d <= endDay; d++) daysToApply.push(d);
          } else {
            // Wrap around week (e.g., Fri-Mon)
            for (let d = startDay; d <= 6; d++) daysToApply.push(d);
            for (let d = 0; d <= endDay; d++) daysToApply.push(d);
          }
          lastDayContext = daysToApply[0];
        }
      }
    }
    
    // Check for specific days (e.g., "Monday")
    if (!hasExplicitDay) {
      for (const [dayName, dayNum] of Object.entries(dayMap)) {
        if (segmentLower.startsWith(dayName)) {
          hasExplicitDay = true;
          daysToApply = [dayNum];
          lastDayContext = dayNum;
          break;
        }
      }
    }
    
    // Carry forward day context for continuation segments
    if (!hasExplicitDay && lastDayContext !== null) {
      daysToApply = [lastDayContext];
    }
    
    // If no day and only segment, apply to all days
    if (daysToApply.length === 0 && !hasExplicitDay && segments.length === 1) {
      daysToApply = [0, 1, 2, 3, 4, 5, 6];
    }
    
    // Extract time range
    const timeMatch = segment.match(/(\d{1,2}:?\d{0,2}\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}:?\d{0,2}\s*(?:am|pm)?)/i);
    if (timeMatch) {
      const openMinutes = parseTime(timeMatch[1]);
      const closeMinutes = parseTime(timeMatch[2]);
      
      if (openMinutes !== null && closeMinutes !== null) {
        for (const day of daysToApply) {
          if (!result.schedule[day]) result.schedule[day] = [];
          result.schedule[day].push({ open: openMinutes, close: closeMinutes });
        }
      }
    }
  }
  
  return result;
}

// ============================================================================
// Smart Send Time Calculation for E-Hub
// ============================================================================

export interface SendTimeConfig {
  skipWeekends: boolean;
  sendingHoursEnd: number; // Max hour (24h format, e.g., 14 = 2pm)
}

/**
 * Calculate optimal email send time based on business hours
 * Rules:
 * - Send 1 hour after opening time
 * - Never send after sendingHoursEnd (default 14 = 2pm)
 * - If "Closed", send at noon
 * - Skip weekends if configured
 */
export function computeOptimalSendTime(
  hoursStr: string,
  state: string,
  config: SendTimeConfig
): Date {
  const parsedHours = parseBusinessHours(hoursStr, state);
  const timezone = parsedHours.timezone;
  
  // Get current time in UTC and convert to store's timezone
  const nowUtc = new Date();
  const storeTime = toZonedTime(nowUtc, timezone);
  
  // Extract date components from store's local time
  const year = parseInt(formatInTimeZone(nowUtc, timezone, 'yyyy'));
  const month = parseInt(formatInTimeZone(nowUtc, timezone, 'MM'));
  const dateNum = parseInt(formatInTimeZone(nowUtc, timezone, 'dd'));
  // Convert ISO day (1=Mon, 7=Sun) to JS day (0=Sun, 1=Mon, etc.)
  const isoDay = parseInt(formatInTimeZone(nowUtc, timezone, 'i')); // 1-7
  const currentDay = isoDay === 7 ? 0 : isoDay; // Convert: Sun(7)→0, Mon(1)→1, etc.
  const hour = parseInt(formatInTimeZone(nowUtc, timezone, 'HH'));
  const minute = parseInt(formatInTimeZone(nowUtc, timezone, 'mm'));
  const currentMinutes = hour * 60 + minute;
  
  // Helper to build scheduled time in store's timezone
  const buildScheduledTime = (y: number, m: number, d: number, minutes: number): Date => {
    const h = Math.floor(minutes / 60);
    const min = minutes % 60;
    const isoString = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
    return fromZonedTime(isoString, timezone);
  };
  
  // Helper to check if a day is a weekend
  const isWeekend = (day: number): boolean => day === 0 || day === 6; // Sunday or Saturday
  
  // Maximum send time in minutes (e.g., 14:00 = 840 minutes)
  const maxSendMinutes = config.sendingHoursEnd * 60;
  
  // If 24/7, send now
  if (parsedHours.is24_7) {
    return nowUtc;
  }
  
  // If closed or no schedule, send at noon
  if (parsedHours.isClosed || Object.keys(parsedHours.schedule).length === 0) {
    const noonMinutes = 12 * 60; // 720 minutes = noon
    
    // Find next valid day (skip weekends if configured)
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const targetDay = (currentDay + dayOffset) % 7;
      const targetDate = new Date(year, month - 1, dateNum + dayOffset);
      
      // Skip weekends if configured
      if (config.skipWeekends && isWeekend(targetDay)) continue;
      
      // If today and past noon, try tomorrow
      if (dayOffset === 0 && currentMinutes >= noonMinutes) continue;
      
      return buildScheduledTime(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        targetDate.getDate(),
        noonMinutes
      );
    }
  }
  
  // Try to find optimal send time: opening time + 60 minutes
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const targetDay = (currentDay + dayOffset) % 7;
    const targetDate = new Date(year, month - 1, dateNum + dayOffset);
    
    // Skip weekends if configured
    if (config.skipWeekends && isWeekend(targetDay)) continue;
    
    // Check if this day has a schedule
    if (parsedHours.schedule[targetDay]) {
      const daySchedule = parsedHours.schedule[targetDay][0]; // Use first time range
      const sendMinutes = daySchedule.open + 60; // 1 hour after opening
      
      // Enforce max send time (before 2pm)
      const actualSendMinutes = Math.min(sendMinutes, maxSendMinutes);
      
      // If today, check if send time has already passed
      if (dayOffset === 0 && currentMinutes >= actualSendMinutes) {
        continue; // Try next day
      }
      
      // If opening + 1 hour is after max send time, skip to next day
      if (sendMinutes > maxSendMinutes) {
        continue;
      }
      
      return buildScheduledTime(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        targetDate.getDate(),
        actualSendMinutes
      );
    }
  }
  
  // Fallback: send at noon tomorrow (respecting weekend skip)
  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const targetDay = (currentDay + dayOffset) % 7;
    const targetDate = new Date(year, month - 1, dateNum + dayOffset);
    
    if (config.skipWeekends && isWeekend(targetDay)) continue;
    
    return buildScheduledTime(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      targetDate.getDate(),
      12 * 60 // noon
    );
  }
  
  // Final fallback: now (should never reach here)
  return nowUtc;
}
