import type { Express } from "express";
import { storage } from "../../storage";
import type { SuperAdminTenantsDeps } from "./superAdminTenants.types";

export function registerSuperAdminTenantUsersListRoute(app: Express, deps: SuperAdminTenantsDeps): void {
  app.get("/api/super-admin/tenants/:tenantId/users", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const users = await storage.listTenantUsers(tenantId);
      res.json({ users });
    } catch (error: any) {
      console.error("Error listing tenant users:", error);
      res.status(500).json({ message: error.message || "Failed to list tenant users" });
    }
  });
}
