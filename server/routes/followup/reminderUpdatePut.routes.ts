import type { Express } from "express";
import { storage } from "../../storage";

export function registerReminderUpdatePutRoute(app: Express): void {
  app.put("/api/reminders/:id", async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const existing = await storage.getReminderById(id, tenantId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      const reminder = await storage.updateReminder(id, tenantId, req.body);
      res.json({ reminder });
    } catch (error: any) {
      console.error("Error updating reminder:", error);
      res.status(500).json({ message: error.message || "Failed to update reminder" });
    }
  });
}
