import type { Express } from "express";
import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
  clearUserCache: (userId: string) => void;
};

export function registerSheetsContactActionRoutes(app: Express, deps: Deps): void {
  app.post("/api/sheets/:id/claim-store-with-contact", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { linkValue, joinColumn, agent, status, followUpDate, nextAction, notes, pointOfContact } = req.body;

      if (!linkValue || !joinColumn) {
        return res.status(400).json({ message: "Link value and join column are required" });
      }

      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");
      if (!trackerSheet) {
        return res.status(404).json({ message: "Commission Tracker not found" });
      }

      const { spreadsheetId, sheetName } = trackerSheet;
      const rows = await googleSheets.readSheetData(spreadsheetId, `${sheetName}!A:ZZ`);
      const headers = rows[0] || [];

      const linkColumnIndex = headers.findIndex((h) => h.toLowerCase() === joinColumn.toLowerCase());
      if (linkColumnIndex === -1) {
        return res.status(400).json({ message: "Link column not found in Commission Tracker" });
      }

      const normalizedInputLink = normalizeLink(linkValue.trim());
      let existingRowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        const rowLink = rows[i][linkColumnIndex];
        const normalizedRowLink = rowLink ? normalizeLink(rowLink.toString().trim()) : "";
        if (rowLink && normalizedRowLink === normalizedInputLink) {
          existingRowIndex = i + 1;
          break;
        }
      }

      const updateCell = async (columnName: string, value: string) => {
        const colIndex = headers.findIndex((h) => h.toLowerCase() === columnName.toLowerCase());
        if (colIndex !== -1 && value !== undefined) {
          const columnLetter = String.fromCharCode(65 + colIndex);
          const cellRange = `${sheetName}!${columnLetter}${existingRowIndex}`;
          await googleSheets.writeSheetData(spreadsheetId, cellRange, [[value || ""]]);
        }
      };

      if (existingRowIndex !== -1) {
        const agentValue = agent || user?.agentName;
        if (agentValue) {
          await updateCell("agent name", agentValue);
        }
        await updateCell("status", status);
        await updateCell("follow-up date", followUpDate);
        await updateCell("followup", followUpDate);
        await updateCell("next action", nextAction);
        await updateCell("notes", notes);
        await updateCell("point of contact", pointOfContact);
        deps.clearUserCache(userId);
        return res.json({ message: "Contact action updated successfully in Commission Tracker", existingRow: true });
      }

      const newRow = headers.map(() => "");
      const setCell = (columnName: string, value: string) => {
        const index = headers.findIndex((h) => h.toLowerCase() === columnName.toLowerCase());
        if (index !== -1 && value) {
          newRow[index] = value;
        }
      };

      setCell(joinColumn, linkValue);
      const agentValue = agent || user?.agentName;
      if (agentValue) {
        setCell("agent name", agentValue);
      }
      setCell("status", status);
      setCell("follow-up date", followUpDate);
      setCell("followup", followUpDate);
      setCell("next action", nextAction);
      setCell("notes", notes);
      setCell("point of contact", pointOfContact);

      await googleSheets.appendSheetData(spreadsheetId, `${sheetName}!A:ZZ`, [newRow]);
      deps.clearUserCache(userId);

      res.json({ message: "Contact action saved and store claimed in Commission Tracker", newRow: true });
    } catch (error: any) {
      console.error("Error saving contact action:", error);
      res.status(500).json({ message: error.message || "Failed to save contact action" });
    }
  });

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
