import type { Express } from "express";
import { insertTenantSchema } from "@shared/schema";
import { storage } from "../../storage";
import type { SuperAdminTenantsDeps } from "./superAdminTenants.types";

export function registerSuperAdminTenantsPatchRoute(app: Express, deps: SuperAdminTenantsDeps): void {
  app.patch("/api/super-admin/tenants/:tenantId", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const parseResult = insertTenantSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid tenant data", errors: parseResult.error.errors });
      }
      const tenant = await storage.updateTenant(tenantId, parseResult.data);
      res.json({ tenant });
    } catch (error: any) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ message: error.message || "Failed to update tenant" });
    }
  });
}
