import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export async function handleStoreDelete(req: any, res: any): Promise<any> {
  try {
    const { link } = req.params;
    const { keeperLink, statusHierarchy } = req.body || {};
    const decodedLink = decodeURIComponent(link);

    console.log("[DELETE-STORE] Deleting store:", decodedLink, "Keeper:", keeperLink);

    if (keeperLink && statusHierarchy) {
      const storeSheet = await storage.getGoogleSheetByPurpose("Store Database", req.user.tenantId);
      if (!storeSheet) {
        return res.status(404).json({ message: "Store Database not configured" });
      }

      const sheets = await googleSheets.getSystemGoogleSheetClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: storeSheet.spreadsheetId,
        range: `${storeSheet.sheetName}!A:ZZ`,
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        return res.status(404).json({ message: "Store Database is empty" });
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);
      const linkIndex = headers.findIndex((h: string) => h === "Link");

      const targetRow = dataRows.find((row: any[]) => row[linkIndex] === keeperLink);
      const sourceRow = dataRows.find((row: any[]) => row[linkIndex] === decodedLink);

      if (!targetRow || !sourceRow) {
        return res.status(404).json({ message: "One or both stores not found" });
      }

      const target: any = {};
      const source: any = {};
      headers.forEach((header: string, i: number) => {
        target[header] = targetRow[i] || "";
        source[header] = sourceRow[i] || "";
      });

      const { mergeStoreData } = await import("../../../shared/duplicateUtils");
      const merged = mergeStoreData(target, source, statusHierarchy);

      await googleSheets.mergeAndUpdateStore(keeperLink, merged, req.user.tenantId);
      console.log("[DELETE-STORE] Merged data into keeper:", keeperLink);

      await googleSheets.updateCommissionTrackerLinks(decodedLink, keeperLink, req.user.tenantId);
      console.log("[DELETE-STORE] Updated Commission Tracker links");
    }

    await googleSheets.deleteStoreFromSheet(decodedLink, req.user.tenantId);
    console.log("[DELETE-STORE] Deleted store:", decodedLink);

    res.json({ success: true, message: "Store deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE-STORE] Error:", error);
    res.status(500).json({ message: error.message || "Failed to delete store" });
  }
}
