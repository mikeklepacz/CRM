import type { Express } from "express";
import { storage } from "../../storage";
import type { SuperAdminTenantSheetsDeps } from "./superAdminTenantSheets.types";

export function registerSuperAdminTenantSheetsDisconnectRoute(app: Express, deps: SuperAdminTenantSheetsDeps): void {
  app.post(
    "/api/super-admin/tenants/:tenantId/sheets/:id/disconnect",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId, id } = req.params;
        const sheet = await storage.getGoogleSheetById(id, tenantId);
        if (!sheet) {
          return res.status(404).json({ message: "Sheet not found for this tenant" });
        }
        await storage.disconnectGoogleSheet(id);
        res.json({ success: true });
      } catch (error: any) {
        console.error("Error disconnecting sheet:", error);
        res.status(500).json({ message: error.message || "Failed to disconnect sheet" });
      }
    }
  );
}
