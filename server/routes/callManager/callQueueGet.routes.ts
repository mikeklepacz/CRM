import type { Express } from "express";
import { storage } from "../../storage";
import type { CallQueueAnalyticsDeps } from "./callQueueAnalytics.types";

export function registerCallQueueGetRoute(app: Express, deps: CallQueueAnalyticsDeps): void {
  app.get("/api/elevenlabs/call-queue", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser && !user?.hasVoiceAccess) {
        return res.status(403).json({ error: "Voice calling access required" });
      }

      const tenantId = req.user.tenantId;
      const scheduledCampaigns = await storage.getCallCampaigns(tenantId, {
        status: "scheduled",
        createdByUserId: user?.roleInTenant === "org_admin" || user?.role === "admin" ? undefined : userId,
      });
      const inProgressCampaigns = await storage.getCallCampaigns(tenantId, {
        status: "in-progress",
        createdByUserId: user?.roleInTenant === "org_admin" || user?.role === "admin" ? undefined : userId,
      });
      const campaigns = [...scheduledCampaigns, ...inProgressCampaigns];

      const queueStats = {
        activeCalls: 0,
        queuedCalls: 0,
        completedToday: 0,
        failedToday: 0,
        campaigns: [] as any[],
      };

      for (const campaign of campaigns) {
        const targets = await storage.getCallCampaignTargets(campaign.id, tenantId);
        const pending = targets.filter((t: any) => t.targetStatus === "pending").length;
        const completed = targets.filter((t: any) => t.targetStatus === "completed").length;
        const failed = targets.filter((t: any) => t.targetStatus === "failed").length;
        const inProgress = targets.filter((t: any) => t.targetStatus === "in-progress").length;

        queueStats.queuedCalls += pending;
        queueStats.activeCalls += inProgress;
        queueStats.completedToday += completed;
        queueStats.failedToday += failed;

        queueStats.campaigns.push({
          ...campaign,
          pending,
          completed,
          failed,
          inProgress,
        });
      }

      res.json(queueStats);
    } catch (error: any) {
      console.error("Error fetching call queue:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}
