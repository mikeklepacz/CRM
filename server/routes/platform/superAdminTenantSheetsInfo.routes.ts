import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import type { SuperAdminTenantSheetsDeps } from "./superAdminTenantSheets.types";

export function registerSuperAdminTenantSheetsInfoRoute(app: Express, deps: SuperAdminTenantSheetsDeps): void {
  app.get(
    "/api/super-admin/tenants/:tenantId/sheets/:spreadsheetId/info",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { spreadsheetId } = req.params;
        const info = await googleSheets.getSpreadsheetInfo(spreadsheetId);
        res.json(info);
      } catch (error: any) {
        console.error("Error getting spreadsheet info:", error);
        res.status(500).json({ message: error.message || "Failed to get spreadsheet info" });
      }
    }
  );
}
