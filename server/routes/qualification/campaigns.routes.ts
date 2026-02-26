import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";

export function registerQualificationCampaignRoutes(
  app: Express,
  deps: { requireOrgAdmin: any }
): void {
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
