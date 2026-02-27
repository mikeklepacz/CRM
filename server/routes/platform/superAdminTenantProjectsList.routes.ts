import type { Express } from "express";
import { storage } from "../../storage";
import type { SuperAdminTenantsDeps } from "./superAdminTenants.types";

export function registerSuperAdminTenantProjectsListRoute(app: Express, deps: SuperAdminTenantsDeps): void {
  app.get("/api/super-admin/tenants/:tenantId/projects", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const projects = await storage.listTenantProjects(tenantId);
      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching tenant projects:", error);
      res.status(500).json({ message: error.message || "Failed to fetch projects" });
    }
  });
}
