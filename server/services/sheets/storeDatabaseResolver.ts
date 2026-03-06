import * as googleSheets from "../../googleSheets";
import { normalizeLink } from "../../../shared/linkUtils";
import { storage } from "../../storage";
import { resolveTenantProjectId } from "../projectScopeValidation";
import { buildSheetRange } from "./a1Range";

type GoogleSheetLike = {
  id: string;
  tenantId: string;
  spreadsheetId: string;
  sheetName: string;
  sheetPurpose: string | null;
};

const SPREADSHEET_TAB_CACHE_TTL_MS = 5 * 60 * 1000;
const spreadsheetTabTitlesCache = new Map<string, { fetchedAt: number; titles: string[] }>();

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

async function getProjectNames(
  tenantId: string,
  projectId?: string | null
): Promise<{ name: string; slug: string } | null> {
  if (!projectId) {
    return null;
  }

  try {
    const resolvedProjectId = await resolveTenantProjectId(tenantId, projectId);
    if (!resolvedProjectId) {
      return null;
    }
    const project = await storage.getTenantProjectById(resolvedProjectId, tenantId);
    if (!project) {
      return null;
    }
    return {
      name: project.name || "",
      slug: project.slug || "",
    };
  } catch {
    return null;
  }
}

function findProjectMatchedSheet(
  sheets: GoogleSheetLike[],
  project: { name: string; slug: string } | null
): GoogleSheetLike | null {
  if (!project) {
    return null;
  }

  const targets = [project.name, project.slug].map(normalizeName).filter(Boolean);
  if (targets.length === 0) {
    return null;
  }

  const exactMatch = sheets.find((sheet) => targets.includes(normalizeName(sheet.sheetName)));
  if (exactMatch) {
    return exactMatch;
  }

  const fuzzyMatch = sheets.find((sheet) => {
    const normalizedSheetName = normalizeName(sheet.sheetName);
    return targets.some((target) => normalizedSheetName.includes(target) || target.includes(normalizedSheetName));
  });

  return fuzzyMatch || null;
}

function findProjectMatchedTabName(
  tabTitles: string[],
  project: { name: string; slug: string } | null
): string | null {
  if (!project) {
    return null;
  }

  const targets = [project.name, project.slug].map(normalizeName).filter(Boolean);
  if (targets.length === 0) {
    return null;
  }

  const exactMatch = tabTitles.find((title) => targets.includes(normalizeName(title)));
  if (exactMatch) {
    return exactMatch;
  }

  const fuzzyMatch = tabTitles.find((title) => {
    const normalizedTitle = normalizeName(title);
    return targets.some((target) => normalizedTitle.includes(target) || target.includes(normalizedTitle));
  });

  return fuzzyMatch || null;
}

async function getSpreadsheetTabTitles(spreadsheetId: string): Promise<string[]> {
  const now = Date.now();
  const cached = spreadsheetTabTitlesCache.get(spreadsheetId);
  if (cached && now - cached.fetchedAt < SPREADSHEET_TAB_CACHE_TTL_MS) {
    return cached.titles;
  }

  try {
    const spreadsheetInfo = await googleSheets.getSpreadsheetInfo(spreadsheetId);
    const titles = (spreadsheetInfo.sheets || [])
      .map((sheet: any) => sheet?.properties?.title)
      .filter((title: any): title is string => typeof title === "string" && title.trim().length > 0);
    spreadsheetTabTitlesCache.set(spreadsheetId, { fetchedAt: now, titles });
    return titles;
  } catch {
    return [];
  }
}

async function findProjectMatchedSheetAcrossTabs(
  sheets: GoogleSheetLike[],
  project: { name: string; slug: string } | null
): Promise<GoogleSheetLike | null> {
  if (!project || sheets.length === 0) {
    return null;
  }

  const baseSheetBySpreadsheet = new Map<string, GoogleSheetLike>();
  for (const sheet of sheets) {
    if (!baseSheetBySpreadsheet.has(sheet.spreadsheetId)) {
      baseSheetBySpreadsheet.set(sheet.spreadsheetId, sheet);
    }
  }

  for (const baseSheet of baseSheetBySpreadsheet.values()) {
    const tabTitles = await getSpreadsheetTabTitles(baseSheet.spreadsheetId);
    const matchedTab = findProjectMatchedTabName(tabTitles, project);
    if (matchedTab) {
      return {
        ...baseSheet,
        id: `${baseSheet.id}::${matchedTab}`,
        sheetName: matchedTab,
      };
    }
  }

  return null;
}

function dedupeSheetsById(sheets: GoogleSheetLike[]): GoogleSheetLike[] {
  const seen = new Set<string>();
  const result: GoogleSheetLike[] = [];

  for (const sheet of sheets) {
    if (!seen.has(sheet.id)) {
      seen.add(sheet.id);
      result.push(sheet);
    }
  }

  return result;
}

export async function listStoreDatabaseSheets(tenantId: string): Promise<GoogleSheetLike[]> {
  const allSheets = (await storage.getAllActiveGoogleSheets(tenantId)) as GoogleSheetLike[];
  return allSheets.filter((sheet) => sheet.sheetPurpose === "Store Database");
}

export async function listStoreDatabaseSheetsByPriority(params: {
  tenantId: string;
  projectId?: string | null;
  sheetId?: string | null;
  preferProjectMatch?: boolean;
  requireProjectMatch?: boolean;
}): Promise<GoogleSheetLike[]> {
  const { tenantId, projectId, sheetId, preferProjectMatch = true, requireProjectMatch = false } = params;
  const storeSheets = await listStoreDatabaseSheets(tenantId);
  if (storeSheets.length === 0) {
    return [];
  }

  const explicitSheet = sheetId ? storeSheets.find((sheet) => sheet.id === sheetId) || null : null;
  const project = await getProjectNames(tenantId, projectId);
  let projectMatchedSheet = findProjectMatchedSheet(storeSheets, project);
  if (!projectMatchedSheet) {
    projectMatchedSheet = await findProjectMatchedSheetAcrossTabs(storeSheets, project);
  }
  if (requireProjectMatch && projectId && !projectMatchedSheet) {
    return [];
  }

  const prioritized: GoogleSheetLike[] = [];

  if (preferProjectMatch) {
    if (projectMatchedSheet) prioritized.push(projectMatchedSheet);
    if (explicitSheet) prioritized.push(explicitSheet);
  } else {
    if (explicitSheet) prioritized.push(explicitSheet);
    if (projectMatchedSheet) prioritized.push(projectMatchedSheet);
  }

  prioritized.push(...storeSheets);

  return dedupeSheetsById(prioritized);
}

export async function resolveStoreDatabaseSheet(params: {
  tenantId: string;
  projectId?: string | null;
  sheetId?: string | null;
  preferProjectMatch?: boolean;
  requireProjectMatch?: boolean;
}): Promise<GoogleSheetLike | null> {
  const prioritizedSheets = await listStoreDatabaseSheetsByPriority(params);
  return prioritizedSheets[0] || null;
}

export type StoreSheetRowMatch = {
  sheet: GoogleSheetLike;
  headers: string[];
  row: any[];
  rowIndex: number;
  rows: any[][];
};

export async function findStoreSheetRowByLink(params: {
  tenantId: string;
  link: string;
  projectId?: string | null;
  sheetId?: string | null;
  preferProjectMatch?: boolean;
}): Promise<StoreSheetRowMatch | null> {
  const { tenantId, link, projectId, sheetId, preferProjectMatch = true } = params;
  const normalizedTarget = normalizeLink(link || "");
  if (!normalizedTarget) {
    return null;
  }

  const prioritizedSheets = await listStoreDatabaseSheetsByPriority({
    tenantId,
    projectId,
    sheetId,
    preferProjectMatch,
  });

  for (const sheet of prioritizedSheets) {
    const rows = await googleSheets.readSheetData(sheet.spreadsheetId, buildSheetRange(sheet.sheetName, "A:ZZ"));
    if (!rows || rows.length === 0) {
      continue;
    }

    const headers = rows[0] as string[];
    const linkIndex = headers.findIndex((header) => (header || "").toLowerCase().trim() === "link");
    if (linkIndex === -1) {
      continue;
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowLink = (row?.[linkIndex] || "").toString().trim();
      if (!rowLink) {
        continue;
      }
      if (normalizeLink(rowLink) === normalizedTarget) {
        return {
          sheet,
          headers,
          row,
          rowIndex: i + 1,
          rows,
        };
      }
    }
  }

  return null;
}
