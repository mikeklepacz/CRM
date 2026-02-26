import * as googleSheets from "../googleSheets";
import { normalizeLink } from "../../shared/linkUtils";

type LockRelease = () => void;

const lockQueues = new Map<string, Array<() => void>>();

async function acquireLock(lockKey: string): Promise<LockRelease> {
  return new Promise((resolve) => {
    const queue = lockQueues.get(lockKey);
    if (!queue) {
      lockQueues.set(lockKey, []);
      resolve(() => releaseLock(lockKey));
      return;
    }

    queue.push(() => resolve(() => releaseLock(lockKey)));
  });
}

function releaseLock(lockKey: string): void {
  const queue = lockQueues.get(lockKey);
  if (!queue) return;

  const next = queue.shift();
  if (next) {
    next();
    return;
  }

  lockQueues.delete(lockKey);
}

function findColumnIndex(headers: string[], columnName: string): number {
  return headers.findIndex((h) => h?.toString().trim().toLowerCase() === columnName.toLowerCase());
}

function findRowIndexByNormalizedLink(rows: string[][], linkIndex: number, normalizedInputLink: string): number {
  for (let i = rows.length - 1; i >= 1; i--) {
    const rowLink = rows[i][linkIndex];
    const normalizedRowLink = rowLink ? normalizeLink(rowLink.toString().trim()) : "";
    if (normalizedRowLink && normalizedRowLink === normalizedInputLink) {
      return i + 1; // Google Sheets is 1-indexed
    }
  }

  return -1;
}

async function readTrackerRows(spreadsheetId: string, sheetName: string): Promise<string[][]> {
  return googleSheets.readSheetData(spreadsheetId, `${sheetName}!A:ZZ`);
}

export async function verifyTrackerRowExistsInSheet(
  spreadsheetId: string,
  sheetName: string,
  link: string
): Promise<boolean> {
  const normalizedInputLink = normalizeLink(link.trim());
  if (!normalizedInputLink) return false;

  const rows = await readTrackerRows(spreadsheetId, sheetName);
  if (rows.length === 0) return false;

  const headers = rows[0];
  const linkIndex = findColumnIndex(headers, "link");
  if (linkIndex === -1) return false;

  return findRowIndexByNormalizedLink(rows, linkIndex, normalizedInputLink) !== -1;
}

export async function createOrGetBasicTrackerRow(params: {
  spreadsheetId: string;
  sheetName: string;
  link: string;
  agentName: string;
}): Promise<{ created: boolean; rowIndex: number }> {
  const { spreadsheetId, sheetName, link, agentName } = params;
  const normalizedInputLink = normalizeLink(link.trim());

  if (!normalizedInputLink) {
    throw new Error("Link is required");
  }

  const lockKey = `${spreadsheetId}:${sheetName}:${normalizedInputLink}`;
  const release = await acquireLock(lockKey);

  try {
    let rows = await readTrackerRows(spreadsheetId, sheetName);
    if (rows.length === 0) {
      throw new Error("No headers found in tracker sheet");
    }

    const headers = rows[0];
    const linkIndex = findColumnIndex(headers, "link");
    const agentNameIndex = findColumnIndex(headers, "agent name");
    const statusIndex = findColumnIndex(headers, "status");
    const timeIndex = findColumnIndex(headers, "time");

    if (linkIndex === -1) {
      throw new Error("Link column not found in tracker sheet");
    }

    const existingRowIndex = findRowIndexByNormalizedLink(rows, linkIndex, normalizedInputLink);
    if (existingRowIndex !== -1) {
      return { created: false, rowIndex: existingRowIndex };
    }

    // Keep column indexes aligned with the actual header row from the sheet.
    const newRow = new Array(headers.length).fill("");
    newRow[linkIndex] = link;
    if (agentNameIndex !== -1) newRow[agentNameIndex] = agentName;
    if (statusIndex !== -1) newRow[statusIndex] = "Claimed";
    if (timeIndex !== -1) newRow[timeIndex] = new Date().toISOString();

    await googleSheets.appendSheetData(spreadsheetId, `${sheetName}!A:ZZ`, [newRow]);

    const maxAttempts = 4;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      rows = await readTrackerRows(spreadsheetId, sheetName);
      const rowIndex = findRowIndexByNormalizedLink(rows, linkIndex, normalizedInputLink);
      if (rowIndex !== -1) {
        return { created: true, rowIndex };
      }
    }

    throw new Error("Tracker row was appended but could not be re-read from Google Sheets");
  } finally {
    release();
  }
}
