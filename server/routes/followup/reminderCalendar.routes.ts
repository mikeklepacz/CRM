import type { Express } from "express";
import { registerReminderCalendarExportRoute } from "./reminderCalendarExport.routes";
import { registerReminderCalendarSyncRoute } from "./reminderCalendarSync.routes";

export function registerReminderCalendarRoutes(app: Express): void {
  registerReminderCalendarSyncRoute(app);
  registerReminderCalendarExportRoute(app);
}
