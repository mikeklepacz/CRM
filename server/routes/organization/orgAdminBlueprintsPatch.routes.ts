import type { Express } from "express";
import { storage } from "../../storage";
import type { OrgAdminBlueprintsDeps } from "./orgAdminBlueprints.types";

export function registerOrgAdminBlueprintsPatchRoute(app: Express, deps: OrgAdminBlueprintsDeps): void {
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
}
