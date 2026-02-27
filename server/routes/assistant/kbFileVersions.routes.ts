import type { Express } from "express";
import { storage } from "../../storage";
import type { KbManagementDeps } from "./kbManagement.types";

export function registerKbFileVersionsRoute(app: Express, deps: KbManagementDeps): void {
  app.get("/api/kb/files/:id/versions", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const versions = await storage.getKbFileVersions(req.params.id, req.user.tenantId);
      res.json({ versions });
    } catch (error: any) {
      console.error("[KB] Error fetching versions:", error);
      res.status(500).json({ error: error.message || "Failed to fetch versions" });
    }
  });
}
