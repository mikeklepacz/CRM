import type { Express } from "express";
import { storage } from "../../storage";
import type { OrgAdminBlueprintsDeps } from "./orgAdminBlueprints.types";

export function registerOrgAdminBlueprintsGetByIdRoute(app: Express, deps: OrgAdminBlueprintsDeps): void {
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
}
