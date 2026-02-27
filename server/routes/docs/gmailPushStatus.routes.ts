import type { Express } from "express";
import { storage } from "../../storage";
import { getGmailPushStatus } from "../../services/docs/gmailPushService";
import type { GmailPushDeps } from "./gmailPush.types";

export function registerGmailPushStatusRoute(app: Express, deps: GmailPushDeps): void {
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
}
