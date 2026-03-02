import type { Express } from "express";
import { insertTenantSchema } from "@shared/schema";
import { storage } from "../../storage";
import type { SuperAdminTenantsDeps } from "./superAdminTenants.types";

export function registerSuperAdminTenantsCreateRoute(app: Express, deps: SuperAdminTenantsDeps): void {
  app.post("/api/super-admin/tenants", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const parseResult = insertTenantSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid tenant data", errors: parseResult.error.errors });
      }
      const tenant = await storage.createTenant(parseResult.data);
      res.json({ tenant });
    } catch (error: any) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ message: error.message || "Failed to create tenant" });
    }
  });
}
