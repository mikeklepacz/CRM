import type { Express } from "express";
import { handleReminderReadAll } from "./reminderReadAll.handler";

export function registerReminderReadAllRoute(app: Express): void {
  app.get("/api/reminders", async (req: any, res) => {
    await handleReminderReadAll(req, res);
  });
}
