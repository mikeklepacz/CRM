import type { Express } from "express";
import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { createBasicTrackerRow, verifyTrackerRowExists } from "./sheetsTrackerHelpers";

type Deps = {
  isAuthenticatedCustom: any;
  clearUserCache: (userId: string) => void;
};

export function registerSheetsTrackerUpsertRoutes(app: Express, deps: Deps): void {
  app.post("/api/sheets/tracker/upsert", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { link, updates } = req.body;

      if (!link || !updates) {
        return res.status(400).json({ message: "Link and updates are required" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!currentUser.agentName) {
        return res.status(400).json({
          message: "Agent Name is required in your profile to claim stores. Please set it in Settings.",
        });
      }

      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");

      if (!trackerSheet) {
        return res.status(404).json({ message: "Commission Tracker sheet not found" });
      }

      const { spreadsheetId, sheetName } = trackerSheet;
      const normalizedInputLink = normalizeLink(link.trim());
      const rowExists = await verifyTrackerRowExists(spreadsheetId, sheetName, link);

      if (!rowExists) {
        const created = await createBasicTrackerRow(spreadsheetId, sheetName, link, currentUser.agentName);
        if (!created) {
          return res.status(500).json({
            message: "Failed to create tracker row. Please try again.",
          });
        }
      }

      const range = `${sheetName}!A:ZZ`;
      let rows = await googleSheets.readSheetData(spreadsheetId, range);

      if (rows.length === 0) {
        return res.status(400).json({ message: "Tracker sheet is empty (no headers)" });
      }

      const headers = rows[0];
      const linkIndex = headers.findIndex((h) => h.toLowerCase() === "link");
      if (linkIndex === -1) {
        return res.status(400).json({ message: "Link column not found in tracker sheet" });
      }

      let rowIndex = -1;
      for (let i = rows.length - 1; i >= 1; i--) {
        const rowLink = rows[i][linkIndex];
        const normalizedRowLink = rowLink ? normalizeLink(rowLink.toString().trim()) : "";
        if (rowLink && normalizedRowLink === normalizedInputLink) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        rows = await googleSheets.readSheetData(spreadsheetId, range);
        for (let i = rows.length - 1; i >= 1; i--) {
          const rowLink = rows[i][linkIndex];
          const normalizedRowLink = rowLink ? normalizeLink(rowLink.toString().trim()) : "";
          if (rowLink && normalizedRowLink === normalizedInputLink) {
            rowIndex = i + 1;
            break;
          }
        }
      }

      if (rowIndex === -1) {
        return res.status(500).json({
          message: "Tracker row was created but cannot be found. Please refresh and try again.",
        });
      }

      for (const [column, value] of Object.entries(updates)) {
        const colIndex = headers.findIndex((h) => h.toLowerCase() === column.toLowerCase());
        if (colIndex !== -1) {
          const columnLetter = String.fromCharCode(65 + colIndex);
          const cellRange = `${sheetName}!${columnLetter}${rowIndex}`;
          await googleSheets.writeSheetData(spreadsheetId, cellRange, [[value]]);
        }
      }

      await googleSheets.writeCommissionTrackerTimestamp(spreadsheetId, sheetName, rowIndex, "P");
      deps.clearUserCache(userId);

      res.json({ message: "Tracker row saved successfully", rowIndex });
    } catch (error: any) {
      console.error("Error upserting tracker row:", error);
      res.status(500).json({ message: error.message || "Failed to upsert tracker row" });
    }
  });
}
