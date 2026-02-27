import type { Express } from "express";
import type { SuperAdminTenantsDeps } from "./superAdminTenants.types";

export function registerSuperAdminSwitchTenantClearRoute(app: Express, deps: SuperAdminTenantsDeps): void {
  app.get("/api/super-admin/switch-tenant/clear", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      req.session.tenantOverrideId = null;
      req.session.tenantOverrideName = null;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error clearing tenant override:", error);
      res.status(500).json({ message: error.message || "Failed to clear tenant override" });
    }
  });
}
