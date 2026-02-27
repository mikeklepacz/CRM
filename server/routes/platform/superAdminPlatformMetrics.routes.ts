import type { Express } from "express";
import { storage } from "../../storage";
import type { SuperAdminTenantsDeps } from "./superAdminTenants.types";

export function registerSuperAdminPlatformMetricsRoute(app: Express, deps: SuperAdminTenantsDeps): void {
  app.get("/api/super-admin/metrics", deps.requireSuperAdmin, async (_req: any, res) => {
    try {
      const metrics = await storage.getPlatformMetrics();
      res.json(metrics);
    } catch (error: any) {
      console.error("Error getting platform metrics:", error);
      res.status(500).json({ message: error.message || "Failed to get platform metrics" });
    }
  });
}
