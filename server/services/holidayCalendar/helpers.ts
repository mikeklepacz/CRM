import * as fedHolidays from '@18f/us-federal-holidays';
import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { HolidayCache, BlockedDayResult } from './types';

export function reasonToHolidayId(reason: string): string {
  return reason
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getHolidaysForYear(
  year: number,
  holidayCache: HolidayCache,
  options: { shiftSaturdayHolidays: boolean; shiftSundayHolidays: boolean },
): Map<string, string> {
  if (!holidayCache[year]) {
    const holidays = fedHolidays.allForYear(year, options);
    const holidayMap = new Map<string, string>();
    for (const h of holidays) {
      const dateStr = format(new Date(h.date), 'yyyy-MM-dd');
      holidayMap.set(dateStr, h.name);
    }
    holidayCache[year] = holidayMap;
  }
  return holidayCache[year];
}

export function getThanksgivingDateStr(
  year: number,
  getYearHolidays: (year: number) => Map<string, string>,
): string | null {
  const holidayMap = getYearHolidays(year);
  for (const [dateStr, name] of holidayMap.entries()) {
    if (name === 'Thanksgiving Day') {
      return dateStr;
    }
  }
  return null;
}

export function isFederalHoliday(dateStr: string, getYearHolidays: (year: number) => Map<string, string>) {
  const year = parseInt(dateStr.slice(0, 4), 10);
  const holidayMap = getYearHolidays(year);
  const name = holidayMap.get(dateStr);
  return name ? { isHoliday: true, name } : { isHoliday: false };
}

export function isThanksgivingWindow(
  dateStr: string,
  getThanksgiving: (year: number) => string | null,
): { blocked: boolean; reason?: string } {
  const year = parseInt(dateStr.slice(0, 4), 10);
  const thanksgivingStr = getThanksgiving(year);

  if (!thanksgivingStr) {
    return { blocked: false };
  }

  const thanksgivingDate = parseISO(thanksgivingStr);

  const wednesdayBefore = format(addDays(thanksgivingDate, -1), 'yyyy-MM-dd');
  const blackFriday = format(addDays(thanksgivingDate, 1), 'yyyy-MM-dd');
  const saturday = format(addDays(thanksgivingDate, 2), 'yyyy-MM-dd');
  const sunday = format(addDays(thanksgivingDate, 3), 'yyyy-MM-dd');
  const cyberMonday = format(addDays(thanksgivingDate, 4), 'yyyy-MM-dd');

  if (dateStr === thanksgivingStr) return { blocked: true, reason: 'Thanksgiving Day' };
  if (dateStr === wednesdayBefore) return { blocked: true, reason: 'Thanksgiving Eve' };
  if (dateStr === blackFriday) return { blocked: true, reason: 'Black Friday' };
  if (dateStr === saturday || dateStr === sunday) return { blocked: true, reason: 'Thanksgiving Weekend' };
  if (dateStr === cyberMonday) return { blocked: true, reason: 'Cyber Monday' };

  return { blocked: false };
}

export function isChristmasWindow(dateStr: string): { blocked: boolean; reason?: string } {
  const monthDay = dateStr.slice(5);
  if (monthDay === '12-23') return { blocked: true, reason: 'Christmas Eve Eve' };
  if (monthDay === '12-24') return { blocked: true, reason: 'Christmas Eve' };
  if (monthDay === '12-25') return { blocked: true, reason: 'Christmas Day' };
  if (monthDay === '12-26') return { blocked: true, reason: 'Day After Christmas' };
  return { blocked: false };
}

export function isNewYearsWindow(dateStr: string): { blocked: boolean; reason?: string } {
  const monthDay = dateStr.slice(5);
  if (monthDay === '12-31') return { blocked: true, reason: "New Year's Eve" };
  if (monthDay === '01-01') return { blocked: true, reason: "New Year's Day" };
  if (monthDay === '01-02') return { blocked: true, reason: "Day After New Year's" };
  return { blocked: false };
}

export function dateToString(date: Date, timezone?: string): string {
  if (timezone) {
    return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
  }
  return format(date, 'yyyy-MM-dd');
}

export async function resolveBlockedForDate(params: {
  dateStr: string;
  customReason?: string;
  tenantId?: string;
  isHolidayIgnored: (reason: string, tenantId?: string) => Promise<boolean>;
  isThanksgivingWindowFn: (dateStr: string) => { blocked: boolean; reason?: string };
  isChristmasWindowFn: (dateStr: string) => { blocked: boolean; reason?: string };
  isNewYearsWindowFn: (dateStr: string) => { blocked: boolean; reason?: string };
  isFederalHolidayFn: (dateStr: string) => { isHoliday: boolean; name?: string };
}): Promise<BlockedDayResult> {
  if (params.customReason) {
    return { blocked: true, reason: params.customReason };
  }

  const thanksgivingCheck = params.isThanksgivingWindowFn(params.dateStr);
  if (thanksgivingCheck.blocked && thanksgivingCheck.reason) {
    if (!await params.isHolidayIgnored(thanksgivingCheck.reason, params.tenantId)) {
      return thanksgivingCheck;
    }
  }

  const christmasCheck = params.isChristmasWindowFn(params.dateStr);
  if (christmasCheck.blocked && christmasCheck.reason) {
    if (!await params.isHolidayIgnored(christmasCheck.reason, params.tenantId)) {
      return christmasCheck;
    }
  }

  const newYearsCheck = params.isNewYearsWindowFn(params.dateStr);
  if (newYearsCheck.blocked && newYearsCheck.reason) {
    if (!await params.isHolidayIgnored(newYearsCheck.reason, params.tenantId)) {
      return newYearsCheck;
    }
  }

  const federalCheck = params.isFederalHolidayFn(params.dateStr);
  if (federalCheck.isHoliday && federalCheck.name) {
    if (!await params.isHolidayIgnored(federalCheck.name, params.tenantId)) {
      return { blocked: true, reason: federalCheck.name };
    }
  }

  return { blocked: false };
}
