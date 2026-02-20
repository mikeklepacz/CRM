import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { isNoSendDay } from "../holidayCalendar";

function getJsDayInTimezone(date: Date, timezone: string): number {
  // date-fns-tz ISO day: 1=Mon ... 7=Sun
  const isoDay = parseInt(formatInTimeZone(date, timezone, "i"), 10);
  return isoDay === 7 ? 0 : isoDay;
}

export async function getNextEligibleDateIsos(
  startDate: Date,
  count: number,
  timezone: string,
  options: {
    excludedDays?: number[];
    tenantId?: string;
    maxLookaheadDays?: number;
  } = {}
): Promise<string[]> {
  const excludedDays = options.excludedDays || [];
  const tenantId = options.tenantId;
  const maxLookaheadDays = options.maxLookaheadDays ?? 30;

  const result: string[] = [];

  for (let dayOffset = 0; dayOffset <= maxLookaheadDays && result.length < count; dayOffset++) {
    const candidate = addDays(startDate, dayOffset);
    const jsDay = getJsDayInTimezone(candidate, timezone);
    if (excludedDays.includes(jsDay)) {
      continue;
    }

    const blocked = await isNoSendDay(candidate, timezone, tenantId);
    if (blocked.blocked) {
      continue;
    }

    const dateIso = formatInTimeZone(candidate, timezone, "yyyy-MM-dd");
    result.push(dateIso);
  }

  return result;
}
