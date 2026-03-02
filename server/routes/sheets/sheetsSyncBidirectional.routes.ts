import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import type { SheetsSyncDeps } from "./sheetsSync.types";

export function registerSheetsSyncBidirectionalRoute(app: Express, deps: SheetsSyncDeps): void {
  app.post("/api/sheets/:id/sync/bidirectional", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const sheet = await storage.getGoogleSheetById(id, req.user.tenantId);
      if (!sheet) {
        return res.status(400).json({ message: "Google Sheet not found" });
      }

      const { spreadsheetId, sheetName, uniqueIdentifierColumn } = sheet;
      const rows = await googleSheets.readSheetData(spreadsheetId, `${sheetName}!A:ZZ`);

      if (rows.length === 0) {
        return res.status(400).json({ message: "Sheet is empty" });
      }

      const parsed = googleSheets.parseSheetDataToObjects(rows, uniqueIdentifierColumn);
      let created = 0;
      let updated = 0;

      for (const item of parsed) {
        const existing = await storage.getClientByUniqueIdentifier(item.uniqueId);
        if (existing) {
          await storage.updateClient(existing.id, req.user.tenantId, {
            data: item.data,
            googleSheetId: spreadsheetId,
            googleSheetRowId: item.rowIndex,
            lastSyncedAt: new Date(),
          });
          updated++;
        } else {
          await storage.createClient({
            uniqueIdentifier: item.uniqueId,
            googleSheetId: spreadsheetId,
            googleSheetRowId: item.rowIndex,
            data: item.data,
            status: "unassigned",
            lastSyncedAt: new Date(),
            tenantId: req.user.tenantId,
          });
          created++;
        }
      }

      await storage.updateGoogleSheetLastSync(sheet.id);
      res.json({
        message: "Bidirectional sync completed",
        imported: { created, updated },
        total: parsed.length,
      });
    } catch (error: any) {
      console.error("Error in bidirectional sync:", error);
      res.status(500).json({ message: error.message || "Sync failed" });
    }
  });
}
