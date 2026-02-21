import * as googleSheets from "../../../googleSheets";
import { storage } from "../../../storage";

export async function cleanupTrackerRows(params: {
  wooOrders: any[];
  reqUser: any;
}): Promise<number> {
  const { wooOrders, reqUser } = params;
  let trackerRowsDeleted = 0;

  try {
    const sheets = await storage.getAllActiveGoogleSheets(reqUser.tenantId);
    const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
    if (!trackerSheet) return trackerRowsDeleted;

    const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`);
    if (trackerRows.length === 0) return trackerRowsDeleted;

    const trackerHeaders = trackerRows[0];
    const transactionIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'transaction id');
    if (transactionIdIndex === -1) return trackerRowsDeleted;

    const wooOrderIds = new Set(wooOrders.map((o: any) => o.id.toString()));
    const rowsToDelete: number[] = [];

    for (let i = 1; i < trackerRows.length; i++) {
      const rowTransactionId = trackerRows[i][transactionIdIndex]?.toString().trim();
      if (!rowTransactionId) continue;
      if (!wooOrderIds.has(rowTransactionId)) rowsToDelete.push(i + 1);
    }

    for (const rowIndex of rowsToDelete.reverse()) {
      await googleSheets.deleteSheetRow(trackerSheet.spreadsheetId, trackerSheet.sheetId!, rowIndex);
      trackerRowsDeleted++;
    }
  } catch (cleanupError: any) {
    console.error('Error cleaning up Commission Tracker:', cleanupError);
  }

  return trackerRowsDeleted;
}
