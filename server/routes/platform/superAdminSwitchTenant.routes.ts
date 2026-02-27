import type { Express } from "express";
import { storage } from "../../storage";
import type { SuperAdminTenantsDeps } from "./superAdminTenants.types";

export function registerSuperAdminSwitchTenantRoute(app: Express, deps: SuperAdminTenantsDeps): void {
  app.post("/api/super-admin/switch-tenant", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.body;
      if (!tenantId) {
        return res.status(400).json({ message: "tenantId is required" });
      }

      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      req.session.tenantOverrideId = tenantId;
      req.session.tenantOverrideName = tenant.name;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ success: true, tenantId, tenantName: tenant.name });
    } catch (error: any) {
      console.error("Error switching tenant:", error);
      res.status(500).json({ message: error.message || "Failed to switch tenant" });
    }
  });
}
