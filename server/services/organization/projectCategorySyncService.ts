import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

function getSheetColumnLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

export async function syncProjectNameToStoreSheetCategories(
  tenantId: string,
  oldName: string,
  newName: string
): Promise<void> {
  const sheets = await storage.getAllActiveGoogleSheets(tenantId);
  const storeSheet = sheets.find((s) => s.sheetPurpose === "Store Database");
  if (!storeSheet?.spreadsheetId || !storeSheet.sheetName) {
    return;
  }

  const headerRange = `${storeSheet.sheetName}!1:1`;
  const headerRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, headerRange);
  if (headerRows.length === 0) {
    return;
  }

  const headers = headerRows[0].map((h) => h?.toString().toLowerCase().trim());
  const categoryIndex = headers.findIndex((h) => h === "category");
  if (categoryIndex === -1) {
    return;
  }

  const dataRange = `${storeSheet.sheetName}!A:${getSheetColumnLabel(Math.min(headers.length - 1, 25))}`;
  const allRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, dataRange);
  const categoryCol = getSheetColumnLabel(categoryIndex);
  const categoryUpdates = [];

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    const categoryValue = row[categoryIndex]?.toString().trim();
    if (categoryValue === oldName) {
      categoryUpdates.push({
        range: `${storeSheet.sheetName}!${categoryCol}${i + 1}`,
        values: [[newName]],
      });
    }
  }

  if (categoryUpdates.length > 0) {
    await googleSheets.batchUpdateSheetData(storeSheet.spreadsheetId, categoryUpdates);
    console.log(
      `Synced category rename from "${oldName}" to "${newName}" for ${categoryUpdates.length} rows in Google Sheet`
    );
  }
}
