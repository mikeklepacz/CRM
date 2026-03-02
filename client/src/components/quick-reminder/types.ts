export interface QuickReminderSaveData {
  note: string;
  date: string;
  time: string;
  useCustomerTimezone: boolean;
  customerTimezone: string | null;
  agentTimezone: string;
  calendarReminders: Array<{ method: string; minutes: number }>;
}

export interface QuickReminderProps {
  onSave: (data: QuickReminderSaveData) => void | Promise<boolean | void>;
  isSaving?: boolean;
  defaultNote?: string;
  defaultDate?: Date;
  storeAddress?: string | null;
  storeCity?: string | null;
  storeState?: string | null;
  userTimezone?: string | null;
  defaultTimezoneMode?: string | null;
  timeFormat?: string | null;
  pointOfContact?: string | null;
  pocEmail?: string | null;
  pocPhone?: string | null;
  defaultEmail?: string | null;
  defaultPhone?: string | null;
  defaultCalendarReminders?: Array<{ method: string; minutes: number }>;
}
