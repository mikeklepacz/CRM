import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";
import type { QualificationCampaignsDeps } from "./campaigns.types";

export function registerQualificationCampaignsPatchRoute(app: Express, deps: QualificationCampaignsDeps): void {
  app.patch("/api/qualification/campaigns/:id", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const { name, description, kbFileId, fieldDefinitions, scoringRules, isActive } = req.body;

      const existing = await storage.getQualificationCampaign(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description?.trim();
      if (kbFileId !== undefined) updates.kbFileId = kbFileId;
      if (fieldDefinitions !== undefined) updates.fieldDefinitions = fieldDefinitions;
      if (scoringRules !== undefined) updates.scoringRules = scoringRules;
      if (isActive !== undefined) updates.isActive = isActive;

      const campaign = await storage.updateQualificationCampaign(req.params.id, tenantId, updates);
      res.json({ campaign });
    } catch (error: any) {
      console.error("Error updating qualification campaign:", error);
      res.status(500).json({ message: error.message || "Failed to update campaign" });
    }
  });
}
