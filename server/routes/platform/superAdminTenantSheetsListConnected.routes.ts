import type { Express } from "express";
import { storage } from "../../storage";
import type { SuperAdminTenantSheetsDeps } from "./superAdminTenantSheets.types";

export function registerSuperAdminTenantSheetsListConnectedRoute(app: Express, deps: SuperAdminTenantSheetsDeps): void {
  app.get("/api/super-admin/tenants/:tenantId/sheets", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const sheets = await storage.getAllActiveGoogleSheets(tenantId);
      res.json({ sheets });
    } catch (error: any) {
      console.error("Error fetching connected sheets:", error);
      res.status(500).json({ message: error.message || "Failed to fetch connected sheets" });
    }
  });
}
