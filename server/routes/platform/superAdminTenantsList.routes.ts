import type { Express } from "express";
import { storage } from "../../storage";
import type { SuperAdminTenantsDeps } from "./superAdminTenants.types";

export function registerSuperAdminTenantsListRoute(app: Express, deps: SuperAdminTenantsDeps): void {
  app.get("/api/super-admin/tenants", deps.requireSuperAdmin, async (_req: any, res) => {
    try {
      const tenants = await storage.listTenants();
      res.json({ tenants });
    } catch (error: any) {
      console.error("Error listing tenants:", error);
      res.status(500).json({ message: error.message || "Failed to list tenants" });
    }
  });
}
