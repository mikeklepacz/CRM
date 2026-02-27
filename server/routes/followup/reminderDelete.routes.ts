import type { Express } from "express";
import { handleReminderDelete } from "./reminderDelete.handler";

export function registerReminderDeleteRoute(app: Express): void {
  app.delete("/api/reminders/:id", async (req: any, res) => {
    await handleReminderDelete(req, res);
  });
}
