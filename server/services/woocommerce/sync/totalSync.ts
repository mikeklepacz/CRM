import * as googleSheets from "../../../googleSheets";
import { storage } from "../../../storage";
import { columnIndexToLetter } from "./utils";

export async function syncTotals(params: { tenantId: string; reqUser: any }): Promise<number> {
  const { tenantId, reqUser } = params;
  let totalsUpdated = 0;

  let trackerSheet: any = null;
  let trackerRows: any[][] = [];
  let trackerHeaders: string[] = [];

  try {
    const sheets = await storage.getAllActiveGoogleSheets(reqUser.tenantId);
    trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
    if (!trackerSheet) return totalsUpdated;

    trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`);
    if (trackerRows.length === 0) return totalsUpdated;
    trackerHeaders = trackerRows[0];

    const orderIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'order id');
    const totalIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'total');
    if (orderIdIndex === -1 || totalIndex === -1) return totalsUpdated;

    const allLocalOrders = await storage.getAllOrders(tenantId);

    for (const localOrder of allLocalOrders) {
      if (!localOrder.total) continue;
      const orderNumberStr = String(localOrder.orderNumber || '').trim();

      for (let i = 1; i < trackerRows.length; i++) {
        const sheetOrderId = String(trackerRows[i][orderIdIndex] || '').trim();
        if (sheetOrderId !== orderNumberStr) continue;

        const rowNumber = i + 1;
        const totalCellRange = `${trackerSheet.sheetName}!${columnIndexToLetter(totalIndex)}${rowNumber}`;
        const orderTotal = parseFloat(localOrder.total);
        if (!isNaN(orderTotal)) {
          await googleSheets.writeSheetData(trackerSheet.spreadsheetId, totalCellRange, [[orderTotal.toFixed(2)]]);
          totalsUpdated++;
        }
        break;
      }
    }
  } catch (error: any) {
    console.error('Total column sync error:', error.message);
  }

  return totalsUpdated;
}
