import type { Express } from "express";
import type { OrgAdminProjectsRouteDeps } from "./orgAdminProjects.types";
import { storage } from "../../storage";

export function registerOrgAdminProjectsGetByIdRoute(app: Express, deps: OrgAdminProjectsRouteDeps): void {
  app.get("/api/org-admin/projects/:projectId", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { projectId } = req.params;
          const tenantId = req.user.tenantId;
          const project = await storage.getTenantProjectById(projectId, tenantId);
          if (!project) {
              return res.status(404).json({ message: "Project not found" });
          }
          res.json({ project });
      }
      catch (error: any) {
          console.error("Error getting project:", error);
          res.status(500).json({ message: error.message || "Failed to get project" });
      }
  });
}
