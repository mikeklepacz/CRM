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
  private ignoredHolidaysCache: Map<string, { cache: Set<string>; time: number }> = new Map();
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache
  private readonly options = {
    shiftSaturdayHolidays: true,
    shiftSundayHolidays: true
  };

  /**
   * Convert a holiday reason/name to a consistent holiday ID
   * Used for matching against ignored_holidays table
   */
  private reasonToHolidayId(reason: string): string {
    return reason
      .toLowerCase()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Get the set of ignored holiday IDs for a tenant (cached)
   * If no tenantId is provided, returns empty set (all holidays are active/blocking)
   */
  private async getIgnoredHolidayIds(tenantId?: string): Promise<Set<string>> {
    if (!tenantId) {
      return new Set();
    }
    const now = Date.now();
    const cached = this.ignoredHolidaysCache.get(tenantId);
    if (cached && (now - cached.time) < this.CACHE_TTL_MS) {
      return cached.cache;
    }
    
    const ignoredList = await storage.getIgnoredHolidays(tenantId);
    const cacheEntry = new Set(ignoredList.map(h => h.holidayId));
    this.ignoredHolidaysCache.set(tenantId, { cache: cacheEntry, time: now });
    return cacheEntry;
  }

  /**
   * Check if a holiday is ignored (toggled OFF) for a tenant
   * If no tenantId is provided, treats all holidays as active (not ignored)
   */
  private async isHolidayIgnored(reason: string, tenantId?: string): Promise<boolean> {
    const holidayId = this.reasonToHolidayId(reason);
    const ignoredIds = await this.getIgnoredHolidayIds(tenantId);
    return ignoredIds.has(holidayId);
  }

  /**
   * Clear the ignored holidays cache (call when toggles change)
   * If tenantId is provided, only clear that tenant's cache
   */
  clearIgnoredHolidaysCache(tenantId?: string): void {
    if (tenantId) {
      this.ignoredHolidaysCache.delete(tenantId);
    } else {
      this.ignoredHolidaysCache.clear();
    }
  }

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
   * Holidays can be toggled OFF (ignored) by admins, allowing outreach on those days.
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
    
    // Check custom blocked dates FIRST (highest priority - these are always enforced)
    const customBlocked = await this.getCustomBlockedDates();
    const customMatch = customBlocked.find(cb => cb.date === dateStr);
    if (customMatch) {
      return { blocked: true, reason: customMatch.reason };
    }
    
    // Check extended holiday windows (can be ignored)
    const thanksgivingCheck = this.isThanksgivingWindow(dateStr);
    if (thanksgivingCheck.blocked && thanksgivingCheck.reason) {
      if (!await this.isHolidayIgnored(thanksgivingCheck.reason)) {
        return thanksgivingCheck;
      }
    }
    
    const christmasCheck = this.isChristmasWindow(dateStr);
    if (christmasCheck.blocked && christmasCheck.reason) {
      if (!await this.isHolidayIgnored(christmasCheck.reason)) {
        return christmasCheck;
      }
    }
    
    const newYearsCheck = this.isNewYearsWindow(dateStr);
    if (newYearsCheck.blocked && newYearsCheck.reason) {
      if (!await this.isHolidayIgnored(newYearsCheck.reason)) {
        return newYearsCheck;
      }
    }
    
    // Check federal holidays (can be ignored)
    const federalCheck = this.isFederalHoliday(dateStr);
    if (federalCheck.isHoliday && federalCheck.name) {
      if (!await this.isHolidayIgnored(federalCheck.name)) {
        return { blocked: true, reason: federalCheck.name };
      }
    }
    
    return { blocked: false };
  }

  /**
   * Check if a date string (YYYY-MM-DD) is blocked
   * Convenience method for when you already have a date string
   * 
   * Priority order: Custom dates > Extended windows > Federal holidays
   * Holidays can be toggled OFF (ignored) by admins.
   */
  async isNoSendDayByString(dateStr: string): Promise<BlockedDayResult> {
    // Check custom blocked dates FIRST (highest priority - these are always enforced)
    const customBlocked = await this.getCustomBlockedDates();
    const customMatch = customBlocked.find(cb => cb.date === dateStr);
    if (customMatch) {
      return { blocked: true, reason: customMatch.reason };
    }
    
    // Check extended windows (can be ignored)
    const thanksgivingCheck = this.isThanksgivingWindow(dateStr);
    if (thanksgivingCheck.blocked && thanksgivingCheck.reason) {
      if (!await this.isHolidayIgnored(thanksgivingCheck.reason)) {
        return thanksgivingCheck;
      }
    }
    
    const christmasCheck = this.isChristmasWindow(dateStr);
    if (christmasCheck.blocked && christmasCheck.reason) {
      if (!await this.isHolidayIgnored(christmasCheck.reason)) {
        return christmasCheck;
      }
    }
    
    const newYearsCheck = this.isNewYearsWindow(dateStr);
    if (newYearsCheck.blocked && newYearsCheck.reason) {
      if (!await this.isHolidayIgnored(newYearsCheck.reason)) {
        return newYearsCheck;
      }
    }
    
    // Check federal holidays (can be ignored)
    const federalCheck = this.isFederalHoliday(dateStr);
    if (federalCheck.isHoliday && federalCheck.name) {
      if (!await this.isHolidayIgnored(federalCheck.name)) {
        return { blocked: true, reason: federalCheck.name };
      }
    }
    
    return { blocked: false };
  }

  /**
   * Get all blocked days within a date range
   * 
   * This method iterates by DATE STRING, not by Date objects, to avoid
   * any DST drift issues. Each day is checked independently.
   * Ignored holidays are excluded from results (they won't block outreach).
   * 
   * @param startDate - The start date of the range (server timezone or UTC)
   * @param days - Number of days to check
   * @param timezone - Optional IANA timezone string (not used for iteration, only for initial conversion)
   */
  async getUpcomingBlockedDays(startDate: Date, days: number, timezone?: string): Promise<BlockedDay[]> {
    const blockedDaysMap = new Map<string, BlockedDay>();
    
    // Pre-load custom dates and ignored holidays once for efficiency
    const customDates = await this.getCustomBlockedDates();
    const customDatesMap = new Map(customDates.map(d => [d.date, d.reason]));
    const ignoredIds = await this.getIgnoredHolidayIds();
    
    // Start from the given date and iterate by adding days
    let currentDate = startDate;
    
    for (let i = 0; i < days; i++) {
      const dateStr = this.dateToString(currentDate, timezone);
      
      if (!blockedDaysMap.has(dateStr)) {
        // Check in priority order: custom > extended windows > federal
        const customReason = customDatesMap.get(dateStr);
        if (customReason) {
          // Custom dates are always enforced (not subject to ignoring)
          blockedDaysMap.set(dateStr, { date: dateStr, reason: customReason });
        } else {
          // Check extended windows (can be ignored)
          let result: BlockedDayResult = { blocked: false };
          
          const thanksgivingCheck = this.isThanksgivingWindow(dateStr);
          if (thanksgivingCheck.blocked && thanksgivingCheck.reason) {
            if (!ignoredIds.has(this.reasonToHolidayId(thanksgivingCheck.reason))) {
              result = thanksgivingCheck;
            }
          }
          
          if (!result.blocked) {
            const christmasCheck = this.isChristmasWindow(dateStr);
            if (christmasCheck.blocked && christmasCheck.reason) {
              if (!ignoredIds.has(this.reasonToHolidayId(christmasCheck.reason))) {
                result = christmasCheck;
              }
            }
          }
          
          if (!result.blocked) {
            const newYearsCheck = this.isNewYearsWindow(dateStr);
            if (newYearsCheck.blocked && newYearsCheck.reason) {
              if (!ignoredIds.has(this.reasonToHolidayId(newYearsCheck.reason))) {
                result = newYearsCheck;
              }
            }
          }
          
          if (!result.blocked) {
            const fedCheck = this.isFederalHoliday(dateStr);
            if (fedCheck.isHoliday && fedCheck.name) {
              if (!ignoredIds.has(this.reasonToHolidayId(fedCheck.name))) {
                result = { blocked: true, reason: fedCheck.name };
              }
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
   * Get all holidays (including ignored ones) with their status for a tenant
   * Used for the admin UI to display toggles
   */
  async getAllHolidaysWithStatus(tenantId: string): Promise<{ holidayId: string; name: string; isIgnored: boolean }[]> {
    const ignoredIds = await this.getIgnoredHolidayIds(tenantId);
    
    // Define all holidays that can be toggled
    const allHolidays = [
      // Federal holidays
      { holidayId: 'new_years_day', name: "New Year's Day" },
      { holidayId: 'birthday_of_martin_luther_king_jr', name: 'Birthday of Martin Luther King, Jr.' },
      { holidayId: 'washingtons_birthday', name: "Washington's Birthday" },
      { holidayId: 'memorial_day', name: 'Memorial Day' },
      { holidayId: 'juneteenth_national_independence_day', name: 'Juneteenth National Independence Day' },
      { holidayId: 'independence_day', name: 'Independence Day' },
      { holidayId: 'labor_day', name: 'Labor Day' },
      { holidayId: 'columbus_day', name: 'Columbus Day' },
      { holidayId: 'veterans_day', name: 'Veterans Day' },
      { holidayId: 'thanksgiving_day', name: 'Thanksgiving Day' },
      { holidayId: 'christmas_day', name: 'Christmas Day' },
      // Extended windows
      { holidayId: 'thanksgiving_eve', name: 'Thanksgiving Eve' },
      { holidayId: 'black_friday', name: 'Black Friday' },
      { holidayId: 'thanksgiving_weekend_saturday', name: 'Thanksgiving Weekend (Saturday)' },
      { holidayId: 'thanksgiving_weekend_sunday', name: 'Thanksgiving Weekend (Sunday)' },
      { holidayId: 'cyber_monday', name: 'Cyber Monday' },
      { holidayId: 'christmas_eve_eve', name: 'Christmas Eve Eve (Dec 23)' },
      { holidayId: 'christmas_eve', name: 'Christmas Eve' },
      { holidayId: 'day_after_christmas', name: 'Day After Christmas' },
      { holidayId: 'new_years_eve', name: "New Year's Eve" },
      { holidayId: 'day_after_new_years', name: "Day After New Year's" },
    ];
    
    return allHolidays.map(h => ({
      ...h,
      isIgnored: ignoredIds.has(h.holidayId)
    }));
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
export const getAllHolidaysWithStatus = (tenantId: string) => holidayCalendarService.getAllHolidaysWithStatus(tenantId);
export const clearIgnoredHolidaysCache = (tenantId?: string) => holidayCalendarService.clearIgnoredHolidaysCache(tenantId);
