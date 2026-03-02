import type { Express } from "express";
import { storage } from "../../storage";
import type { SuperAdminTenantsDeps } from "./superAdminTenants.types";

export function registerSuperAdminTenantsGetByIdRoute(app: Express, deps: SuperAdminTenantsDeps): void {
  app.get("/api/super-admin/tenants/:tenantId", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      const stats = await storage.getTenantStats(tenantId);
      res.json({ tenant, stats });
    } catch (error: any) {
      console.error("Error getting tenant details:", error);
      res.status(500).json({ message: error.message || "Failed to get tenant details" });
    }
  });
}
