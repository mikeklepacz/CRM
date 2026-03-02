import type { Express } from "express";
import { storage } from "../../storage";
import type { OrgAdminBlueprintsDeps } from "./orgAdminBlueprints.types";

export function registerOrgAdminBlueprintsListRoute(app: Express, deps: OrgAdminBlueprintsDeps): void {
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
}
