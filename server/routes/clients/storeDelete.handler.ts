import * as googleSheets from "../../googleSheets";
import { buildSheetRange } from "../../services/sheets/a1Range";
import { findStoreSheetRowByLink } from "../../services/sheets/storeDatabaseResolver";

export async function handleStoreDelete(req: any, res: any): Promise<any> {
  try {
    const { link } = req.params;
    const { keeperLink, statusHierarchy } = req.body || {};
    const projectId =
      typeof req.query?.projectId === "string"
        ? req.query.projectId
        : typeof req.body?.projectId === "string"
          ? req.body.projectId
          : undefined;
    const decodedLink = decodeURIComponent(link);

    console.log("[DELETE-STORE] Deleting store:", decodedLink, "Keeper:", keeperLink);

    if (keeperLink && statusHierarchy) {
      const sourceMatch = await findStoreSheetRowByLink({
        tenantId: req.user.tenantId,
        link: decodedLink,
        projectId,
        preferProjectMatch: true,
      });
      const targetMatch = await findStoreSheetRowByLink({
        tenantId: req.user.tenantId,
        link: keeperLink,
        projectId,
        preferProjectMatch: true,
      });

      if (!sourceMatch || !targetMatch) {
        return res.status(404).json({ message: "One or both stores not found" });
      }
      if (sourceMatch.sheet.id !== targetMatch.sheet.id) {
        return res.status(400).json({ message: "Stores must be in the same Store Database tab to merge" });
      }

      const storeSheet = sourceMatch.sheet;
      if (!storeSheet) {
        return res.status(404).json({ message: "Store Database not configured" });
      }

      const sheets = await googleSheets.getSystemGoogleSheetClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: storeSheet.spreadsheetId,
        range: buildSheetRange(storeSheet.sheetName, "A:ZZ"),
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        return res.status(404).json({ message: "Store Database is empty" });
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);
      const linkIndex = headers.findIndex((h: string) => (h || "").toLowerCase() === "link");
      if (linkIndex === -1) {
        return res.status(404).json({ message: "Link column not found in Store Database" });
      }

      const targetRow = dataRows.find((row: any[]) => row[linkIndex] === targetMatch.row[linkIndex]);
      const sourceRow = dataRows.find((row: any[]) => row[linkIndex] === sourceMatch.row[linkIndex]);

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

      await googleSheets.mergeAndUpdateStore(keeperLink, merged, req.user.tenantId, projectId);
      console.log("[DELETE-STORE] Merged data into keeper:", keeperLink);

      await googleSheets.updateCommissionTrackerLinks(decodedLink, keeperLink, req.user.tenantId);
      console.log("[DELETE-STORE] Updated Commission Tracker links");
    }

    await googleSheets.deleteStoreFromSheet(decodedLink, req.user.tenantId, projectId);
    console.log("[DELETE-STORE] Deleted store:", decodedLink);

    res.json({ success: true, message: "Store deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE-STORE] Error:", error);
    res.status(500).json({ message: error.message || "Failed to delete store" });
  }
}
