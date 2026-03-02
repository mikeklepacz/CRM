import type { Express } from "express";
import { storage } from "../../storage";
import type { SuperAdminTenantSheetsDeps } from "./superAdminTenantSheets.types";

export function registerSuperAdminTenantSheetsSyncExportRoute(app: Express, deps: SuperAdminTenantSheetsDeps): void {
  app.post(
    "/api/super-admin/tenants/:tenantId/sheets/:id/sync/export",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId, id } = req.params;
        const sheet = await storage.getGoogleSheetById(id, tenantId);
        if (!sheet) {
          return res.status(404).json({ message: "Sheet not found" });
        }

        await storage.updateGoogleSheetLastSync(id);
        res.json({ message: "Export complete" });
      } catch (error: any) {
        console.error("Error exporting to sheet:", error);
        res.status(500).json({ message: error.message || "Failed to export data" });
      }
    }
  );
}
