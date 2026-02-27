import type { Express } from "express";
import { handleReminderCalendarExport } from "./reminderCalendarExport.handler";

export function registerReminderCalendarExportRoute(app: Express): void {
  app.get("/api/reminders/export/calendar", async (req: any, res) => {
    await handleReminderCalendarExport(req, res);
  });
}
