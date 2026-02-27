import type { Express } from "express";
import type { OrgAdminProjectsRouteDeps } from "./orgAdminProjects.types";
import { storage } from "../../storage";

export function registerOrgAdminProjectsDeleteRoute(app: Express, deps: OrgAdminProjectsRouteDeps): void {
  app.delete("/api/org-admin/projects/:projectId", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { projectId } = req.params;
          const tenantId = req.user.tenantId;
          const existing = await storage.getTenantProjectById(projectId, tenantId);
          if (!existing) {
              return res.status(404).json({ message: "Project not found" });
          }
          if (existing.isDefault) {
              return res
                  .status(400)
                  .json({ message: "Cannot delete the default project. Set another project as default first." });
          }
          await storage.deleteTenantProject(projectId, tenantId);
          res.json({ success: true });
      }
      catch (error: any) {
          console.error("Error deleting project:", error);
          res.status(500).json({ message: error.message || "Failed to delete project" });
      }
  });
}
