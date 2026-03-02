import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import type { SheetsCatalogDeps } from "./sheetsCatalog.types";

export function registerSheetsDataByIdRoute(app: Express, deps: SheetsCatalogDeps): void {
  app.get("/api/sheets/:id/data", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const sheet = await storage.getGoogleSheetById(id, req.user.tenantId);
      if (!sheet) {
        return res.status(404).json({ message: "Google Sheet not found" });
      }

      const range = `${sheet.sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(sheet.spreadsheetId, range);

      if (rows.length === 0) {
        return res.json({ headers: [], data: [] });
      }

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj: any = { _rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || "";
        });
        return obj;
      });

      res.json({
        headers,
        data,
        sheetInfo: {
          id: sheet.id,
          spreadsheetName: sheet.spreadsheetName,
          sheetName: sheet.sheetName,
          sheetPurpose: sheet.sheetPurpose,
        },
      });
    } catch (error: any) {
      console.error("Error fetching sheet data:", error);
      res.status(500).json({ message: error.message || "Failed to fetch sheet data" });
    }
  });
}
