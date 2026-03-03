import type { Express } from "express";
import { storage } from "../../storage";
import type { TenantContextRouteDeps } from "./tenantContext.types";

export function registerTenantContextRoutes(app: Express, deps: TenantContextRouteDeps): void {
  app.get("/api/tenant/settings", deps.requireAgent, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.json({ tenant });
    } catch (error: any) {
      console.error("Error getting tenant settings:", error);
      res.status(500).json({ message: error.message || "Failed to get settings" });
    }
  });

  app.get("/api/tenant/projects", deps.requireAgent, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { status } = req.query;
      const projects = await storage.listTenantProjects(tenantId, status as string | undefined);
      res.json({ projects });
    } catch (error: any) {
      console.error("Error listing tenant projects:", error);
      res.status(500).json({ message: error.message || "Failed to list projects" });
    }
  });
}

