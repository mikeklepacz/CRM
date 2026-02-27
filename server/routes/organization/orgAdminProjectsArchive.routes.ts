import type { Express } from "express";
import type { OrgAdminProjectsRouteDeps } from "./orgAdminProjects.types";
import { storage } from "../../storage";

export function registerOrgAdminProjectsArchiveRoute(app: Express, deps: OrgAdminProjectsRouteDeps): void {
  app.post("/api/org-admin/projects/:projectId/archive", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { projectId } = req.params;
          const tenantId = req.user.tenantId;
          const userId = req.user.id;
          const existing = await storage.getTenantProjectById(projectId, tenantId);
          if (!existing) {
              return res.status(404).json({ message: "Project not found" });
          }
          if (existing.status === "archived") {
              return res.status(400).json({ message: "Project is already archived" });
          }
          const project = await storage.archiveTenantProject(projectId, tenantId, userId);
          res.json({ project });
      }
      catch (error: any) {
          console.error("Error archiving project:", error);
          res.status(500).json({ message: error.message || "Failed to archive project" });
      }
  });
}
