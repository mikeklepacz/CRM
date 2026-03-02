import type { Express } from "express";
import { storage } from "../../storage";

export function registerNotificationsListRoute(app: Express): void {
  app.get("/api/notifications", async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { unreadOnly = "false", agentIds } = req.query;

      const currentUser = await storage.getUserById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      let allowedUserIds: string[] = [];
      const isAgent = currentUser.role === "agent";

      if (isAgent) {
        allowedUserIds = [userId];
      } else {
        const requestedAgentIds = agentIds ? (Array.isArray(agentIds) ? agentIds : [agentIds]) : [userId];
        allowedUserIds = requestedAgentIds;
      }

      const tenantId = req.user.tenantId;
      let allNotifications: any[] = [];
      for (const uid of allowedUserIds) {
        const userNotifications = await storage.getNotificationsByUser(uid, tenantId);
        allNotifications = allNotifications.concat(userNotifications);
      }

      const filtered = unreadOnly === "true" ? allNotifications.filter((n) => !n.isRead) : allNotifications;

      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({ notifications: filtered });
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: error.message || "Failed to fetch notifications" });
    }
  });
}
