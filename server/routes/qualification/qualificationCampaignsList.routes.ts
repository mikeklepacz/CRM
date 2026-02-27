import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";
import type { QualificationCampaignsDeps } from "./campaigns.types";

export function registerQualificationCampaignsListRoute(app: Express, deps: QualificationCampaignsDeps): void {
  app.get("/api/qualification/campaigns", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const campaigns = await storage.listQualificationCampaigns(tenantId);
      res.json({ campaigns });
    } catch (error: any) {
      console.error("Error listing qualification campaigns:", error);
      res.status(500).json({ message: error.message || "Failed to list campaigns" });
    }
  });
}
