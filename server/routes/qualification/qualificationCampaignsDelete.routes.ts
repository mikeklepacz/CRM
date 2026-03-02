import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";
import type { QualificationCampaignsDeps } from "./campaigns.types";

export function registerQualificationCampaignsDeleteRoute(app: Express, deps: QualificationCampaignsDeps): void {
  app.delete("/api/qualification/campaigns/:id", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const existing = await storage.getQualificationCampaign(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      await storage.deleteQualificationCampaign(req.params.id, tenantId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting qualification campaign:", error);
      res.status(500).json({ message: error.message || "Failed to delete campaign" });
    }
  });
}
