import type { Express } from "express";
import { eventGateway } from "../../services/events/gateway";
import { storage } from "../../storage";
import {
  getGmailPushStatus,
  processGmailPushNotification,
  startGmailPushWatch,
  stopGmailPushWatch,
} from "../../services/docs/gmailPushService";

type Deps = {
  isAuthenticatedCustom: any;
  checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
};

export function registerGmailPushRoutes(app: Express, deps: Deps): void {
  app.post("/api/gmail/push", async (req, res) => {
    res.status(200).send("OK");

    try {
      await processGmailPushNotification({
        body: req.body,
        emit: (payload) => eventGateway.emit("gmail:newMessage", payload),
      });
    } catch (error: any) {
      console.error("[GmailPush] Error handling push notification:", error);
    }
  });

  app.get("/api/gmail/push/status", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const status = await getGmailPushStatus();
      res.json(status);
    } catch (error: any) {
      console.error("[GmailPush] Error getting status:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gmail/push/watch", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const result = await startGmailPushWatch();
      res.json({
        success: true,
        historyId: result.historyId,
        expiration: result.expiration,
        expiresAt: new Date(result.expiration).toISOString(),
      });
    } catch (error: any) {
      console.error("[GmailPush] Error starting watch:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gmail/push/stop", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser) {
        return res.status(403).json({ message: "Admin access required" });
      }

      await stopGmailPushWatch();
      res.json({ success: true, message: "Gmail watch stopped" });
    } catch (error: any) {
      console.error("[GmailPush] Error stopping watch:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
