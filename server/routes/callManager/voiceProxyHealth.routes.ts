import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
  checkFlyVoiceProxyHealth: () => Promise<{ healthy: boolean; details?: any }>;
  isAuthenticatedCustom: any;
  voiceProxyServer: { getActiveSessionCount: () => number };
};

export function registerCallManagerVoiceProxyHealthRoutes(app: Express, deps: Deps): void {
  // Voice proxy health status - for UI indicator
  app.get("/api/voice-proxy/status", deps.isAuthenticatedCustom, async (_req: any, res) => {
    try {
      const health = await deps.checkFlyVoiceProxyHealth();
      res.json({
        healthy: health.healthy,
        audioLoaded: health.details?.audioLoaded ?? false,
        volumeDb: health.details?.volumeDb ?? null,
        sessions: health.details?.sessions ?? 0,
        error: health.healthy ? null : health.details?.error,
      });
    } catch (error: any) {
      res.json({
        healthy: false,
        error: error.message,
      });
    }
  });

  // Get voice proxy latency metrics
  app.get("/api/voice-proxy/metrics", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser && !user?.hasVoiceAccess) {
        return res.status(403).json({ error: "Voice calling access required" });
      }

      const activeSessions = deps.voiceProxyServer.getActiveSessionCount();
      const metrics = {
        activeSessions,
        message:
          activeSessions === 0
            ? "No active calls - start a call to see latency metrics"
            : "Check server logs for detailed latency metrics (logged every 100 frames)",
      };

      res.json(metrics);
    } catch (error: any) {
      console.error("Error fetching voice proxy metrics:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}
