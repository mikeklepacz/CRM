import { format } from 'date-fns';
import { formatInTimeZone, getTimezoneOffset } from 'date-fns-tz';
import { CITY_TO_TIMEZONE } from './timezoneUtils/cities';
import { TIMEZONE_DATA } from './timezoneUtils/timezoneData';
import type { TimezoneData } from './timezoneUtils/types';
import { US_STATE_TO_TIMEZONE } from './timezoneUtils/usStates';

export type { TimezoneData };
export { CITY_TO_TIMEZONE, TIMEZONE_DATA, US_STATE_TO_TIMEZONE };

export function detectTimezoneFromAddress(
  address: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined
): string | null {
  if (state) {
    const stateUpper = state.trim().toUpperCase();
    const stateTitleCase = state.trim();

    if (US_STATE_TO_TIMEZONE[stateUpper]) {
      return US_STATE_TO_TIMEZONE[stateUpper];
    }
    if (US_STATE_TO_TIMEZONE[stateTitleCase]) {
      return US_STATE_TO_TIMEZONE[stateTitleCase];
    }
  }

  if (city) {
    const cityTitleCase = city.trim();
    if (CITY_TO_TIMEZONE[cityTitleCase]) {
      return CITY_TO_TIMEZONE[cityTitleCase];
    }

    const cityLower = cityTitleCase.toLowerCase();
    const matchedCity = Object.keys(CITY_TO_TIMEZONE).find(
      key => key.toLowerCase() === cityLower
    );
    if (matchedCity) {
      return CITY_TO_TIMEZONE[matchedCity];
    }
  }

  if (address) {
    const addressUpper = address.toUpperCase();
    for (const [stateCode, timezone] of Object.entries(US_STATE_TO_TIMEZONE)) {
      if (stateCode.length === 2 && addressUpper.includes(` ${stateCode} `)) {
        return timezone;
      }
    }
  }

  return null;
}

export function formatTimezoneDisplay(timezone: string): string {
  try {
    const now = new Date();
    const offset = getTimezoneOffset(timezone, now);
    const offsetHours = offset / (1000 * 60 * 60);
    const sign = offsetHours >= 0 ? '+' : '';
    const offsetStr = `UTC${sign}${offsetHours}`;

    const tzData = TIMEZONE_DATA.find(tz => tz.value === timezone);
    if (tzData) {
      return `${tzData.label} (${offsetStr})`;
    }

    return `${timezone} (${offsetStr})`;
  } catch (error) {
    return timezone;
  }
}

export function getTimezoneOffsetString(timezone: string): string {
  try {
    const now = new Date();
    const offset = getTimezoneOffset(timezone, now);
    const offsetHours = offset / (1000 * 60 * 60);
    const sign = offsetHours >= 0 ? '+' : '';
    return `UTC${sign}${offsetHours}`;
  } catch (error) {
    return 'UTC';
  }
}

export function formatTimeInTimezone(date: Date, timezone: string, formatStr: string = 'PPpp'): string {
  try {
    return formatInTimeZone(date, timezone, formatStr);
  } catch (error) {
    return format(date, formatStr);
  }
}
