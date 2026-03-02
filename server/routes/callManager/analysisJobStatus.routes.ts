import type { Express } from "express";
import { storage } from "../../storage";
import type { CallInsightsAdminDeps } from "./callInsightsAdmin.types";

export function registerAnalysisJobStatusRoute(app: Express, deps: CallInsightsAdminDeps): void {
  app.get("/api/analysis/job-status", deps.isAuthenticatedCustom, async (_req: any, res) => {
    try {
      const runningJob = await storage.getRunningAnalysisJob();
      if (!runningJob) {
        return res.json({ status: "idle", job: null });
      }

      res.json({
        status: "running",
        job: {
          id: runningJob.id,
          type: runningJob.type,
          agentId: runningJob.agentId,
          currentCallIndex: runningJob.currentCallIndex,
          totalCalls: runningJob.totalCalls,
          proposalsCreated: runningJob.proposalsCreated,
          startedAt: runningJob.startedAt,
        },
      });
    } catch (error: any) {
      console.error("[Job Status] Error fetching job status:", error);
      res.status(500).json({ error: error.message || "Failed to fetch job status" });
    }
  });
}
