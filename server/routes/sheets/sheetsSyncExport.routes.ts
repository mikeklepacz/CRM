import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import type { SheetsSyncDeps } from "./sheetsSync.types";

export function registerSheetsSyncExportRoute(app: Express, deps: SheetsSyncDeps): void {
  app.post("/api/sheets/:id/sync/export", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const sheet = await storage.getGoogleSheetById(id, tenantId);
      if (!sheet) {
        return res.status(400).json({ message: "Google Sheet not found" });
      }

      const headerRange = `${sheet.sheetName}!1:1`;
      const headerRows = await googleSheets.readSheetData(sheet.spreadsheetId, headerRange);

      if (!headerRows || headerRows.length === 0) {
        return res.status(400).json({ message: "Cannot read sheet headers" });
      }

      const headers = headerRows[0];
      const clients = await storage.getAllClients(tenantId);
      for (const client of clients) {
        if (client.googleSheetRowId && client.uniqueIdentifier) {
          const range = `${sheet.sheetName}!A${client.googleSheetRowId}`;
          const row = googleSheets.convertObjectsToSheetRows(headers, [client.data])[0];
          await googleSheets.writeSheetData(sheet.spreadsheetId, range, [row]);
        }
      }

      await storage.updateGoogleSheetLastSync(sheet.id);
      res.json({ message: "Export completed", updated: clients.length });
    } catch (error: any) {
      console.error("Error exporting to sheet:", error);
      res.status(500).json({ message: error.message || "Export failed" });
    }
  });
}
