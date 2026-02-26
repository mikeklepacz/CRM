import type { Express } from "express";
import { storage } from "../../storage";

export function registerOrgAdminBlueprintsRoutes(
  app: Express,
  deps: { requireOrgAdmin: any }
): void {
  app.get("/api/org-admin/blueprints", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { type } = req.query;
      const blueprints = await storage.listAssistantBlueprints(tenantId, type as string | undefined);
      res.json({ blueprints });
    } catch (error: any) {
      console.error("Error listing blueprints:", error);
      res.status(500).json({ message: error.message || "Failed to list blueprints" });
    }
  });

  app.get("/api/org-admin/blueprints/:blueprintId", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { blueprintId } = req.params;
      const tenantId = req.user.tenantId;
      const blueprint = await storage.getAssistantBlueprintById(blueprintId, tenantId);
      if (!blueprint) {
        return res.status(404).json({ message: "Blueprint not found" });
      }
      res.json({ blueprint });
    } catch (error: any) {
      console.error("Error getting blueprint:", error);
      res.status(500).json({ message: error.message || "Failed to get blueprint" });
    }
  });

  app.post("/api/org-admin/blueprints", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { name, slug, blueprintType, description, baseConfig } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Blueprint name is required" });
      }

      const blueprint = await storage.createAssistantBlueprint({
        tenantId,
        name: name.trim(),
        slug: slug?.trim(),
        blueprintType: blueprintType || "general",
        description: description?.trim(),
        baseConfig: baseConfig || {},
        createdBy: userId,
      });

      res.status(201).json({ blueprint });
    } catch (error: any) {
      console.error("Error creating blueprint:", error);
      res.status(500).json({ message: error.message || "Failed to create blueprint" });
    }
  });

  app.patch("/api/org-admin/blueprints/:blueprintId", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { blueprintId } = req.params;
      const tenantId = req.user.tenantId;
      const { name, slug, blueprintType, description, baseConfig, isActive } = req.body;

      const existing = await storage.getAssistantBlueprintById(blueprintId, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Blueprint not found" });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name.trim();
      if (slug !== undefined) updates.slug = slug.trim();
      if (blueprintType !== undefined) updates.blueprintType = blueprintType;
      if (description !== undefined) updates.description = description?.trim();
      if (baseConfig !== undefined) updates.baseConfig = baseConfig;
      if (isActive !== undefined) updates.isActive = isActive;

      const blueprint = await storage.updateAssistantBlueprint(blueprintId, tenantId, updates);
      res.json({ blueprint });
    } catch (error: any) {
      console.error("Error updating blueprint:", error);
      res.status(500).json({ message: error.message || "Failed to update blueprint" });
    }
  });

  app.delete("/api/org-admin/blueprints/:blueprintId", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { blueprintId } = req.params;
      const tenantId = req.user.tenantId;

      const existing = await storage.getAssistantBlueprintById(blueprintId, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Blueprint not found" });
      }

      await storage.deleteAssistantBlueprint(blueprintId, tenantId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting blueprint:", error);
      res.status(500).json({ message: error.message || "Failed to delete blueprint" });
    }
  });
}
