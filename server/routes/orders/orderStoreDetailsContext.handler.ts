import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export async function handleOrderStoreDetailsContext(req: any, res: any): Promise<any> {
  try {
    const { orderId } = req.params;
    const tenantId = req.user.tenantId;
    const order = await storage.getOrderById(orderId, tenantId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const sheets = await storage.getAllActiveGoogleSheets(tenantId);
    const storeSheet = sheets.find(s => s.sheetPurpose === "Store Database");
    const trackerSheet = sheets.find(s => s.sheetPurpose === "commissions");
    if (!trackerSheet) {
      return res.status(404).json({ message: "Commission Tracker sheet not found" });
    }

    const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
    const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
    if (!trackerRows.length) {
      return res.status(404).json({ message: "Commission Tracker sheet is empty" });
    }

    const trackerHeaders = trackerRows[0];
    const trackerLinkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === "link");
    const trackerTxIndex = trackerHeaders.findIndex(h => h.toLowerCase() === "transaction id");
    if (trackerLinkIndex === -1 || trackerTxIndex === -1) {
      return res.status(400).json({ message: "Tracker must have Link and Transaction ID columns" });
    }

    const trackerMatches: Array<{ row: any[]; rowIndex: number; link: string; normalizedLink: string }> = [];
    for (let i = 1; i < trackerRows.length; i++) {
      const tx = trackerRows[i][trackerTxIndex] || "";
      if (tx === orderId) {
        const link = trackerRows[i][trackerLinkIndex] || "";
        const normalizedLink = normalizeLink(link);
        if (normalizedLink) {
          trackerMatches.push({ row: trackerRows[i], rowIndex: i + 1, link, normalizedLink });
        }
      }
    }

    if (!trackerMatches.length) {
      return res.status(404).json({ message: "No tracker row found for this order" });
    }

    let storeRow: Record<string, any> = {};
    let storeRowIndex: number | null = null;
    let storeSheetId: string | null = null;

    if (storeSheet) {
      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);
      if (storeRows.length > 0) {
        const storeHeaders = storeRows[0];
        const storeLinkIndex = storeHeaders.findIndex(h => h.toLowerCase() === "link");
        if (storeLinkIndex !== -1) {
          const trackerLinkSet = new Set(trackerMatches.map(m => m.normalizedLink));
          for (let i = 1; i < storeRows.length; i++) {
            const rawLink = storeRows[i][storeLinkIndex] || "";
            if (trackerLinkSet.has(normalizeLink(rawLink))) {
              storeRow = {};
              storeHeaders.forEach((header: string, idx: number) => {
                storeRow[header] = storeRows[i][idx] || "";
              });
              storeRowIndex = i + 1;
              storeSheetId = storeSheet.id;
              break;
            }
          }
        }
      }
    }

    const primaryTracker = trackerMatches[0];
    trackerHeaders.forEach((header: string, idx: number) => {
      const value = primaryTracker.row[idx] || "";
      if (value !== "") {
        storeRow[header] = value;
      }
    });

    storeRow.Link = storeRow.Link || primaryTracker.link;
    storeRow.link = storeRow.link || primaryTracker.link;
    storeRow._trackerRowIndex = primaryTracker.rowIndex;

    return res.json({
      storeRow,
      meta: {
        rowIndex: storeRowIndex,
        storeSheetId,
        trackerRowIndex: primaryTracker.rowIndex,
        link: primaryTracker.link,
      },
    });
  } catch (error: any) {
    console.error("Error building store details context:", error);
    res.status(500).json({ message: error.message || "Failed to build store details context" });
  }
}
