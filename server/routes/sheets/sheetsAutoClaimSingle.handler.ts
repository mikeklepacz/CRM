import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { createBasicTrackerRow, verifyTrackerRowExists } from "./sheetsTrackerHelpers";

export async function handleSheetsAutoClaimSingle(req: any, res: any): Promise<any> {
  try {
    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const { link } = req.body;

    if (!link) {
      return res.status(400).json({ message: "Link is required" });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.agentName) {
      return res.status(400).json({ message: "Agent name not set in profile" });
    }

    const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
    const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");
    if (!trackerSheet) {
      return res.status(404).json({ message: "Commission Tracker sheet not found" });
    }

    const { spreadsheetId, sheetName } = trackerSheet;
    const rowExists = await verifyTrackerRowExists(spreadsheetId, sheetName, link);
    if (!rowExists) {
      const created = await createBasicTrackerRow(spreadsheetId, sheetName, link, user.agentName);
      if (!created) {
        return res.status(500).json({ message: "Failed to create tracker row. Please try again." });
      }
    }

    const trackerRows = await googleSheets.readSheetData(spreadsheetId, `${sheetName}!A:ZZ`);
    const trackerHeaders = trackerRows[0];
    const trackerLinkIndex = trackerHeaders.findIndex((h) => h.toLowerCase() === "link");
    const trackerAgentIndex = trackerHeaders.findIndex((h) => h.toLowerCase() === "agent name");

    if (trackerLinkIndex === -1) {
      return res.status(400).json({ message: "Link column not found in tracker" });
    }

    const normalizedInputLink = normalizeLink(link);
    let rowIndex = -1;
    for (let i = 1; i < trackerRows.length; i++) {
      const rowLink = trackerRows[i][trackerLinkIndex];
      if (rowLink && normalizeLink(rowLink) === normalizedInputLink) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      return res.status(500).json({
        message: "Tracker row was created but cannot be found. Please refresh and try again.",
      });
    }

    if (trackerAgentIndex !== -1) {
      const agentColLetter = String.fromCharCode(65 + trackerAgentIndex);
      const agentCellRange = `${sheetName}!${agentColLetter}${rowIndex}`;
      await googleSheets.writeSheetData(spreadsheetId, agentCellRange, [[user.agentName]]);
    }

    await googleSheets.writeCommissionTrackerTimestamp(spreadsheetId, sheetName, rowIndex, "O");
    res.json({ message: "Store claimed in Commission Tracker (Agent Name in Store DB will auto-sync)", claimed: true });
  } catch (error: any) {
    console.error("Error auto-claiming store:", error);
    res.status(500).json({ message: error.message || "Failed to auto-claim store" });
  }
}
