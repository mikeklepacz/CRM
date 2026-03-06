import { normalizeLink } from "../../../../shared/linkUtils";
import * as googleSheets from "../../../googleSheets";
import { storage } from "../../../storage";
import { buildSheetRange } from "../../sheets/a1Range";
import { listStoreDatabaseSheets } from "../../sheets/storeDatabaseResolver";

export async function autoMatchOrders(params: {
  wooOrders: any[];
  reqUser: any;
}): Promise<number> {
  const { wooOrders, reqUser } = params;
  let autoMatched = 0;

  try {
    const sheets = await storage.getAllActiveGoogleSheets(reqUser.tenantId);
    const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
    const storeDbSheets = await listStoreDatabaseSheets(reqUser.tenantId);

    if (trackerSheet && storeDbSheets.length > 0) {
      type StoreDbRowData = {
        link: string;
        email: string;
        agentName: string;
      };
      const storeDbRowsFlattened: StoreDbRowData[] = [];
      for (const storeDbSheet of storeDbSheets) {
        const storeDbRows = await googleSheets.readSheetData(
          storeDbSheet.spreadsheetId,
          buildSheetRange(storeDbSheet.sheetName, "A:ZZ")
        );
        if (storeDbRows.length === 0) {
          continue;
        }
        const storeDbHeaders = storeDbRows[0];
        const storeDbLinkIndex = storeDbHeaders.findIndex(h => h.toLowerCase() === 'link');
        const storeDbEmailIndex = storeDbHeaders.findIndex(h => h.toLowerCase() === 'email');
        const storeDbAgentNameIndex = storeDbHeaders.findIndex(h => h.toLowerCase() === 'agent name');
        if (storeDbLinkIndex === -1 || storeDbEmailIndex === -1 || storeDbAgentNameIndex === -1) {
          continue;
        }

        for (let i = 1; i < storeDbRows.length; i++) {
          const link = (storeDbRows[i][storeDbLinkIndex] || "").toString().trim();
          const email = (storeDbRows[i][storeDbEmailIndex] || "").toString().toLowerCase().trim();
          const agentName = (storeDbRows[i][storeDbAgentNameIndex] || "").toString().trim();
          if (link && email) {
            storeDbRowsFlattened.push({ link, email, agentName });
          }
        }
      }

      const trackerRows = await googleSheets.readSheetData(
        trackerSheet.spreadsheetId,
        buildSheetRange(trackerSheet.sheetName, "A:ZZ")
      );
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

          for (const storeRow of storeDbRowsFlattened) {
            const storeEmail = storeRow.email;
            const storeAgentName = storeRow.agentName;
            const storeLink = storeRow.link;

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

                await googleSheets.appendSheetData(
                  trackerSheet.spreadsheetId,
                  buildSheetRange(trackerSheet.sheetName, "A:ZZ"),
                  [newRow]
                );
                autoMatched++;
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
