import type { Express } from "express";
import { storage } from "../../storage";
import type { OrgAdminBlueprintsDeps } from "./orgAdminBlueprints.types";

export function registerOrgAdminBlueprintsCreateRoute(app: Express, deps: OrgAdminBlueprintsDeps): void {
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
}
