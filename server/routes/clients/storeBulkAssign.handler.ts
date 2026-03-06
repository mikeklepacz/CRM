import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { buildSheetRange } from "../../services/sheets/a1Range";

export async function handleStoreBulkAssign(req: any, res: any, deps: any): Promise<any> {
  try {
    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const { storeLinks, agentName } = req.body;

    if (!storeLinks || !Array.isArray(storeLinks) || storeLinks.length === 0) {
      return res.status(400).json({ message: "Store links array is required" });
    }
    if (!agentName || agentName.trim().length === 0) {
      return res.status(400).json({ message: "Agent name is required" });
    }

    const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
    const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");

    if (!trackerSheet) {
      return res.status(404).json({ message: "Commission Tracker sheet not found" });
    }

    const trackerRows = await googleSheets.readSheetData(
      trackerSheet.spreadsheetId,
      buildSheetRange(trackerSheet.sheetName, "A:ZZ")
    );

    if (trackerRows.length === 0) {
      return res.status(404).json({ message: "Commission Tracker sheet is empty" });
    }

    const trackerHeaders = trackerRows[0];
    const agentNameIndex = trackerHeaders.findIndex((h) => h.toLowerCase() === "agent name");
    const linkIndex = trackerHeaders.findIndex((h) => h.toLowerCase() === "link");

    if (agentNameIndex === -1) {
      return res.status(404).json({ message: "Agent Name column not found in Commission Tracker" });
    }
    if (linkIndex === -1) {
      return res.status(404).json({ message: "Link column not found in Commission Tracker" });
    }

    const agentColumnLetter = String.fromCharCode(65 + agentNameIndex);
    const batchUpdates: { range: string; values: any[][] }[] = [];
    let updatedCount = 0;

    trackerRows.slice(1).forEach((row, index) => {
      const rowLink = row[linkIndex] || "";
      const normalizedRowLink = normalizeLink(rowLink.toString().trim());
      const rowIndex = index + 2;

      const matchesAnyLink = storeLinks.some((storeLink) => {
        const normalizedStoreLink = normalizeLink(storeLink.toString().trim());
        return normalizedRowLink === normalizedStoreLink;
      });

      if (matchesAnyLink) {
        batchUpdates.push({
          range: buildSheetRange(trackerSheet.sheetName, `${agentColumnLetter}${rowIndex}`),
          values: [[agentName]],
        });
        updatedCount++;
      }
    });

    if (batchUpdates.length > 0) {
      for (const update of batchUpdates) {
        await googleSheets.writeSheetData(trackerSheet.spreadsheetId, update.range, update.values);
      }
    }

    deps.clearUserCache(userId);

    res.json({
      success: true,
      message: `Successfully assigned ${agentName} to ${updatedCount} store(s) in Commission Tracker`,
      updatedCount,
    });
  } catch (error: any) {
    console.error("Error bulk assigning agent:", error);
    res.status(500).json({ message: error.message || "Failed to bulk assign agent" });
  }
}
