import { addDays } from 'date-fns';
import { storage } from '../storage';
import { HOLIDAY_TOGGLES } from './holidayCalendar/constants';
import {
  dateToString,
  getHolidaysForYear,
  getThanksgivingDateStr,
  isChristmasWindow,
  isFederalHoliday,
  isNewYearsWindow,
  isThanksgivingWindow,
  reasonToHolidayId,
  resolveBlockedForDate,
} from './holidayCalendar/helpers';
import type { BlockedDay, BlockedDayResult, HolidayCache } from './holidayCalendar/types';

class HolidayCalendarService {
  private holidayCache: HolidayCache = {};
  private ignoredHolidaysCache: Map<string, { cache: Set<string>; time: number }> = new Map();
  private readonly CACHE_TTL_MS = 60000;
  private readonly options = {
    shiftSaturdayHolidays: true,
    shiftSundayHolidays: true
  };

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

  private async isHolidayIgnored(reason: string, tenantId?: string): Promise<boolean> {
    const holidayId = reasonToHolidayId(reason);
    const ignoredIds = await this.getIgnoredHolidayIds(tenantId);
    return ignoredIds.has(holidayId);
  }

  clearIgnoredHolidaysCache(tenantId?: string): void {
    if (tenantId) {
      this.ignoredHolidaysCache.delete(tenantId);
    } else {
      this.ignoredHolidaysCache.clear();
    }
  }

  private getHolidaysForYear(year: number): Map<string, string> {
    return getHolidaysForYear(year, this.holidayCache, this.options);
  }

  private getThanksgivingDateStr(year: number): string | null {
    return getThanksgivingDateStr(year, (y) => this.getHolidaysForYear(y));
  }

  private isFederalHoliday(dateStr: string): { isHoliday: boolean; name?: string } {
    return isFederalHoliday(dateStr, (y) => this.getHolidaysForYear(y));
  }

  private isThanksgivingWindow(dateStr: string): { blocked: boolean; reason?: string } {
    return isThanksgivingWindow(dateStr, (y) => this.getThanksgivingDateStr(y));
  }

  private isChristmasWindow(dateStr: string): { blocked: boolean; reason?: string } {
    return isChristmasWindow(dateStr);
  }

  private isNewYearsWindow(dateStr: string): { blocked: boolean; reason?: string } {
    return isNewYearsWindow(dateStr);
  }

  private dateToString(date: Date, timezone?: string): string {
    return dateToString(date, timezone);
  }

  async isNoSendDay(date: Date, timezone?: string, tenantId?: string): Promise<BlockedDayResult> {
    const dateStr = this.dateToString(date, timezone);
    const customBlocked = await this.getCustomBlockedDates();
    const customMatch = customBlocked.find(cb => cb.date === dateStr);

    return resolveBlockedForDate({
      dateStr,
      customReason: customMatch?.reason,
      tenantId,
      isHolidayIgnored: (reason, tId) => this.isHolidayIgnored(reason, tId),
      isThanksgivingWindowFn: (d) => this.isThanksgivingWindow(d),
      isChristmasWindowFn: (d) => this.isChristmasWindow(d),
      isNewYearsWindowFn: (d) => this.isNewYearsWindow(d),
      isFederalHolidayFn: (d) => this.isFederalHoliday(d),
    });
  }

  async isNoSendDayByString(dateStr: string, tenantId?: string): Promise<BlockedDayResult> {
    const customBlocked = await this.getCustomBlockedDates();
    const customMatch = customBlocked.find(cb => cb.date === dateStr);

    return resolveBlockedForDate({
      dateStr,
      customReason: customMatch?.reason,
      tenantId,
      isHolidayIgnored: (reason, tId) => this.isHolidayIgnored(reason, tId),
      isThanksgivingWindowFn: (d) => this.isThanksgivingWindow(d),
      isChristmasWindowFn: (d) => this.isChristmasWindow(d),
      isNewYearsWindowFn: (d) => this.isNewYearsWindow(d),
      isFederalHolidayFn: (d) => this.isFederalHoliday(d),
    });
  }

  async getUpcomingBlockedDays(startDate: Date, days: number, timezone?: string): Promise<BlockedDay[]> {
    const blockedDaysMap = new Map<string, BlockedDay>();

    const customDates = await this.getCustomBlockedDates();
    const customDatesMap = new Map(customDates.map(d => [d.date, d.reason]));
    const ignoredIds = await this.getIgnoredHolidayIds();

    let currentDate = startDate;

    for (let i = 0; i < days; i++) {
      const dateStr = this.dateToString(currentDate, timezone);

      if (!blockedDaysMap.has(dateStr)) {
        const customReason = customDatesMap.get(dateStr);
        if (customReason) {
          blockedDaysMap.set(dateStr, { date: dateStr, reason: customReason });
        } else {
          let result: BlockedDayResult = { blocked: false };

          const thanksgivingCheck = this.isThanksgivingWindow(dateStr);
          if (thanksgivingCheck.blocked && thanksgivingCheck.reason) {
            if (!ignoredIds.has(reasonToHolidayId(thanksgivingCheck.reason))) {
              result = thanksgivingCheck;
            }
          }

          if (!result.blocked) {
            const christmasCheck = this.isChristmasWindow(dateStr);
            if (christmasCheck.blocked && christmasCheck.reason) {
              if (!ignoredIds.has(reasonToHolidayId(christmasCheck.reason))) {
                result = christmasCheck;
              }
            }
          }

          if (!result.blocked) {
            const newYearsCheck = this.isNewYearsWindow(dateStr);
            if (newYearsCheck.blocked && newYearsCheck.reason) {
              if (!ignoredIds.has(reasonToHolidayId(newYearsCheck.reason))) {
                result = newYearsCheck;
              }
            }
          }

          if (!result.blocked) {
            const fedCheck = this.isFederalHoliday(dateStr);
            if (fedCheck.isHoliday && fedCheck.name) {
              if (!ignoredIds.has(reasonToHolidayId(fedCheck.name))) {
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

  async getAllHolidaysWithStatus(tenantId: string): Promise<{ holidayId: string; name: string; isIgnored: boolean }[]> {
    const ignoredIds = await this.getIgnoredHolidayIds(tenantId);
    return HOLIDAY_TOGGLES.map(h => ({
      ...h,
      isIgnored: ignoredIds.has(h.holidayId)
    }));
  }

  async getCustomBlockedDates(): Promise<BlockedDay[]> {
    const customDates = await storage.getNoSendDates();
    return customDates.map(d => ({
      date: d.date,
      reason: d.reason
    }));
  }

  clearCache(): void {
    this.holidayCache = {};
  }
}

export const holidayCalendarService = new HolidayCalendarService();

export const isNoSendDay = (date: Date, timezone?: string, tenantId?: string) => holidayCalendarService.isNoSendDay(date, timezone, tenantId);
export const getUpcomingBlockedDays = (startDate: Date, days: number, timezone?: string) =>
  holidayCalendarService.getUpcomingBlockedDays(startDate, days, timezone);
export const getCustomBlockedDates = () => holidayCalendarService.getCustomBlockedDates();
export const getAllHolidaysWithStatus = (tenantId: string) => holidayCalendarService.getAllHolidaysWithStatus(tenantId);
export const clearIgnoredHolidaysCache = (tenantId?: string) => holidayCalendarService.clearIgnoredHolidaysCache(tenantId);
