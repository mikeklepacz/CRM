import * as googleSheets from "../../../googleSheets";
import { storage } from "../../../storage";

type StoreMetadata = {
  link?: string;
};

type Params = {
  tenantId: string;
  userId: string;
  storeMetadata: StoreMetadata | null;
};

export async function autoClaimStoreOnReminderCreate(params: Params): Promise<void> {
  const { tenantId, userId, storeMetadata } = params;
  const linkValue = storeMetadata?.link;
  if (!linkValue) return;

  const user = await storage.getUser(userId);
  if (!user || user.role === "admin" || !user.agentName) return;

  const sheets = await storage.getAllActiveGoogleSheets(tenantId);
  const trackerSheet = sheets.find((sheet) => sheet.sheetPurpose === "commissions");
  if (!trackerSheet) return;

  const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
  const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
  if (trackerRows.length === 0) return;

  const trackerHeaders = trackerRows[0];
  const trackerLinkIndex = trackerHeaders.findIndex((header) => header.toLowerCase() === "link");
  const trackerAgentIndex = trackerHeaders.findIndex((header) => header.toLowerCase() === "agent name");

  let existingTrackerRow = -1;
  for (let rowIndex = 1; rowIndex < trackerRows.length; rowIndex++) {
    if (trackerRows[rowIndex][trackerLinkIndex] === linkValue) {
      existingTrackerRow = rowIndex + 1;
      break;
    }
  }

  if (existingTrackerRow > 0) {
    if (trackerAgentIndex !== -1) {
      const agentColLetter = String.fromCharCode(65 + trackerAgentIndex);
      const agentCellRange = `${trackerSheet.sheetName}!${agentColLetter}${existingTrackerRow}`;
      await googleSheets.writeSheetData(trackerSheet.spreadsheetId, agentCellRange, [[user.agentName]]);
    }
    return;
  }

  const newTrackerRow = new Array(trackerHeaders.length).fill("");
  if (trackerLinkIndex !== -1) newTrackerRow[trackerLinkIndex] = linkValue;
  if (trackerAgentIndex !== -1) newTrackerRow[trackerAgentIndex] = user.agentName;
  await googleSheets.appendSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}`, [newTrackerRow]);
}
