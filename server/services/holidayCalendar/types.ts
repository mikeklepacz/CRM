export interface BlockedDayResult {
  blocked: boolean;
  reason?: string;
}

export interface BlockedDay {
  date: string;
  reason: string;
}

export interface HolidayCache {
  [year: number]: Map<string, string>;
}

export interface HolidayToggleItem {
  holidayId: string;
  name: string;
}
