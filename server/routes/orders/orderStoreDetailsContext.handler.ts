import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { buildSheetRange } from "../../services/sheets/a1Range";
import { findStoreSheetRowByLink } from "../../services/sheets/storeDatabaseResolver";

export async function handleOrderStoreDetailsContext(req: any, res: any): Promise<any> {
  try {
    const { orderId } = req.params;
    const tenantId = req.user.tenantId;
    const order = await storage.getOrderById(orderId, tenantId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const sheets = await storage.getAllActiveGoogleSheets(tenantId);
    const trackerSheet = sheets.find(s => s.sheetPurpose === "commissions");
    if (!trackerSheet) {
      return res.status(404).json({ message: "Commission Tracker sheet not found" });
    }

    const trackerRange = buildSheetRange(trackerSheet.sheetName, "A:ZZ");
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

    for (const trackerMatch of trackerMatches) {
      const matchedStore = await findStoreSheetRowByLink({
        tenantId,
        link: trackerMatch.link,
        preferProjectMatch: true,
      });
      if (matchedStore) {
        storeRow = {};
        matchedStore.headers.forEach((header: string, idx: number) => {
          storeRow[header] = matchedStore.row[idx] || "";
        });
        storeRowIndex = matchedStore.rowIndex;
        storeSheetId = matchedStore.sheet.id;
        break;
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
