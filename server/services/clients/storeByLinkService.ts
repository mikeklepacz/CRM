import {
  findStoreSheetRowByLink,
  listStoreDatabaseSheets,
} from "../sheets/storeDatabaseResolver";

export async function getStoreByLink(params: {
  link: string;
  tenantId: string;
  projectId?: string;
  sheetId?: string;
}): Promise<{ meta: { rowIndex: number; storeSheetId: string }; storeRow: Record<string, string> }> {
  const { link, tenantId, projectId, sheetId } = params;
  const storeSheets = await listStoreDatabaseSheets(tenantId);
  if (storeSheets.length === 0) {
    throw new Error("Store Database sheet not configured");
  }

  const match = await findStoreSheetRowByLink({
    tenantId,
    link,
    projectId,
    sheetId,
    preferProjectMatch: true,
  });

  if (!match) {
    throw new Error("Store not found");
  }

  if (!match.rows || match.rows.length === 0) {
    throw new Error("No data found in Store Database");
  }

  const headers = match.headers;
  const linkColumnIndex = headers.findIndex((header: string) => (header || "").toLowerCase().trim() === "link");
  if (linkColumnIndex === -1) {
    throw new Error("Link column not found in Store Database");
  }

  const storeRow: Record<string, string> = {};
  headers.forEach((header: string, index: number) => {
    storeRow[header] = match.row[index] || "";
  });

  return {
    storeRow,
    meta: {
      rowIndex: match.rowIndex,
      storeSheetId: match.sheet.id,
    },
  };
}
