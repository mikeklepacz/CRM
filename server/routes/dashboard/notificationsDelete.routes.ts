import type { Express } from "express";
import { storage } from "../../storage";

export function registerNotificationsDeleteRoute(app: Express): void {
  app.delete("/api/notifications/:id", async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const existing = await storage.getNotificationById(id, tenantId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Notification not found" });
      }

      await storage.deleteNotification(id, tenantId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: error.message || "Failed to delete notification" });
    }
  });
}
