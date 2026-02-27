import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { createBasicTrackerRow } from "./sheetsTrackerHelpers";

export async function handleSheetsClaimVcardExport(req: any, res: any, deps: any): Promise<any> {
  try {
    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const { storeLinks } = req.body;

    if (!storeLinks || !Array.isArray(storeLinks) || storeLinks.length === 0) {
      return res.status(400).json({ message: "Store links array is required" });
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
    const trackerRows = await googleSheets.readSheetData(spreadsheetId, `${sheetName}!A:ZZ`);
    if (trackerRows.length === 0) {
      return res.status(404).json({ message: "Commission Tracker is empty" });
    }

    const trackerHeaders = trackerRows[0];
    const trackerLinkIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === "link");
    const trackerAgentIndex = trackerHeaders.findIndex(
      (h: string) => h.toLowerCase() === "agent" || h.toLowerCase() === "agent name"
    );
    const trackerStatusIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === "status");
    const trackerTimeIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === "time");

    if (trackerLinkIndex === -1) {
      return res.status(404).json({ message: "Link column not found in Commission Tracker" });
    }

    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const WRITE_DELAY_MS = 200;

    for (const storeLink of storeLinks) {
      const normalizedLink = normalizeLink(storeLink);
      let trackerRowIndex = -1;
      for (let i = 1; i < trackerRows.length; i++) {
        if (normalizeLink(trackerRows[i][trackerLinkIndex] || "") === normalizedLink) {
          trackerRowIndex = i + 1;
          break;
        }
      }

      if (trackerRowIndex !== -1) {
        if (trackerStatusIndex !== -1) {
          const statusColumnLetter = String.fromCharCode(65 + trackerStatusIndex);
          await googleSheets.writeSheetData(spreadsheetId, `${sheetName}!${statusColumnLetter}${trackerRowIndex}`, [["Claimed"]]);
          await delay(WRITE_DELAY_MS);
        }

        if (trackerAgentIndex !== -1) {
          const agentColumnLetter = String.fromCharCode(65 + trackerAgentIndex);
          await googleSheets.writeSheetData(
            spreadsheetId,
            `${sheetName}!${agentColumnLetter}${trackerRowIndex}`,
            [[user.agentName]]
          );
          await delay(WRITE_DELAY_MS);
        }

        if (trackerTimeIndex !== -1) {
          const timeColumnLetter = String.fromCharCode(65 + trackerTimeIndex);
          await googleSheets.writeSheetData(
            spreadsheetId,
            `${sheetName}!${timeColumnLetter}${trackerRowIndex}`,
            [[new Date().toISOString()]]
          );
          await delay(WRITE_DELAY_MS);
        }

        updatedCount++;
      } else {
        const created = await createBasicTrackerRow(spreadsheetId, sheetName, storeLink, user.agentName);
        if (created) createdCount++;
        else skippedCount++;
        await delay(WRITE_DELAY_MS);
      }
    }

    deps.clearUserCache(userId);
    res.json({
      message: `Successfully claimed ${updatedCount + createdCount} stores via vCard export`,
      updated: updatedCount,
      created: createdCount,
      skipped: skippedCount,
      total: storeLinks.length,
    });
  } catch (error: any) {
    console.error("Error claiming stores via vCard export:", error);
    res.status(500).json({ message: error.message || "Failed to claim stores via vCard export" });
  }
}
