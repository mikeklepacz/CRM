import { normalizeLink } from "../../../../shared/linkUtils";
import * as googleSheets from "../../../googleSheets";
import { storage } from "../../../storage";

export async function autoMatchOrders(params: {
  wooOrders: any[];
  reqUser: any;
}): Promise<number> {
  const { wooOrders, reqUser } = params;
  let autoMatched = 0;

  try {
    const sheets = await storage.getAllActiveGoogleSheets(reqUser.tenantId);
    const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
    const storeDbSheet = sheets.find(s => s.sheetPurpose === 'Store Database');

    if (trackerSheet && storeDbSheet) {
      const storeDbRows = await googleSheets.readSheetData(storeDbSheet.spreadsheetId, `${storeDbSheet.sheetName}!A:ZZ`);
      if (storeDbRows.length > 0) {
        const storeDbHeaders = storeDbRows[0];
        const storeDbLinkIndex = storeDbHeaders.findIndex(h => h.toLowerCase() === 'link');
        const storeDbEmailIndex = storeDbHeaders.findIndex(h => h.toLowerCase() === 'email');
        const storeDbAgentNameIndex = storeDbHeaders.findIndex(h => h.toLowerCase() === 'agent name');

        const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`);
        if (trackerRows.length > 0) {
          const trackerHeaders = trackerRows[0];
          const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
          const orderIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'order id');
          const transactionIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'transaction id');
          const trackerDateIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'date');
          const trackerPocEmailIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'poc email');
          const agentNameIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'agent name');

          for (const order of wooOrders) {
            if (!order.billing?.email) continue;
            const orderEmail = order.billing.email.toLowerCase().trim();
            const salesAgentMeta = order.meta_data?.find((m: any) => m.key === '_sales_agent');
            const salesAgentName = salesAgentMeta?.value || '';

            for (let i = 1; i < storeDbRows.length; i++) {
              const storeEmail = storeDbRows[i][storeDbEmailIndex]?.toLowerCase().trim();
              const storeAgentName = storeDbRows[i][storeDbAgentNameIndex]?.trim();
              const storeLink = storeDbRows[i][storeDbLinkIndex];

              if (storeEmail === orderEmail && storeAgentName) {
                const normalizedStoreLink = normalizeLink(storeLink);
                const currentOrderId = order.id.toString();
                let alreadyTracked = false;

                for (let j = 1; j < trackerRows.length; j++) {
                  const trackerLink = normalizeLink(trackerRows[j][linkIndex] || '');
                  const trackerTransactionId = trackerRows[j][transactionIdIndex] || '';
                  if (trackerLink === normalizedStoreLink && trackerTransactionId === currentOrderId) {
                    alreadyTracked = true;
                    break;
                  }
                }

                if (!alreadyTracked) {
                  const newRow: any[] = new Array(trackerHeaders.length).fill('');
                  if (linkIndex !== -1) newRow[linkIndex] = storeLink;
                  if (orderIdIndex !== -1) newRow[orderIdIndex] = order.number || order.id.toString();
                  if (transactionIdIndex !== -1) newRow[transactionIdIndex] = order.id.toString();
                  if (trackerDateIndex !== -1) newRow[trackerDateIndex] = new Date(order.date_created).toLocaleDateString('en-US');
                  if (trackerPocEmailIndex !== -1) newRow[trackerPocEmailIndex] = order.billing.email;
                  if (agentNameIndex !== -1 && salesAgentName) newRow[agentNameIndex] = salesAgentName;

                  await googleSheets.appendSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`, [newRow]);
                  autoMatched++;
                }
              }
            }
          }
        }
      }
    }
  } catch (autoMatchError: any) {
    console.error('Auto-matching error:', autoMatchError);
  }

  return autoMatched;
}
