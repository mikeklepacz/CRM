import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import type { SheetsCatalogDeps } from "./sheetsCatalog.types";

export function registerSheetsConnectRoute(app: Express, deps: SheetsCatalogDeps): void {
  app.post("/api/sheets/connect", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { spreadsheetId, spreadsheetName, sheetName, uniqueIdentifierColumn } = req.body;

      if (!spreadsheetId || !sheetName || !uniqueIdentifierColumn) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const range = `${sheetName}!A1:ZZ1`;
      const headers = await googleSheets.readSheetData(spreadsheetId, range);

      if (!headers || headers.length === 0) {
        return res.status(400).json({ message: "Sheet is empty or not found" });
      }

      const headerRow = headers[0];
      const hasIdentifier = headerRow.some((h: string) => h.toLowerCase() === uniqueIdentifierColumn.toLowerCase());

      if (!hasIdentifier) {
        return res.status(400).json({
          message: `Column "${uniqueIdentifierColumn}" not found in sheet. Available columns: ${headerRow.join(", ")}`,
        });
      }

      const { sheetPurpose = "clients" } = req.body;
      const connection = await storage.createGoogleSheetConnection({
        tenantId: req.user.tenantId,
        spreadsheetId,
        spreadsheetName: spreadsheetName || spreadsheetId,
        sheetName,
        sheetPurpose,
        uniqueIdentifierColumn,
        connectedBy: userId,
        syncStatus: "active",
      });

      res.json({ message: "Sheet connected successfully", connection });
    } catch (error: any) {
      console.error("Error connecting sheet:", error);
      res.status(500).json({ message: error.message || "Failed to connect sheet" });
    }
  });
}
