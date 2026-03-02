import * as googleSheets from "../../../googleSheets";
import { storage } from "../../../storage";

export async function deleteMissingOrders(params: {
  wooOrders: any[];
  tenantId: string;
  reqUser: any;
}): Promise<number> {
  const { wooOrders, tenantId, reqUser } = params;
  const allLocalOrders = await storage.getAllOrders(tenantId);
  const wooOrderIds = new Set(wooOrders.map((o: any) => o.id.toString()));
  let deleted = 0;

  for (const localOrder of allLocalOrders) {
    if (!wooOrderIds.has(localOrder.id)) {
      console.log(`Deleting order ${localOrder.id} (no longer in WooCommerce)`);

      const orderCommissions = await storage.getCommissionsByOrder(localOrder.id, tenantId);
      const totalCommissionAmount = orderCommissions.reduce((sum, c) => sum + parseFloat(c.amount || '0'), 0);

      try {
        const sheets = await storage.getAllActiveGoogleSheets(reqUser.tenantId);
        const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

        if (trackerSheet) {
          const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
          const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

          if (trackerRows.length > 0) {
            const trackerHeaders = trackerRows[0];
            const transactionIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'transaction id');

            if (transactionIdIndex !== -1) {
              const rowsToDelete: number[] = [];

              for (let i = 1; i < trackerRows.length; i++) {
                const rowTransactionId = trackerRows[i][transactionIdIndex]?.toString().trim();
                const localOrderId = localOrder.id.toString().trim();
                if (rowTransactionId === localOrderId) rowsToDelete.push(i + 1);
              }

              for (const rowIndex of rowsToDelete.reverse()) {
                await googleSheets.deleteSheetRow(trackerSheet.spreadsheetId, (trackerSheet as any).sheetId!, rowIndex);
              }
            }
          }
        }
      } catch (sheetError: any) {
        console.error('Error deleting tracker sheet row:', sheetError);
      }

      if (localOrder.clientId) {
        try {
          const client = await storage.getClient(localOrder.clientId, tenantId);
          if (client) {
            const orderTotal = parseFloat(localOrder.total || '0');
            const currentTotalSales = parseFloat(client.totalSales || '0');
            const currentCommissionTotal = parseFloat(client.commissionTotal || '0');
            const newTotalSales = Math.max(0, currentTotalSales - orderTotal);
            const newCommissionTotal = Math.max(0, currentCommissionTotal - totalCommissionAmount);

            await storage.updateClient(client.id, client.tenantId, {
              totalSales: newTotalSales.toString(),
              commissionTotal: newCommissionTotal.toString()
            });
          }
        } catch (clientError: any) {
          console.error('Error updating client totals:', clientError);
        }
      }

      await storage.deleteOrder(localOrder.id, tenantId);
      deleted++;
    }
  }

  return deleted;
}
