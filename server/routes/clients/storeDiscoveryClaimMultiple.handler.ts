import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { buildSheetRange } from "../../services/sheets/a1Range";

export async function handleStoreDiscoveryClaimMultiple(req: any, res: any, deps: any): Promise<any> {
  try {
    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const user = await storage.getUser(userId);
    const agentName = user?.agentName ||
      (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email)?.trim() ||
      "Unknown Agent";
    const { storeLinks, dbaName, storeSheetId, trackerSheetId } = req.body;
    if (!storeLinks || !Array.isArray(storeLinks) || storeLinks.length === 0) {
      return res.status(400).json({ message: "Store links array is required" });
    }
    if (!dbaName || dbaName.trim().length === 0) {
      return res.status(400).json({ message: "DBA name is required" });
    }
    if (!storeSheetId || !trackerSheetId) {
      return res.status(400).json({
        message: "Both Store Database and Commission Tracker sheet IDs are required",
      });
    }
    const storeSheet = await storage.getGoogleSheetById(storeSheetId, req.user.tenantId);
    const trackerSheet = await storage.getGoogleSheetById(trackerSheetId, req.user.tenantId);
    if (!storeSheet || !trackerSheet) {
      return res.status(404).json({ message: "One or both sheets not found" });
    }
    const storeRows = await googleSheets.readSheetData(
      storeSheet.spreadsheetId,
      buildSheetRange(storeSheet.sheetName, "A:ZZ")
    );
    if (storeRows.length === 0) {
      return res.status(404).json({ message: "Store Database is empty" });
    }
    const storeHeaders = storeRows[0];
    const storeLinkIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === "link");
    const storeDbaIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === "dba");
    const storeAgentIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === "agent name" || h.toLowerCase() === "agent");
    console.log("[CLAIM-MULTIPLE] Store Database headers:", storeHeaders);
    console.log("[CLAIM-MULTIPLE] Column indices - Link:", storeLinkIndex, "DBA:", storeDbaIndex, "Agent:", storeAgentIndex);
    if (storeLinkIndex === -1) {
      return res.status(404).json({ message: "Link column not found in Store Database" });
    }
    const trackerRows = await googleSheets.readSheetData(
      trackerSheet.spreadsheetId,
      buildSheetRange(trackerSheet.sheetName, "A:ZZ")
    );
    const trackerHeaders = trackerRows.length > 0 ? trackerRows[0] : [];
    const trackerLinkIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === "link");
    const trackerAgentIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === "agent" || h.toLowerCase() === "agent name");
    const trackerDbaIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === "dba");
    if (trackerLinkIndex === -1) {
      return res.status(404).json({ message: "Link column not found in Commission Tracker" });
    }
    let updatedTrackerCount = 0;
    let createdTrackerCount = 0;
    let skippedCount = 0;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const writeDelayMs = 200;
    for (let idx = 0; idx < storeLinks.length; idx++) {
      const storeLink = storeLinks[idx];
      const normalizedLink = normalizeLink(storeLink);
      let trackerRowIndex = -1;
      for (let i = 1; i < trackerRows.length; i++) {
        if (normalizeLink(trackerRows[i][trackerLinkIndex] || "") === normalizedLink) {
          trackerRowIndex = i + 1;
          break;
        }
      }
      if (trackerRowIndex !== -1) {
        if (trackerAgentIndex !== -1) {
          const agentColumnLetter = String.fromCharCode(65 + trackerAgentIndex);
          await googleSheets.writeSheetData(
            trackerSheet.spreadsheetId,
            buildSheetRange(trackerSheet.sheetName, `${agentColumnLetter}${trackerRowIndex}`),
            [[agentName]]
          );
          await delay(writeDelayMs);
        }
        if (trackerDbaIndex !== -1) {
          const dbaColumnLetter = String.fromCharCode(65 + trackerDbaIndex);
          await googleSheets.writeSheetData(
            trackerSheet.spreadsheetId,
            buildSheetRange(trackerSheet.sheetName, `${dbaColumnLetter}${trackerRowIndex}`),
            [[dbaName]]
          );
          await delay(writeDelayMs);
        }
        updatedTrackerCount++;
      }
      else {
        const newTrackerRow = new Array(trackerHeaders.length).fill("");
        if (trackerLinkIndex !== -1)
          newTrackerRow[trackerLinkIndex] = storeLink;
        if (trackerAgentIndex !== -1)
          newTrackerRow[trackerAgentIndex] = agentName;
        if (trackerDbaIndex !== -1)
          newTrackerRow[trackerDbaIndex] = dbaName;
        const statusIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === "status");
        if (statusIndex !== -1) {
          newTrackerRow[statusIndex] = "Claimed";
        }
        await googleSheets.appendSheetData(
          trackerSheet.spreadsheetId,
          buildSheetRange(trackerSheet.sheetName, "A:ZZ"),
          [newTrackerRow]
        );
        await delay(writeDelayMs);
        createdTrackerCount++;
      }
    }
    deps.clearUserCache(userId);
    res.json({
      message: "Successfully claimed multiple locations in Commission Tracker",
      updatedTrackerCount,
      createdTrackerCount,
      skippedCount,
      total: storeLinks.length,
      warnings: trackerDbaIndex === -1 ? ["DBA column not found in Commission Tracker - DBA not updated"] : [],
    });
  }
  catch (error: any) {
    console.error("Error claiming multiple stores:", error);
    res.status(500).json({ message: error.message || "Failed to claim stores" });
  }
}
