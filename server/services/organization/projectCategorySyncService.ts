import * as googleSheets from "../../googleSheets";
import { listStoreDatabaseSheets } from "../sheets/storeDatabaseResolver";
import { buildSheetRange } from "../sheets/a1Range";

function getSheetColumnLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

export async function syncProjectNameToStoreSheetCategories(
  tenantId: string,
  oldName: string,
  newName: string
): Promise<void> {
  const storeSheets = await listStoreDatabaseSheets(tenantId);
  if (storeSheets.length === 0) {
    return;
  }

  let totalUpdated = 0;
  for (const storeSheet of storeSheets) {
    if (!storeSheet?.spreadsheetId || !storeSheet.sheetName) {
      continue;
    }

    const headerRows = await googleSheets.readSheetData(
      storeSheet.spreadsheetId,
      buildSheetRange(storeSheet.sheetName, "1:1")
    );
    if (headerRows.length === 0) {
      continue;
    }

    const headers = headerRows[0].map((h) => h?.toString().toLowerCase().trim());
    const categoryIndex = headers.findIndex((h) => h === "category");
    if (categoryIndex === -1) {
      continue;
    }

    const dataRange = buildSheetRange(storeSheet.sheetName, `A:${getSheetColumnLabel(Math.min(headers.length - 1, 25))}`);
    const allRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, dataRange);
    const categoryCol = getSheetColumnLabel(categoryIndex);
    const categoryUpdates = [];

    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      const categoryValue = row[categoryIndex]?.toString().trim();
      if (categoryValue === oldName) {
        categoryUpdates.push({
          range: buildSheetRange(storeSheet.sheetName, `${categoryCol}${i + 1}`),
          values: [[newName]],
        });
      }
    }

    if (categoryUpdates.length > 0) {
      await googleSheets.batchUpdateSheetData(storeSheet.spreadsheetId, categoryUpdates);
      totalUpdated += categoryUpdates.length;
    }
  }

  if (totalUpdated > 0) {
    console.log(
      `Synced category rename from "${oldName}" to "${newName}" for ${totalUpdated} rows in Google Sheet`
    );
  }
}
