export interface BlockedDay {
  date: string;
  reason: string;
}

export interface NoSendDate {
  id: string;
  date: string;
  reason: string;
  createdBy: string;
  createdAt: string | null;
}

export interface HolidayToggle {
  holidayId: string;
  name: string;
  isIgnored: boolean;
}
