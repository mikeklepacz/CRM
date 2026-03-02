import type { Express } from "express";
import type { OrgAdminCoreRouteDeps } from "./orgAdminCore.types";
import { storage } from "../../storage";

export function registerOrgAdminSettingsUpdateRoute(app: Express, deps: OrgAdminCoreRouteDeps): void {
  app.patch("/api/org-admin/settings", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const tenantId = req.user.tenantId;
          const { settings } = req.body;
          if (!settings || typeof settings !== "object") {
              return res.status(400).json({ message: "Invalid settings object" });
          }
          const currentTenant = await storage.getTenantById(tenantId);
          const previousModules = currentTenant?.settings?.enabledModules || [];
          const newModules = settings.enabledModules || previousModules;
          if (settings.enabledModules) {
              const { handleModuleHardOff } = await import("../../services/moduleHardOff");
              const hardOffResults = await handleModuleHardOff(tenantId, previousModules, newModules);
              if (hardOffResults.length > 0) {
                  console.log(`[OrgAdmin] Module hard-off results for tenant ${tenantId}:`, hardOffResults);
              }
          }
          const updated = await storage.updateTenantSettings(tenantId, settings);
          res.json({ tenant: updated });
      }
      catch (error: any) {
          console.error("Error updating tenant settings:", error);
          res.status(500).json({ message: error.message || "Failed to update settings" });
      }
  });
}
