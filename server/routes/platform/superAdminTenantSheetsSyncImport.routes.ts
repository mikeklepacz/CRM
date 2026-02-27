import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import type { SuperAdminTenantSheetsDeps } from "./superAdminTenantSheets.types";

export function registerSuperAdminTenantSheetsSyncImportRoute(app: Express, deps: SuperAdminTenantSheetsDeps): void {
  app.post(
    "/api/super-admin/tenants/:tenantId/sheets/:id/sync/import",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId, id } = req.params;
        const sheet = await storage.getGoogleSheetById(id, tenantId);
        if (!sheet) {
          return res.status(404).json({ message: "Sheet not found" });
        }

        const range = `${sheet.sheetName}!A:ZZ`;
        const rows = await googleSheets.readSheetData(sheet.spreadsheetId, range);

        if (rows.length === 0) {
          return res.json({ message: "No data to import", imported: 0 });
        }

        const headers = rows[0];
        const data = rows.slice(1).map((row: any[], index: number) => {
          const obj: any = { _rowIndex: index + 2 };
          headers.forEach((header: string, i: number) => {
            obj[header] = row[i] || "";
          });
          return obj;
        });

        await storage.updateGoogleSheetLastSync(id);
        res.json({ message: "Import complete", imported: data.length });
      } catch (error: any) {
        console.error("Error importing from sheet:", error);
        res.status(500).json({ message: error.message || "Failed to import data" });
      }
    }
  );
}
