import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { parseBusinessHours, STATE_TIMEZONES } from "../../timezoneHours";

export function calculateNextAvailableCallTime(hoursStr: string, state: string): Date | null {
  if (!hoursStr || !state) return new Date();

  const parsed = parseBusinessHours(hoursStr, state);
  const timezone = parsed.timezone;
  if (parsed.is24_7) return new Date();
  if (parsed.isClosed || Object.keys(parsed.schedule).length === 0) return new Date();

  const nowUtc = new Date();
  const year = parseInt(formatInTimeZone(nowUtc, timezone, "yyyy"));
  const month = parseInt(formatInTimeZone(nowUtc, timezone, "MM"));
  const dateNum = parseInt(formatInTimeZone(nowUtc, timezone, "dd"));
  const isoDay = parseInt(formatInTimeZone(nowUtc, timezone, "i"));
  const currentDay = isoDay === 7 ? 0 : isoDay;
  const hour = parseInt(formatInTimeZone(nowUtc, timezone, "HH"));
  const minute = parseInt(formatInTimeZone(nowUtc, timezone, "mm"));
  const currentMinutes = hour * 60 + minute;

  const buildScheduledTime = (y: number, m: number, d: number, minutes: number): Date => {
    const h = Math.floor(minutes / 60);
    const min = minutes % 60;
    const isoString = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
    return fromZonedTime(isoString, timezone);
  };

  if (parsed.schedule[currentDay]) {
    for (const range of parsed.schedule[currentDay]) {
      if (currentMinutes < range.open) return buildScheduledTime(year, month, dateNum, range.open);
      if (currentMinutes >= range.open && currentMinutes < range.close) return nowUtc;
    }
  }

  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const nextDay = (currentDay + dayOffset) % 7;
    if (parsed.schedule[nextDay] && parsed.schedule[nextDay].length > 0) {
      const firstRange = parsed.schedule[nextDay][0];
      const targetDate = new Date(year, month - 1, dateNum + dayOffset);
      return buildScheduledTime(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        targetDate.getDate(),
        firstRange.open
      );
    }
  }

  const tomorrow = new Date(year, month - 1, dateNum + 1);
  return buildScheduledTime(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate(), 540);
}

export function parseHoursToStructured(
  hoursStr: string,
  state: string
): Array<{ day: string; hours: string; isToday: boolean; isClosed: boolean }> {
  if (!hoursStr) return [];

  const timezone = STATE_TIMEZONES[state] || STATE_TIMEZONES[state?.toUpperCase()] || "America/New_York";
  const now = new Date();
  const storeTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const currentDay = storeTime.getDay();

  const dayMap: Record<string, number> = {
    sun: 0,
    sunday: 0,
    mon: 1,
    monday: 1,
    tue: 2,
    tuesday: 2,
    tues: 2,
    wed: 3,
    wednesday: 3,
    thu: 4,
    thursday: 4,
    thurs: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6,
  };

  const hoursLower = hoursStr.toLowerCase();
  if (hoursLower.includes("24/7") || hoursLower.includes("24 hours")) {
    return [{ day: "Every day", hours: "24 hours", isToday: true, isClosed: false }];
  }

  const segments = hoursStr
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s);
  const schedule: Array<{ day: string; hours: string; isToday: boolean; isClosed: boolean }> = [];

  for (const segment of segments) {
    const segmentLower = segment.toLowerCase();
    const isClosed = segmentLower.includes("closed");
    const rangeMatch = segmentLower.match(
      /(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*[-–]\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*/
    );
    const singleDayMatch = segmentLower.match(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*/);

    let dayLabel = "";
    let appliesToToday = false;

    if (segmentLower.includes("daily") || segmentLower.includes("everyday") || segmentLower.includes("every day")) {
      dayLabel = "Every day";
      appliesToToday = true;
    } else if (rangeMatch) {
      const dayRangeText = segment.match(/[A-Z][a-z]*\s*[-–]\s*[A-Z][a-z]*/)?.[0] || "";
      dayLabel = dayRangeText;

      const startDay = dayMap[rangeMatch[1]];
      const endDay = dayMap[rangeMatch[2]];
      if (startDay !== undefined && endDay !== undefined) {
        if (startDay <= endDay) {
          appliesToToday = currentDay >= startDay && currentDay <= endDay;
        } else {
          appliesToToday = currentDay >= startDay || currentDay <= endDay;
        }
      }
    } else if (singleDayMatch) {
      const dayNum = dayMap[singleDayMatch[1]];
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      dayLabel = dayNames[dayNum] || "";
      appliesToToday = dayNum === currentDay;
    } else {
      dayLabel = segment;
      appliesToToday = true;
    }

    const hoursMatch = segment.match(/(\d{1,2}:?\d{0,2}\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}:?\d{0,2}\s*(?:am|pm)?)/i);
    const hoursText = isClosed ? "Closed" : hoursMatch ? `${hoursMatch[1]} - ${hoursMatch[2]}` : dayLabel;
    schedule.push({ day: dayLabel, hours: hoursText, isToday: appliesToToday, isClosed });
  }

  return schedule;
}

export function checkIfStoreOpen(hoursStr: string, state: string): boolean {
  try {
    if (!hoursStr || !state) return true;

    const timezone = STATE_TIMEZONES[state] || STATE_TIMEZONES[state.toUpperCase()] || "America/New_York";
    const now = new Date();
    const storeTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const currentDay = storeTime.getDay();
    const currentMinutes = storeTime.getHours() * 60 + storeTime.getMinutes();
    const hoursLower = hoursStr.toLowerCase();

    if (hoursLower.includes("24/7") || hoursLower.includes("24 hours") || hoursLower === "open 24 hours") return true;

    const dayMap: Record<string, number> = {
      sun: 0,
      sunday: 0,
      mon: 1,
      monday: 1,
      tue: 2,
      tuesday: 2,
      tues: 2,
      wed: 3,
      wednesday: 3,
      thu: 4,
      thursday: 4,
      thurs: 4,
      fri: 5,
      friday: 5,
      sat: 6,
      saturday: 6,
    };

    const parseTime = (timeStr: string): number | null => {
      const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      if (!match) return null;
      let hour = parseInt(match[1]);
      const min = parseInt(match[2] || "0");
      const period = match[3]?.toLowerCase();
      if (period === "pm" && hour !== 12) hour += 12;
      if (period === "am" && hour === 12) hour = 0;
      return hour * 60 + min;
    };

    const segments = hoursStr.split(/[,;]/);
    const todayRanges: Array<{ open: number; close: number }> = [];
    let explicitlyClosed = false;
    let lastDayContext: number | null = null;

    for (const segment of segments) {
      const segmentLower = segment.trim().toLowerCase();
      let appliesToToday = false;
      let hasExplicitDay = false;

      const rangeMatch = segmentLower.match(
        /(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*-\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*/
      );
      if (rangeMatch) {
        hasExplicitDay = true;
        const startDay = dayMap[rangeMatch[1]];
        const endDay = dayMap[rangeMatch[2]];
        if (startDay !== undefined && endDay !== undefined) {
          if (startDay <= endDay) {
            appliesToToday = currentDay >= startDay && currentDay <= endDay;
          } else {
            appliesToToday = currentDay >= startDay || currentDay <= endDay;
          }
          lastDayContext = appliesToToday ? currentDay : null;
        }
      }

      if (!hasExplicitDay) {
        for (const [dayName, dayNum] of Object.entries(dayMap)) {
          if (segmentLower.startsWith(dayName)) {
            hasExplicitDay = true;
            if (dayNum === currentDay) {
              appliesToToday = true;
              lastDayContext = currentDay;
            } else {
              lastDayContext = null;
            }
            break;
          }
        }
      }

      if (!hasExplicitDay && lastDayContext !== null) appliesToToday = true;
      if (!appliesToToday && !hasExplicitDay && segments.length === 1) appliesToToday = true;

      if (appliesToToday) {
        if (segmentLower.includes("closed")) {
          explicitlyClosed = true;
          continue;
        }
        const timeMatch = segment.match(/(\d{1,2}:?\d{0,2}\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}:?\d{0,2}\s*(?:am|pm)?)/i);
        if (timeMatch) {
          const openMinutes = parseTime(timeMatch[1]);
          const closeMinutes = parseTime(timeMatch[2]);
          if (openMinutes !== null && closeMinutes !== null) {
            todayRanges.push({ open: openMinutes, close: closeMinutes });
          }
        }
      }
    }

    if (explicitlyClosed && todayRanges.length === 0) return false;
    if (todayRanges.length === 0) return true;

    for (const range of todayRanges) {
      if (range.close < range.open) {
        if (currentMinutes >= range.open || currentMinutes < range.close) return true;
      } else if (currentMinutes >= range.open && currentMinutes < range.close) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error checking business hours:", error);
    return true;
  }
}
