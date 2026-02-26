import type { Express } from "express";
import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { createBasicTrackerRow, verifyTrackerRowExists } from "./sheetsTrackerHelpers";

type Deps = {
  isAuthenticatedCustom: any;
  clearUserCache: (userId: string) => void;
};

export function registerSheetsClaimStoreRoutes(app: Express, deps: Deps): void {
  app.post("/api/sheets/:id/claim-store", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { linkValue, column, value, joinColumn } = req.body;

      if (!linkValue || !joinColumn) {
        return res.status(400).json({ message: "Link value and join column are required" });
      }
      if (!user?.agentName) {
        return res.status(400).json({ message: "Agent name not set in profile" });
      }

      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");
      if (!trackerSheet) {
        return res.status(404).json({ message: "Commission Tracker not found" });
      }

      const { spreadsheetId, sheetName } = trackerSheet;
      const rowExists = await verifyTrackerRowExists(spreadsheetId, sheetName, linkValue);
      if (!rowExists) {
        const created = await createBasicTrackerRow(spreadsheetId, sheetName, linkValue, user.agentName);
        if (!created) {
          return res.status(500).json({ message: "Failed to create tracker row. Please try again." });
        }
      }

      const rows = await googleSheets.readSheetData(spreadsheetId, `${sheetName}!A:ZZ`);
      const headers = rows[0] || [];
      const linkColumnIndex = headers.findIndex((h) => h.toLowerCase() === joinColumn.toLowerCase());
      if (linkColumnIndex === -1) {
        return res.status(400).json({ message: "Link column not found in Commission Tracker" });
      }

      const normalizedInputLink = normalizeLink(linkValue.trim());
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        const rowLink = rows[i][linkColumnIndex];
        const normalizedRowLink = rowLink ? normalizeLink(rowLink.toString().trim()) : "";
        if (rowLink && normalizedRowLink === normalizedInputLink) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) {
        return res.status(500).json({
          message: "Tracker row was created but cannot be found. Please refresh and try again.",
        });
      }

      const agentNameIndex = headers.findIndex((h) => h.toLowerCase() === "agent name");
      if (agentNameIndex !== -1) {
        const agentColLetter = String.fromCharCode(65 + agentNameIndex);
        await googleSheets.writeSheetData(spreadsheetId, `${sheetName}!${agentColLetter}${rowIndex}`, [[user.agentName]]);
      }

      if (column && value !== undefined) {
        const colIndex = headers.findIndex((h) => h.toLowerCase() === column.toLowerCase());
        if (colIndex !== -1) {
          const columnLetter = String.fromCharCode(65 + colIndex);
          await googleSheets.writeSheetData(spreadsheetId, `${sheetName}!${columnLetter}${rowIndex}`, [[value || ""]]);
        }
      }

      deps.clearUserCache(userId);
      res.json({ message: "Store claimed in Commission Tracker (Agent Name in Store DB will auto-sync)", claimed: true });
    } catch (error: any) {
      console.error("Error claiming store:", error);
      res.status(500).json({ message: error.message || "Failed to claim store" });
    }
  });
}
