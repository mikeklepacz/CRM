import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";
import type { QualificationCampaignsDeps } from "./campaigns.types";

export function registerQualificationCampaignsCreateRoute(app: Express, deps: QualificationCampaignsDeps): void {
  app.post("/api/qualification/campaigns", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const { name, description, kbFileId, fieldDefinitions, scoringRules, isActive } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Campaign name is required" });
      }

      const campaign = await storage.createQualificationCampaign({
        tenantId,
        name: name.trim(),
        description: description?.trim(),
        kbFileId,
        fieldDefinitions: fieldDefinitions || [],
        scoringRules: scoringRules || {},
        isActive: isActive !== false,
      });

      res.status(201).json({ campaign });
    } catch (error: any) {
      console.error("Error creating qualification campaign:", error);
      res.status(500).json({ message: error.message || "Failed to create campaign" });
    }
  });
}
