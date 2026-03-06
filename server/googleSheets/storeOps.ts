import { storage } from "../storage";
import { batchUpdateSheetData, getSpreadsheetInfo } from "./sheetCrud";
import { getSystemGoogleSheetClient } from "./auth";
import { buildSheetRange } from "../services/sheets/a1Range";
import { findStoreSheetRowByLink } from "../services/sheets/storeDatabaseResolver";

export async function mergeAndUpdateStore(
  targetLink: string,
  mergedData: Record<string, any>,
  tenantId: string,
  projectId?: string
) {
  const sheets = await getSystemGoogleSheetClient();
  const targetMatch = await findStoreSheetRowByLink({
    tenantId,
    link: targetLink,
    projectId,
    preferProjectMatch: true,
  });
  const storeSheet = targetMatch?.sheet || null;

  if (!storeSheet) {
    throw new Error("Store Database sheet ID not configured");
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: storeSheet.spreadsheetId,
    range: buildSheetRange(storeSheet.sheetName, "A:ZZ"),
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    throw new Error("Store Database is empty");
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const linkIndex = headers.findIndex((h: string) => h === "Link");
  if (linkIndex === -1) {
    throw new Error("Link column not found in Store Database");
  }

  const targetRowIndex = dataRows.findIndex((row: any[]) => row[linkIndex] === targetLink);
  if (targetRowIndex === -1) {
    throw new Error("Store not found");
  }

  const filteredHeaders = headers.filter((h: string) => h && h.trim() !== "");
  const updatedRow = filteredHeaders.map((header: string) => {
    return mergedData[header] !== undefined ? mergedData[header] : "";
  });

  const rowNumber = targetRowIndex + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: storeSheet.spreadsheetId,
    range: buildSheetRange(storeSheet.sheetName, `A${rowNumber}`),
    valueInputOption: "RAW",
    requestBody: {
      values: [updatedRow],
    },
  });

  return mergedData;
}

export async function deleteStoreFromSheet(link: string, tenantId: string, projectId?: string) {
  const sheets = await getSystemGoogleSheetClient();
  const linkMatch = await findStoreSheetRowByLink({
    tenantId,
    link,
    projectId,
    preferProjectMatch: true,
  });
  const storeSheet = linkMatch?.sheet || null;

  if (!storeSheet) {
    throw new Error("Store Database sheet ID not configured");
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: storeSheet.spreadsheetId,
    range: buildSheetRange(storeSheet.sheetName, "A:ZZ"),
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    throw new Error("Store Database is empty");
  }

  const headers = rows[0];
  const linkIndex = headers.findIndex((h: string) => h === "Link");
  if (linkIndex === -1) {
    throw new Error("Link column not found");
  }

  const dataRows = rows.slice(1);
  const rowIndex = dataRows.findIndex((row: any[]) => row[linkIndex] === link);

  if (rowIndex === -1) {
    throw new Error("Store not found");
  }

  const spreadsheetInfo = await getSpreadsheetInfo(storeSheet.spreadsheetId);
  const targetSheet = spreadsheetInfo.sheets?.find((s: any) => s.properties?.title === storeSheet.sheetName);

  if (!targetSheet || targetSheet.properties?.sheetId === undefined) {
    throw new Error(`Sheet "${storeSheet.sheetName}" not found in spreadsheet`);
  }

  const rowNumber = rowIndex + 1;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: storeSheet.spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: targetSheet.properties.sheetId,
              dimension: "ROWS",
              startIndex: rowNumber,
              endIndex: rowNumber + 1,
            },
          },
        },
      ],
    },
  });
}

export async function updateCommissionTrackerLinks(oldLink: string, newLink: string, tenantId: string) {
  const sheets = await getSystemGoogleSheetClient();
  const trackerSheet = await storage.getGoogleSheetByPurpose("commissions", tenantId);

  if (!trackerSheet) {
    throw new Error("Commission Tracker sheet ID not configured");
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: trackerSheet.spreadsheetId,
    range: buildSheetRange(trackerSheet.sheetName, "A:ZZ"),
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    return;
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const linkIndex = headers.findIndex((h: string) => h === "Link");
  if (linkIndex === -1) {
    throw new Error("Link column not found in Commission Tracker");
  }

  const notesIndex = headers.findIndex((h: string) => h.toLowerCase() === "notes");
  const pocNameIndex = headers.findIndex((h: string) => h.toLowerCase() === "point of contact");
  const pocEmailIndex = headers.findIndex((h: string) => h.toLowerCase() === "poc email");
  const pocPhoneIndex = headers.findIndex((h: string) => h.toLowerCase() === "poc phone");
  const nameIndex = headers.findIndex((h: string) => h.toLowerCase() === "name" || h.toLowerCase() === "store name");

  let keeperRowIndex = -1;
  const sourceRowIndices: number[] = [];

  dataRows.forEach((row: any[], index: number) => {
    if (row[linkIndex] === newLink && keeperRowIndex === -1) {
      keeperRowIndex = index;
    }
    if (row[linkIndex] === oldLink) {
      sourceRowIndices.push(index);
    }
  });

  const updatedRows: Array<{ range: string; values: any[][] }> = [];

  if (sourceRowIndices.length > 0) {
    let effectiveKeeperIdx = keeperRowIndex;
    let keeperRow: any[];

    if (effectiveKeeperIdx !== -1) {
      keeperRow = [...dataRows[effectiveKeeperIdx]];
    } else {
      effectiveKeeperIdx = sourceRowIndices[0];
      keeperRow = [...dataRows[effectiveKeeperIdx]];
      keeperRow[linkIndex] = newLink;
    }

    const indicesToMerge = sourceRowIndices.filter((idx) => idx !== effectiveKeeperIdx);

    for (const srcIdx of indicesToMerge) {
      const sourceRow = dataRows[srcIdx];
      const sourceName = (nameIndex !== -1 ? sourceRow[nameIndex] : "") || sourceRow[linkIndex] || "Merged Location";

      if (notesIndex !== -1) {
        const sourceNotes = (sourceRow[notesIndex] || "").toString().trim();
        if (sourceNotes) {
          const existingNotes = (keeperRow[notesIndex] || "").toString().trim();
          keeperRow[notesIndex] = existingNotes
            ? `${existingNotes}\n\n[Merged from ${sourceName}]: ${sourceNotes}`
            : sourceNotes;
        }
      }

      if (pocNameIndex !== -1) {
        const srcPoc = (sourceRow[pocNameIndex] || "").toString().trim();
        if (srcPoc) keeperRow[pocNameIndex] = srcPoc;
      }
      if (pocEmailIndex !== -1) {
        const srcPocEmail = (sourceRow[pocEmailIndex] || "").toString().trim();
        if (srcPocEmail) keeperRow[pocEmailIndex] = srcPocEmail;
      }
      if (pocPhoneIndex !== -1) {
        const srcPocPhone = (sourceRow[pocPhoneIndex] || "").toString().trim();
        if (srcPocPhone) keeperRow[pocPhoneIndex] = srcPocPhone;
      }
    }

    const keeperRowNumber = effectiveKeeperIdx + 2;
    updatedRows.push({
      range: buildSheetRange(trackerSheet.sheetName, `A${keeperRowNumber}`),
      values: [keeperRow],
    });
  }

  for (const srcIdx of sourceRowIndices) {
    if (keeperRowIndex === -1 && srcIdx === sourceRowIndices[0]) {
      continue;
    }
    const updatedRow = [...dataRows[srcIdx]];
    updatedRow[linkIndex] = newLink;

    const rowNumber = srcIdx + 2;
    updatedRows.push({
      range: buildSheetRange(trackerSheet.sheetName, `A${rowNumber}`),
      values: [updatedRow],
    });
  }

  if (updatedRows.length > 0) {
    await batchUpdateSheetData(trackerSheet.spreadsheetId, updatedRows);
  }
}
