import type { Express } from "express";
import { registerReminderReadAllRoute } from "./reminderReadAll.routes";
import { registerReminderReadByClientRoute } from "./reminderReadByClient.routes";
import { registerReminderReadByDateRoute } from "./reminderReadByDate.routes";

export function registerReminderReadRoutes(app: Express): void {
  registerReminderReadAllRoute(app);
  registerReminderReadByClientRoute(app);
  registerReminderReadByDateRoute(app);
}
