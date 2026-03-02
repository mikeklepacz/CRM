import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import type { SheetsCatalogDeps } from "./sheetsCatalog.types";

export function registerSheetsListSpreadsheetsRoute(app: Express, deps: SheetsCatalogDeps): void {
  app.get("/api/sheets/list", deps.isAuthenticatedCustom, deps.isAdmin, async (_req: any, res) => {
    try {
      const sheets = await googleSheets.listSpreadsheets();
      res.json(sheets);
    } catch (error: any) {
      console.error("Error listing sheets:", error);
      res.status(500).json({ message: error.message || "Failed to list sheets" });
    }
  });
}
