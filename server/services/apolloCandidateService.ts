import { and, eq } from "drizzle-orm";
import { apolloCandidateSources, apolloCandidates } from "@shared/schema";
import { db } from "../db";
import * as googleSheets from "../googleSheets";
import { storage } from "../storage";
import { getAllowedEhubCategoryNames } from "./ehubProjectScope";

type CandidateSourceInput = {
  sourceLink: string;
  rawName: string;
  rawWebsite: string;
  state: string;
  category: string;
};

type CandidateAccumulator = {
  cleanCompanyName: string;
  domain: string | null;
  representativeLink: string;
  sources: CandidateSourceInput[];
};

function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanCompanyBaseName(name: string): string {
  const normalized = normalizeWhitespace(name)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s*-\s*/g, " - ");

  const firstSegment = normalized.split(/\s+-\s+|\s+\|\s+|,|\(/)[0] || normalized;
  return normalizeWhitespace(firstSegment);
}

function canonicalizeName(name: string): string {
  return cleanCompanyBaseName(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function listApolloCandidates(tenantId: string, projectId: string) {
  return db
    .select({
      id: apolloCandidates.id,
      cleanCompanyName: apolloCandidates.cleanCompanyName,
      representativeLink: apolloCandidates.representativeLink,
      domain: apolloCandidates.domain,
      sourceCount: apolloCandidates.sourceCount,
      status: apolloCandidates.status,
      updatedAt: apolloCandidates.updatedAt,
    })
    .from(apolloCandidates)
    .where(and(eq(apolloCandidates.tenantId, tenantId), eq(apolloCandidates.projectId, projectId)));
}

export async function countApolloCandidates(tenantId: string, projectId: string): Promise<number> {
  const rows = await db
    .select({ id: apolloCandidates.id })
    .from(apolloCandidates)
    .where(and(eq(apolloCandidates.tenantId, tenantId), eq(apolloCandidates.projectId, projectId)));
  return rows.length;
}

export async function rebuildApolloCandidatesFromStoreSheet(tenantId: string, projectId: string) {
  const storeSheet = await storage.getGoogleSheetByPurpose("Store Database", tenantId);
  if (!storeSheet) {
    throw new Error("Store Database sheet not configured for tenant");
  }

  const allowedCategoryNames = await getAllowedEhubCategoryNames(tenantId, projectId);
  if (allowedCategoryNames.size === 0) {
    throw new Error("No active categories configured for project");
  }

  const storeData = await googleSheets.readSheetData(storeSheet.spreadsheetId, `${storeSheet.sheetName}!A:ZZ`);
  if (!storeData || storeData.length === 0) {
    return {
      totalRows: 0,
      keptRows: 0,
      candidates: 0,
      excludedHasEmail: 0,
      excludedMissingLink: 0,
      excludedCategoryMismatch: 0,
      excludedMissingIdentity: 0,
    };
  }

  const headers = storeData[0].map((h: string) => h.toLowerCase().trim());
  const rows = storeData.slice(1);

  const nameIndex = headers.indexOf("name");
  const emailIndex = headers.indexOf("email");
  const linkIndex = headers.indexOf("link");
  const websiteIndex = headers.indexOf("website");
  const stateIndex = headers.indexOf("state");
  const categoryIndex = headers.indexOf("category");

  const stats = {
    totalRows: rows.length,
    keptRows: 0,
    candidates: 0,
    excludedHasEmail: 0,
    excludedMissingLink: 0,
    excludedCategoryMismatch: 0,
    excludedMissingIdentity: 0,
  };

  const candidateMap = new Map<string, CandidateAccumulator>();

  for (const row of rows) {
    const email = emailIndex !== -1 ? (row[emailIndex] || "").trim() : "";
    if (email && email.includes("@")) {
      stats.excludedHasEmail++;
      continue;
    }

    const sourceLink = linkIndex !== -1 ? (row[linkIndex] || "").trim() : "";
    if (!sourceLink) {
      stats.excludedMissingLink++;
      continue;
    }

    const rowCategory = categoryIndex !== -1 ? (row[categoryIndex] || "").toLowerCase().trim() : "";
    if (!rowCategory || !allowedCategoryNames.has(rowCategory)) {
      stats.excludedCategoryMismatch++;
      continue;
    }

    const rawName = nameIndex !== -1 ? (row[nameIndex] || "").toString() : "";
    const rawWebsite = websiteIndex !== -1 ? (row[websiteIndex] || "").toString() : "";
    const state = stateIndex !== -1 ? (row[stateIndex] || "").toString() : "";

    const domain = extractDomain(rawWebsite);
    const normalizedName = canonicalizeName(rawName);
    const canonicalKey = domain || (normalizedName ? `name:${normalizedName}` : null);

    if (!canonicalKey) {
      stats.excludedMissingIdentity++;
      continue;
    }

    const cleanCompanyName = cleanCompanyBaseName(rawName) || rawName || domain || "Unknown";

    const existing = candidateMap.get(canonicalKey);
    if (existing) {
      existing.sources.push({ sourceLink, rawName, rawWebsite, state, category: rowCategory });
    } else {
      candidateMap.set(canonicalKey, {
        cleanCompanyName,
        domain,
        representativeLink: sourceLink,
        sources: [{ sourceLink, rawName, rawWebsite, state, category: rowCategory }],
      });
    }

    stats.keptRows++;
  }

  const candidateRows = Array.from(candidateMap.entries()).map(([canonicalKey, value]) => ({
    tenantId,
    projectId,
    canonicalKey,
    cleanCompanyName: value.cleanCompanyName,
    domain: value.domain,
    representativeLink: value.representativeLink,
    sourceCount: value.sources.length,
    status: "pending" as const,
  }));

  await db.delete(apolloCandidateSources).where(and(eq(apolloCandidateSources.tenantId, tenantId), eq(apolloCandidateSources.projectId, projectId)));
  await db.delete(apolloCandidates).where(and(eq(apolloCandidates.tenantId, tenantId), eq(apolloCandidates.projectId, projectId)));

  const chunkSize = 500;
  const insertedByKey = new Map<string, string>();

  for (let i = 0; i < candidateRows.length; i += chunkSize) {
    const chunk = candidateRows.slice(i, i + chunkSize);
    const inserted = await db
      .insert(apolloCandidates)
      .values(chunk)
      .returning({ id: apolloCandidates.id, canonicalKey: apolloCandidates.canonicalKey });

    for (const row of inserted) {
      insertedByKey.set(row.canonicalKey, row.id);
    }
  }

  const sourceRows = Array.from(candidateMap.entries()).flatMap(([canonicalKey, value]) => {
    const candidateId = insertedByKey.get(canonicalKey);
    if (!candidateId) return [];
    return value.sources.map((source) => ({
      tenantId,
      projectId,
      candidateId,
      sourceLink: source.sourceLink,
      rawName: source.rawName || null,
      rawWebsite: source.rawWebsite || null,
      state: source.state || null,
      category: source.category || null,
    }));
  });

  for (let i = 0; i < sourceRows.length; i += chunkSize) {
    await db.insert(apolloCandidateSources).values(sourceRows.slice(i, i + chunkSize));
  }

  stats.candidates = candidateRows.length;
  return stats;
}
