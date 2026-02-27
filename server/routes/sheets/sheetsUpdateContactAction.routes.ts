import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import type { SheetsContactActionDeps } from "./sheetsContactAction.types";

export function registerSheetsUpdateContactActionRoute(app: Express, deps: SheetsContactActionDeps): void {
  app.put("/api/sheets/:id/update-contact-action", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { rowIndex, status, followUpDate, nextAction, notes, pointOfContact } = req.body;

      if (!rowIndex) {
        return res.status(400).json({ message: "Row index is required" });
      }

      const sheet = await storage.getGoogleSheetById(id, req.user.tenantId);
      if (!sheet) {
        return res.status(404).json({ message: "Google Sheet not found" });
      }

      const { spreadsheetId, sheetName } = sheet;
      const headerRows = await googleSheets.readSheetData(spreadsheetId, `${sheetName}!1:1`);
      const headers = headerRows[0] || [];

      const updateCell = async (columnName: string, value: string) => {
        const columnIndex = headers.findIndex((h) => h.toLowerCase() === columnName.toLowerCase());
        if (columnIndex !== -1 && value !== undefined) {
          const columnLetter = String.fromCharCode(65 + columnIndex);
          const cellRange = `${sheetName}!${columnLetter}${rowIndex}`;
          await googleSheets.writeSheetData(spreadsheetId, cellRange, [[value]]);
        }
      };

      await updateCell("status", status);
      await updateCell("follow-up date", followUpDate);
      await updateCell("followup", followUpDate);
      await updateCell("next action", nextAction);
      await updateCell("notes", notes);
      await updateCell("point of contact", pointOfContact);

      res.json({ message: "Contact action updated successfully" });
    } catch (error: any) {
      console.error("Error updating contact action:", error);
      res.status(500).json({ message: error.message || "Failed to update contact action" });
    }
  });
}
