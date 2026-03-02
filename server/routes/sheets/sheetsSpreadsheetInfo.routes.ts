import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import type { SheetsCatalogDeps } from "./sheetsCatalog.types";

export function registerSheetsSpreadsheetInfoRoute(app: Express, deps: SheetsCatalogDeps): void {
  app.get("/api/sheets/:spreadsheetId/info", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { spreadsheetId } = req.params;
      const info = await googleSheets.getSpreadsheetInfo(spreadsheetId);
      res.json(info);
    } catch (error: any) {
      console.error("Error getting sheet info:", error);
      res.status(500).json({ message: error.message || "Failed to get sheet info" });
    }
  });
}
