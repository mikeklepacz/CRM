import type { Express } from "express";
import type { OrgAdminProjectsRouteDeps } from "./orgAdminProjects.types";

export function registerOrgAdminProjectsConfigRoute(app: Express, deps: OrgAdminProjectsRouteDeps): void {
  app.get("/api/org-admin/projects/:projectId/config", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { projectId } = req.params;
          const tenantId = req.user.tenantId;
          const { resolveProjectConfig } = await import("../../services/projectConfigResolver");
          const config = await resolveProjectConfig(tenantId, projectId);
          if (!config) {
              return res.status(404).json({ message: "Project not found" });
          }
          res.json({ config });
      }
      catch (error: any) {
          console.error("Error getting project config:", error);
          res.status(500).json({ message: error.message || "Failed to get project config" });
      }
  });
}
