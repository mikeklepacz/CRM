/**
 * Holiday Calendar Service
 * 
 * Determines if a given date should be blocked for outreach (emails and calls).
 * Uses @18f/us-federal-holidays for federal holiday detection plus custom
 * extended blackout windows around major holidays.
 * 
 * ARCHITECTURE:
 * - All holiday checks operate on DATE STRINGS (YYYY-MM-DD) to avoid timezone issues
 * - When a timezone is provided, we extract the local date string from the Date object
 * - Caches holiday data per year for efficiency
 * 
 * BLOCKED PERIODS:
 * - All 11 US federal holidays (with weekend shifting)
 * - Thanksgiving extended: Wednesday before through Sunday after
 * - Christmas extended: Dec 23-26
 * - New Year's extended: Dec 31 - Jan 2
 * - Black Friday: Day after Thanksgiving
 * - Cyber Monday: Monday after Thanksgiving
 */

import * as fedHolidays from '@18f/us-federal-holidays';
import { 
  format, 
  addDays, 
  parseISO,
  getYear,
  getMonth,
  getDate
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { storage } from '../storage';

interface BlockedDayResult {
  blocked: boolean;
  reason?: string;
}

interface BlockedDay {
  date: string;
  reason: string;
}

interface HolidayCache {
  [year: number]: Map<string, string>; // date string (YYYY-MM-DD) -> holiday name
}

class HolidayCalendarService {
  private holidayCache: HolidayCache = {};
  private readonly options = {
    shiftSaturdayHolidays: true,
    shiftSundayHolidays: true
  };

  /**
   * Get all federal holidays for a given year (cached)
   * Returns date strings in YYYY-MM-DD format for comparison
   */
  private getHolidaysForYear(year: number): Map<string, string> {
    if (!this.holidayCache[year]) {
      const holidays = fedHolidays.allForYear(year, this.options);
      const holidayMap = new Map<string, string>();
      for (const h of holidays) {
        const dateStr = format(new Date(h.date), 'yyyy-MM-dd');
        holidayMap.set(dateStr, h.name);
      }
      this.holidayCache[year] = holidayMap;
    }
    return this.holidayCache[year];
  }

  /**
   * Find Thanksgiving date string for a given year (YYYY-MM-DD)
   * Thanksgiving is the 4th Thursday of November
   */
  private getThanksgivingDateStr(year: number): string | null {
    const holidayMap = this.getHolidaysForYear(year);
    for (const [dateStr, name] of holidayMap.entries()) {
      if (name === 'Thanksgiving Day') {
        return dateStr;
      }
    }
    return null;
  }

  /**
   * Check if a date string is a federal holiday
   */
  private isFederalHoliday(dateStr: string): { isHoliday: boolean; name?: string } {
    const year = parseInt(dateStr.slice(0, 4), 10);
    const holidayMap = this.getHolidaysForYear(year);
    const name = holidayMap.get(dateStr);
    return name ? { isHoliday: true, name } : { isHoliday: false };
  }

  /**
   * Check if date string falls in Thanksgiving extended window
   * Block: Wednesday before through Cyber Monday
   */
  private isThanksgivingWindow(dateStr: string): { blocked: boolean; reason?: string } {
    const year = parseInt(dateStr.slice(0, 4), 10);
    const thanksgivingStr = this.getThanksgivingDateStr(year);
    
    if (!thanksgivingStr) {
      return { blocked: false };
    }
    
    const thanksgivingDate = parseISO(thanksgivingStr);
    const currentDate = parseISO(dateStr);
    
    // Calculate all the blocked dates around Thanksgiving
    const wednesdayBefore = format(addDays(thanksgivingDate, -1), 'yyyy-MM-dd');
    const blackFriday = format(addDays(thanksgivingDate, 1), 'yyyy-MM-dd');
    const saturday = format(addDays(thanksgivingDate, 2), 'yyyy-MM-dd');
    const sunday = format(addDays(thanksgivingDate, 3), 'yyyy-MM-dd');
    const cyberMonday = format(addDays(thanksgivingDate, 4), 'yyyy-MM-dd');
    
    if (dateStr === thanksgivingStr) {
      return { blocked: true, reason: 'Thanksgiving Day' };
    }
    if (dateStr === wednesdayBefore) {
      return { blocked: true, reason: 'Thanksgiving Eve' };
    }
    if (dateStr === blackFriday) {
      return { blocked: true, reason: 'Black Friday' };
    }
    if (dateStr === saturday || dateStr === sunday) {
      return { blocked: true, reason: 'Thanksgiving Weekend' };
    }
    if (dateStr === cyberMonday) {
      return { blocked: true, reason: 'Cyber Monday' };
    }
    
    return { blocked: false };
  }

  /**
   * Check if date string is in Christmas extended window (Dec 23-26)
   */
  private isChristmasWindow(dateStr: string): { blocked: boolean; reason?: string } {
    const monthDay = dateStr.slice(5); // MM-DD
    
    if (monthDay === '12-23') {
      return { blocked: true, reason: 'Christmas Eve Eve' };
    }
    if (monthDay === '12-24') {
      return { blocked: true, reason: 'Christmas Eve' };
    }
    if (monthDay === '12-25') {
      return { blocked: true, reason: 'Christmas Day' };
    }
    if (monthDay === '12-26') {
      return { blocked: true, reason: 'Day After Christmas' };
    }
    
    return { blocked: false };
  }

  /**
   * Check if date string is in New Year's extended window (Dec 31 - Jan 2)
   */
  private isNewYearsWindow(dateStr: string): { blocked: boolean; reason?: string } {
    const monthDay = dateStr.slice(5); // MM-DD
    
    if (monthDay === '12-31') {
      return { blocked: true, reason: "New Year's Eve" };
    }
    if (monthDay === '01-01') {
      return { blocked: true, reason: "New Year's Day" };
    }
    if (monthDay === '01-02') {
      return { blocked: true, reason: "Day After New Year's" };
    }
    
    return { blocked: false };
  }

  /**
   * Convert a Date object to a date string (YYYY-MM-DD) in the specified timezone
   * If no timezone is provided, uses server local time
   */
  private dateToString(date: Date, timezone?: string): string {
    if (timezone) {
      return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
    }
    return format(date, 'yyyy-MM-dd');
  }

  /**
   * Main function: Check if a date should be blocked for outreach
   * 
   * Priority order: Custom dates > Extended windows > Federal holidays
   * Custom dates always take precedence so admins can override holiday reasons.
   * 
   * @param date - The UTC instant to check
   * @param timezone - Optional IANA timezone string. When provided, the date is converted
   *                   to this timezone to determine the LOCAL calendar date for holiday checks.
   *                   This is critical when checking if a recipient's local date is a holiday.
   * 
   * Example: A slot at 2025-11-28T05:00:00Z (midnight EST) would be:
   * - Nov 28 in America/New_York (Thanksgiving Day - blocked)
   * - Nov 27 in America/Los_Angeles (not blocked yet)
   */
  async isNoSendDay(date: Date, timezone?: string): Promise<BlockedDayResult> {
    const dateStr = this.dateToString(date, timezone);
    
    // Check custom blocked dates FIRST (highest priority - allows admin overrides)
    const customBlocked = await this.getCustomBlockedDates();
    const customMatch = customBlocked.find(cb => cb.date === dateStr);
    if (customMatch) {
      return { blocked: true, reason: customMatch.reason };
    }
    
    // Check extended holiday windows
    const thanksgivingCheck = this.isThanksgivingWindow(dateStr);
    if (thanksgivingCheck.blocked) {
      return thanksgivingCheck;
    }
    
    const christmasCheck = this.isChristmasWindow(dateStr);
    if (christmasCheck.blocked) {
      return christmasCheck;
    }
    
    const newYearsCheck = this.isNewYearsWindow(dateStr);
    if (newYearsCheck.blocked) {
      return newYearsCheck;
    }
    
    // Check federal holidays (lowest priority for built-in holidays)
    const federalCheck = this.isFederalHoliday(dateStr);
    if (federalCheck.isHoliday) {
      return { blocked: true, reason: federalCheck.name };
    }
    
    return { blocked: false };
  }

  /**
   * Check if a date string (YYYY-MM-DD) is blocked
   * Convenience method for when you already have a date string
   * 
   * Priority order: Custom dates > Extended windows > Federal holidays
   */
  async isNoSendDayByString(dateStr: string): Promise<BlockedDayResult> {
    // Check custom blocked dates FIRST (highest priority - allows admin overrides)
    const customBlocked = await this.getCustomBlockedDates();
    const customMatch = customBlocked.find(cb => cb.date === dateStr);
    if (customMatch) {
      return { blocked: true, reason: customMatch.reason };
    }
    
    // Check extended windows
    const thanksgivingCheck = this.isThanksgivingWindow(dateStr);
    if (thanksgivingCheck.blocked) {
      return thanksgivingCheck;
    }
    
    const christmasCheck = this.isChristmasWindow(dateStr);
    if (christmasCheck.blocked) {
      return christmasCheck;
    }
    
    const newYearsCheck = this.isNewYearsWindow(dateStr);
    if (newYearsCheck.blocked) {
      return newYearsCheck;
    }
    
    // Check federal holidays
    const federalCheck = this.isFederalHoliday(dateStr);
    if (federalCheck.isHoliday) {
      return { blocked: true, reason: federalCheck.name };
    }
    
    return { blocked: false };
  }

  /**
   * Get all blocked days within a date range
   * 
   * This method iterates by DATE STRING, not by Date objects, to avoid
   * any DST drift issues. Each day is checked independently.
   * 
   * @param startDate - The start date of the range (server timezone or UTC)
   * @param days - Number of days to check
   * @param timezone - Optional IANA timezone string (not used for iteration, only for initial conversion)
   */
  async getUpcomingBlockedDays(startDate: Date, days: number, timezone?: string): Promise<BlockedDay[]> {
    const blockedDaysMap = new Map<string, BlockedDay>();
    
    // Pre-load custom dates once for efficiency
    const customDates = await this.getCustomBlockedDates();
    const customDatesSet = new Set(customDates.map(d => d.date));
    const customDatesMap = new Map(customDates.map(d => [d.date, d.reason]));
    
    // Start from the given date and iterate by adding days
    let currentDate = startDate;
    
    for (let i = 0; i < days; i++) {
      const dateStr = this.dateToString(currentDate, timezone);
      
      if (!blockedDaysMap.has(dateStr)) {
        // Check in priority order: custom > extended windows > federal
        const customReason = customDatesMap.get(dateStr);
        if (customReason) {
          blockedDaysMap.set(dateStr, { date: dateStr, reason: customReason });
        } else {
          // Check extended windows
          let result = this.isThanksgivingWindow(dateStr);
          if (!result.blocked) result = this.isChristmasWindow(dateStr);
          if (!result.blocked) result = this.isNewYearsWindow(dateStr);
          if (!result.blocked) {
            const fedCheck = this.isFederalHoliday(dateStr);
            if (fedCheck.isHoliday) {
              result = { blocked: true, reason: fedCheck.name };
            }
          }
          
          if (result.blocked && result.reason) {
            blockedDaysMap.set(dateStr, { date: dateStr, reason: result.reason });
          }
        }
      }
      
      currentDate = addDays(currentDate, 1);
    }
    
    return Array.from(blockedDaysMap.values());
  }

  /**
   * Get custom blocked dates from database
   * Cached per call - callers should batch operations when possible
   */
  async getCustomBlockedDates(): Promise<BlockedDay[]> {
    const customDates = await storage.getNoSendDates();
    return customDates.map(d => ({
      date: d.date,
      reason: d.reason
    }));
  }

  /**
   * Clear the holiday cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.holidayCache = {};
  }
}

export const holidayCalendarService = new HolidayCalendarService();

export const isNoSendDay = (date: Date, timezone?: string) => holidayCalendarService.isNoSendDay(date, timezone);
export const getUpcomingBlockedDays = (startDate: Date, days: number, timezone?: string) => 
  holidayCalendarService.getUpcomingBlockedDays(startDate, days, timezone);
export const getCustomBlockedDates = () => holidayCalendarService.getCustomBlockedDates();
