import type { Express } from "express";
import { handleReminderCalendarSync } from "./reminderCalendarSync.handler";

export function registerReminderCalendarSyncRoute(app: Express): void {
  app.post("/api/reminders/sync-to-calendar", async (req: any, res) => {
    await handleReminderCalendarSync(req, res);
  });
}
