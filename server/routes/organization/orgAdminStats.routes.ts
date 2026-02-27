import type { Express } from "express";
import type { OrgAdminCoreRouteDeps } from "./orgAdminCore.types";
import { storage } from "../../storage";

export function registerOrgAdminStatsRoute(app: Express, deps: OrgAdminCoreRouteDeps): void {
  app.get("/api/org-admin/stats", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const tenantId = req.user.tenantId;
          const stats = await storage.getTenantStats(tenantId);
          res.json(stats);
      }
      catch (error: any) {
          console.error("Error getting tenant stats:", error);
          res.status(500).json({ message: error.message || "Failed to get stats" });
      }
  });
}
