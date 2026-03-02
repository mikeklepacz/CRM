import type { Express } from "express";
import type { OrgAdminProjectsRouteDeps } from "./orgAdminProjects.types";
import { storage } from "../../storage";

export function registerOrgAdminProjectsSetDefaultRoute(app: Express, deps: OrgAdminProjectsRouteDeps): void {
  app.post("/api/org-admin/projects/:projectId/set-default", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { projectId } = req.params;
          const tenantId = req.user.tenantId;
          const existing = await storage.getTenantProjectById(projectId, tenantId);
          if (!existing) {
              return res.status(404).json({ message: "Project not found" });
          }
          if (existing.status === "archived") {
              return res.status(400).json({ message: "Cannot set archived project as default" });
          }
          const project = await storage.setDefaultTenantProject(projectId, tenantId);
          res.json({ project });
      }
      catch (error: any) {
          console.error("Error setting default project:", error);
          res.status(500).json({ message: error.message || "Failed to set default project" });
      }
  });
}
