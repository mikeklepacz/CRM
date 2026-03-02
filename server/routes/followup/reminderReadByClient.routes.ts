import type { Express } from "express";
import { storage } from "../../storage";

export function registerReminderReadByClientRoute(app: Express): void {
  app.get("/api/reminders/client/:clientId", async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { clientId } = req.params;
      const reminders = await storage.getRemindersByClient(clientId, tenantId);

      const userReminders = reminders.filter((r) => r.userId === userId);
      res.json({ reminders: userReminders });
    } catch (error: any) {
      console.error("Error fetching client reminders:", error);
      res.status(500).json({ message: error.message || "Failed to fetch client reminders" });
    }
  });
}
