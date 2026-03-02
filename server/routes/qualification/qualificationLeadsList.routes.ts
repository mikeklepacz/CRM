import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";
import type { QualificationLeadsDeps } from "./leads.types";

export function registerQualificationLeadsListRoute(app: Express, deps: QualificationLeadsDeps): void {
  app.get("/api/qualification/leads", deps.isAuthenticated, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const { campaignId, status, callStatus, projectId, limit, offset } = req.query;

      const result = await storage.listQualificationLeads(tenantId, {
        campaignId: campaignId as string | undefined,
        status: status as string | undefined,
        callStatus: callStatus as string | undefined,
        projectId: projectId as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error listing qualification leads:", error);
      res.status(500).json({ message: error.message || "Failed to list leads" });
    }
  });
}
