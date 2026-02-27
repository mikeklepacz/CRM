import { TIMEZONE_DATA } from "@shared/timezoneUtils";

export function detectBrowserTimezone(): string {
  try {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const found = TIMEZONE_DATA.find((tz) => tz.value === browserTz);
    if (found) return found.value;
    if (browserTz.startsWith("America/")) return browserTz;
    return "America/New_York";
  } catch {
    return "America/New_York";
  }
}
