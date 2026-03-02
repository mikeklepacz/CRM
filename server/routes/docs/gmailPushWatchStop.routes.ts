import type { Express } from "express";
import { storage } from "../../storage";
import { stopGmailPushWatch } from "../../services/docs/gmailPushService";
import type { GmailPushDeps } from "./gmailPush.types";

export function registerGmailPushWatchStopRoute(app: Express, deps: GmailPushDeps): void {
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
