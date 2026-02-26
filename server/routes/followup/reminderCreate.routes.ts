import type { Express } from "express";
import { createReminder, getReminderCreateStatusCode } from "../../services/followup/reminderCreate/service";

export function registerReminderCreateRoutes(app: Express): void {
  app.post("/api/reminders", async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const reminder = await createReminder(req.body, req.user);
      res.json({ reminder });
    } catch (error: any) {
      const statusCode = getReminderCreateStatusCode(error);
      if (statusCode) {
        return res.status(statusCode).json({ message: error.message });
      }

      console.error("Error creating reminder:", error);
      res.status(500).json({ message: error.message || "Failed to create reminder" });
    }
  });
}
