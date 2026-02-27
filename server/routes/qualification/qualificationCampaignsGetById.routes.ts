import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";
import type { QualificationCampaignsDeps } from "./campaigns.types";

export function registerQualificationCampaignsGetByIdRoute(app: Express, deps: QualificationCampaignsDeps): void {
  app.get("/api/qualification/campaigns/:id", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const campaign = await storage.getQualificationCampaign(req.params.id, tenantId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json({ campaign });
    } catch (error: any) {
      console.error("Error getting qualification campaign:", error);
      res.status(500).json({ message: error.message || "Failed to get campaign" });
    }
  });
}
