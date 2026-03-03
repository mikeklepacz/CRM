import type { Express } from "express";
import type { OrgAdminProjectsRouteDeps } from "./orgAdminProjects.types";
import { storage } from "../../storage";

export function registerOrgAdminProjectsListRoute(app: Express, deps: OrgAdminProjectsRouteDeps): void {
  app.get("/api/org-admin/projects", deps.requireAgent, async (req: any, res) => {
      try {
          const tenantId = req.user.tenantId;
          const { status } = req.query;
          const projects = await storage.listTenantProjects(tenantId, status as string | undefined);
          res.json({ projects });
      }
      catch (error: any) {
          console.error("Error listing projects:", error);
          res.status(500).json({ message: error.message || "Failed to list projects" });
      }
  });
}
