import * as googleSheets from "../../googleSheets";
import { normalizeLink } from "../../../shared/linkUtils";
import { storage } from "../../storage";

export async function getStoreByLink(params: {
  link: string;
  tenantId: string;
}): Promise<{ meta: { rowIndex: number; storeSheetId: string }; storeRow: Record<string, string> }> {
  const { link, tenantId } = params;
  const configuredSheets = await storage.getAllActiveGoogleSheets(tenantId);
  const storeSheet = configuredSheets.find((sheet: any) => sheet.sheetPurpose === "Store Database");

  if (!storeSheet) {
    throw new Error("Store Database sheet not configured");
  }

  const sheetData = await googleSheets.readSheetData(storeSheet.spreadsheetId, `${storeSheet.sheetName}!A:ZZ`);
  if (!sheetData || sheetData.length === 0) {
    throw new Error("No data found in Store Database");
  }

  const headers = sheetData[0];
  const rows = sheetData.slice(1);
  const linkColumnIndex = headers.findIndex((header: string) => header.toLowerCase().trim() === "link");
  if (linkColumnIndex === -1) {
    throw new Error("Link column not found in Store Database");
  }

  const normalizedSearchLink = normalizeLink(link);
  const matchingRowIndex = rows.findIndex((row: any[]) => {
    const rowLink = row[linkColumnIndex];
    if (!rowLink) {
      return false;
    }
    return normalizeLink(rowLink) === normalizedSearchLink;
  });

  if (matchingRowIndex === -1) {
    throw new Error("Store not found");
  }

  const matchingRow = rows[matchingRowIndex];
  const storeRow: Record<string, string> = {};
  headers.forEach((header: string, index: number) => {
    storeRow[header] = matchingRow[index] || "";
  });

  return {
    storeRow,
    meta: {
      rowIndex: matchingRowIndex + 2,
      storeSheetId: storeSheet.id,
    },
  };
}
