import type { Express } from "express";
import { storage } from "../../storage";
import { startGmailPushWatch } from "../../services/docs/gmailPushService";
import type { GmailPushDeps } from "./gmailPush.types";

export function registerGmailPushWatchStartRoute(app: Express, deps: GmailPushDeps): void {
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
}
