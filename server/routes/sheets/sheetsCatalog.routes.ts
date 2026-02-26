import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

type Deps = {
  isAdmin: any;
  isAuthenticatedCustom: any;
  clearUserCache: (userId: string) => void;
};

export function registerSheetsCatalogRoutes(app: Express, deps: Deps): void {
  app.get("/api/sheets/list", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const sheets = await googleSheets.listSpreadsheets();
      res.json(sheets);
    } catch (error: any) {
      console.error("Error listing sheets:", error);
      res.status(500).json({ message: error.message || "Failed to list sheets" });
    }
  });

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

  app.get("/api/sheets/active", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      res.json(sheets.length > 0 ? sheets[0] : null);
    } catch (error: any) {
      console.error("Error getting active sheets:", error);
      res.status(500).json({ message: error.message || "Failed to get active sheets" });
    }
  });

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

  app.get("/api/sheets", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      res.json({ sheets });
    } catch (error: any) {
      console.error("Error fetching sheets:", error);
      res.status(500).json({ message: error.message || "Failed to fetch sheets" });
    }
  });

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

  app.post("/api/sheets/refresh", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");

      if (trackerSheet) {
        const syncResult = await googleSheets.syncCommissionTrackerToPostgres(trackerSheet.id, req.user.tenantId);
        console.log("📊 Sync result:", syncResult);
      } else {
        console.log("⚠️ No Commission Tracker sheet found, skipping sync");
      }

      deps.clearUserCache(userId);
      res.json({ message: "Sync completed and cache cleared successfully" });
    } catch (error: any) {
      console.error("Error during refresh:", error);
      res.status(500).json({ message: error.message || "Failed to refresh data" });
    }
  });

  app.post("/api/sheets/:id/disconnect", deps.isAuthenticatedCustom, deps.isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.disconnectGoogleSheet(id);
      res.json({ message: "Sheet disconnected successfully" });
    } catch (error: any) {
      console.error("Error disconnecting sheet:", error);
      res.status(500).json({ message: error.message || "Failed to disconnect sheet" });
    }
  });
}
