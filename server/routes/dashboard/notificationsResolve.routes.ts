import type { Express } from "express";
import { storage } from "../../storage";

export function registerNotificationsResolveRoute(app: Express): void {
  app.put("/api/notifications/:id/resolve", async (req: any, res) => {
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

      const notification = await storage.markNotificationAsResolved(id, tenantId);
      res.json({ notification });
    } catch (error: any) {
      console.error("Error resolving notification:", error);
      res.status(500).json({ message: error.message || "Failed to resolve notification" });
    }
  });
}
