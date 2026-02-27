import type { Express } from "express";
import { storage } from "../../storage";
import type { OrgAdminBlueprintsDeps } from "./orgAdminBlueprints.types";

export function registerOrgAdminBlueprintsDeleteRoute(app: Express, deps: OrgAdminBlueprintsDeps): void {
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
