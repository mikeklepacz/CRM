import type { Express } from "express";
import { storage } from "../../storage";
import type { KbManagementDeps } from "./kbManagement.types";

export function registerKbFileGetByIdRoute(app: Express, deps: KbManagementDeps): void {
  app.get("/api/kb/files/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const file = await storage.getKbFileById(req.params.id, req.user.tenantId);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error: any) {
      console.error("[KB] Error fetching file:", error);
      res.status(500).json({ error: error.message || "Failed to fetch KB file" });
    }
  });
}
