import type { Express } from "express";
import { storage } from "../../storage";

export function registerReminderReadByDateRoute(app: Express): void {
  app.get("/api/reminders/by-date/:date", async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { date } = req.params;

      const allReminders = await storage.getRemindersByUser(userId, tenantId);

      const dateReminders = allReminders.filter((r) => r.scheduledDate === date && r.isActive);

      const sortedReminders = dateReminders.sort((a, b) => {
        if (a.scheduledTime && b.scheduledTime) {
          return a.scheduledTime.localeCompare(b.scheduledTime);
        }
        return 0;
      });

      res.json({ reminders: sortedReminders });
    } catch (error: any) {
      console.error("Error fetching reminders by date:", error);
      res.status(500).json({ message: error.message || "Failed to fetch reminders by date" });
    }
  });
}
