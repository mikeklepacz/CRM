import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";
import type { QualificationLeadsDeps } from "./leads.types";

export function registerQualificationLeadsStatsRoute(app: Express, deps: QualificationLeadsDeps): void {
  app.get("/api/qualification/leads/stats", deps.isAuthenticated, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const { campaignId, projectId } = req.query;
      const stats = await storage.getQualificationLeadStats(tenantId, campaignId as string | undefined, projectId as string | undefined);
      res.json({ stats });
    } catch (error: any) {
      console.error("Error getting qualification lead stats:", error);
      res.status(500).json({ message: error.message || "Failed to get stats" });
    }
  });
}
