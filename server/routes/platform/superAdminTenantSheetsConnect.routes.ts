import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import type { SuperAdminTenantSheetsDeps } from "./superAdminTenantSheets.types";

export function registerSuperAdminTenantSheetsConnectRoute(app: Express, deps: SuperAdminTenantSheetsDeps): void {
  app.post("/api/super-admin/tenants/:tenantId/sheets/connect", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { spreadsheetId, spreadsheetName, sheetName, sheetPurpose, uniqueIdentifierColumn } = req.body;

      if (!spreadsheetId || !spreadsheetName || !sheetName || !sheetPurpose || !uniqueIdentifierColumn) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const range = `${sheetName}!A1:ZZ1`;
      const headers = await googleSheets.readSheetData(spreadsheetId, range);

      if (!headers || headers.length === 0) {
        return res.status(400).json({ message: "Sheet is empty or not found" });
      }

      const headerRow = headers[0];
      const hasIdentifier = headerRow.some(
        (h: string) => h.toLowerCase() === uniqueIdentifierColumn.toLowerCase()
      );

      if (!hasIdentifier) {
        return res.status(400).json({
          message: `Column "${uniqueIdentifierColumn}" not found in sheet. Available columns: ${headerRow.join(", ")}`,
        });
      }

      const connection = await storage.createGoogleSheetConnection({
        tenantId,
        spreadsheetId,
        spreadsheetName,
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
