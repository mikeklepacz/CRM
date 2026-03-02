import { storage } from "../../../storage";

type CalendarReminder = {
  method: "email" | "popup";
  minutes: number;
};

type Params = {
  tenantId: string;
  userId: string;
  calendarReminders?: CalendarReminder[];
};

export async function syncDefaultCalendarReminders(params: Params): Promise<void> {
  const { tenantId, userId, calendarReminders } = params;
  if (!calendarReminders || !Array.isArray(calendarReminders)) return;

  const userPreferences = await storage.getUserPreferences(userId, tenantId);
  const currentDefaults = (userPreferences?.defaultCalendarReminders as CalendarReminder[] | undefined) || [
    { method: "popup", minutes: 10 },
  ];
  const normalize = (arr: CalendarReminder[]) =>
    JSON.stringify(arr.sort((a, b) => a.method.localeCompare(b.method) || a.minutes - b.minutes));
  const remindersChanged = normalize(calendarReminders) !== normalize(currentDefaults);
  if (!remindersChanged) return;

  await storage.saveUserPreferences(userId, tenantId, {
    defaultCalendarReminders: calendarReminders,
  });
}
