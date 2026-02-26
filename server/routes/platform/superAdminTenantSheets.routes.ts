import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export function registerSuperAdminTenantSheetsRoutes(
  app: Express,
  deps: { requireSuperAdmin: any }
): void {
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

  app.get("/api/super-admin/tenants/:tenantId/sheets/list", deps.requireSuperAdmin, async (_req: any, res) => {
    try {
      const sheets = await googleSheets.listSpreadsheets();
      res.json(sheets);
    } catch (error: any) {
      console.error("Error listing available sheets:", error);
      res.status(500).json({ message: error.message || "Failed to list sheets" });
    }
  });

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

  app.post(
    "/api/super-admin/tenants/:tenantId/sheets/:id/disconnect",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId, id } = req.params;
        const sheet = await storage.getGoogleSheetById(id, tenantId);
        if (!sheet) {
          return res.status(404).json({ message: "Sheet not found for this tenant" });
        }
        await storage.disconnectGoogleSheet(id);
        res.json({ success: true });
      } catch (error: any) {
        console.error("Error disconnecting sheet:", error);
        res.status(500).json({ message: error.message || "Failed to disconnect sheet" });
      }
    }
  );

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

  app.post(
    "/api/super-admin/tenants/:tenantId/sheets/:id/sync/export",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId, id } = req.params;
        const sheet = await storage.getGoogleSheetById(id, tenantId);
        if (!sheet) {
          return res.status(404).json({ message: "Sheet not found" });
        }

        await storage.updateGoogleSheetLastSync(id);
        res.json({ message: "Export complete" });
      } catch (error: any) {
        console.error("Error exporting to sheet:", error);
        res.status(500).json({ message: error.message || "Failed to export data" });
      }
    }
  );

  app.post(
    "/api/super-admin/tenants/:tenantId/sheets/:id/sync/bidirectional",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId, id } = req.params;
        const sheet = await storage.getGoogleSheetById(id, tenantId);
        if (!sheet) {
          return res.status(404).json({ message: "Sheet not found" });
        }

        await storage.updateGoogleSheetLastSync(id);
        res.json({ message: "Bidirectional sync complete" });
      } catch (error: any) {
        console.error("Error in bidirectional sync:", error);
        res.status(500).json({ message: error.message || "Failed to sync data" });
      }
    }
  );
}
