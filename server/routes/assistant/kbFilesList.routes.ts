import type { Express } from "express";
import { storage } from "../../storage";
import type { KbManagementDeps } from "./kbManagement.types";

export function registerKbFilesListRoute(app: Express, deps: KbManagementDeps): void {
  app.get("/api/kb/files", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { projectId } = req.query;
      const files = await storage.getAllKbFiles(tenantId, projectId as string | undefined);
      res.json({ files });
    } catch (error: any) {
      console.error("[KB] Error fetching files:", error);
      res.status(500).json({ error: error.message || "Failed to fetch KB files" });
    }
  });
}
