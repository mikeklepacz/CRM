import type { Express } from "express";
import type { OrgAdminCoreRouteDeps } from "./orgAdminCore.types";
import { storage } from "../../storage";

export function registerOrgAdminSettingsGetRoute(app: Express, deps: OrgAdminCoreRouteDeps): void {
  app.get("/api/org-admin/settings", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const tenantId = req.user.tenantId;
          const tenant = await storage.getTenantById(tenantId);
          if (!tenant) {
              return res.status(404).json({ message: "Tenant not found" });
          }
          res.json({ tenant });
      }
      catch (error: any) {
          console.error("Error getting tenant settings:", error);
          res.status(500).json({ message: error.message || "Failed to get settings" });
      }
  });
}
