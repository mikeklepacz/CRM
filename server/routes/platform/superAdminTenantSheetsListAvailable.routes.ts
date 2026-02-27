import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import type { SuperAdminTenantSheetsDeps } from "./superAdminTenantSheets.types";

export function registerSuperAdminTenantSheetsListAvailableRoute(app: Express, deps: SuperAdminTenantSheetsDeps): void {
  app.get("/api/super-admin/tenants/:tenantId/sheets/list", deps.requireSuperAdmin, async (_req: any, res) => {
    try {
      const sheets = await googleSheets.listSpreadsheets();
      res.json(sheets);
    } catch (error: any) {
      console.error("Error listing available sheets:", error);
      res.status(500).json({ message: error.message || "Failed to list sheets" });
    }
  });
}
