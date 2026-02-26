import * as googleMaps from "../../googleMaps";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

function parseLocation(location: string): { city: string; state: string; country: string } {
  const parts = location.split(",").map((item) => item.trim());
  return {
    city: parts[0] || "",
    state: parts[1] || "",
    country: parts[2] || "",
  };
}

function parseExcludedKeywords(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim().toLowerCase())
      .filter((item) => item.length > 0);
  }
  return [];
}

function parseExcludedTypes(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim().toLowerCase().replace(/\s+/g, "_"))
      .filter((item) => item.length > 0);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim().toLowerCase().replace(/\s+/g, "_"))
      .filter((item) => item.length > 0);
  }
  return [];
}

function normalizeUrl(url: string): string {
  let normalized = url.toLowerCase().trim();
  normalized = normalized.replace(/^https?:\/\//, "");
  normalized = normalized.replace(/^www\./, "");
  normalized = normalized.replace(/\/$/, "");
  return normalized;
}

export async function runMapSearch(params: {
  tenantId?: string;
  query: string;
  location: string;
  excludedKeywords?: unknown;
  excludedTypes?: unknown;
  category?: string;
  pageToken?: string;
}): Promise<any> {
  const { tenantId, query, location, excludedKeywords, excludedTypes, category, pageToken } = params;
  const { city, state, country } = parseLocation(location);
  const excludedKeywordsArray = parseExcludedKeywords(excludedKeywords);
  const excludedTypesArray = parseExcludedTypes(excludedTypes);

  if (!pageToken && tenantId) {
    await storage.recordSearch(tenantId, query, city, state, country, excludedKeywordsArray, excludedTypesArray, category);
  }

  const searchResponse = await googleMaps.searchPlaces(query, location, excludedTypesArray, pageToken);
  const placeIds = searchResponse.results.map((result: any) => result.place_id);
  const importedPlaceIds = await storage.checkImportedPlaces(placeIds);

  let filteredResults = searchResponse.results.filter((result: any) => !importedPlaceIds.has(result.place_id));
  const duplicateCount = searchResponse.results.length - filteredResults.length;

  let excludedCount = 0;
  if (excludedKeywordsArray.length > 0) {
    const beforeExclusionCount = filteredResults.length;
    filteredResults = filteredResults.filter((place: any) => {
      const placeName = place.name?.toLowerCase() || "";
      return !excludedKeywordsArray.some((keyword) => placeName.includes(keyword));
    });
    excludedCount = beforeExclusionCount - filteredResults.length;
  }

  return {
    results: filteredResults,
    totalResults: searchResponse.results.length,
    duplicateCount,
    excludedCount,
    nextPageToken: searchResponse.nextPageToken,
  };
}

export async function runMapGridSearch(params: {
  tenantId?: string;
  query: string;
  location: string;
  excludedKeywords?: unknown;
  excludedTypes?: unknown;
  category?: string;
}): Promise<any> {
  const { tenantId, query, location, excludedKeywords, excludedTypes, category } = params;
  const { city, state, country } = parseLocation(location);
  const excludedKeywordsArray = parseExcludedKeywords(excludedKeywords);
  const excludedTypesArray = parseExcludedTypes(excludedTypes);

  if (tenantId) {
    await storage.recordSearch(tenantId, query, city, state, country, excludedKeywordsArray, excludedTypesArray, category);
  }

  const gridResponse = await googleMaps.gridSearch(query, location, excludedTypesArray);
  const placeIds = gridResponse.results.map((result: any) => result.place_id);
  const importedPlaceIds = await storage.checkImportedPlaces(placeIds);

  let filteredResults = gridResponse.results.filter((result: any) => !importedPlaceIds.has(result.place_id));
  const duplicateCount = gridResponse.results.length - filteredResults.length;

  let excludedCount = 0;
  if (excludedKeywordsArray.length > 0) {
    const beforeExclusionCount = filteredResults.length;
    filteredResults = filteredResults.filter((place: any) => {
      const placeName = place.name?.toLowerCase() || "";
      return !excludedKeywordsArray.some((keyword) => placeName.includes(keyword));
    });
    excludedCount = beforeExclusionCount - filteredResults.length;
  }

  return {
    results: filteredResults,
    totalResults: gridResponse.results.length,
    duplicateCount,
    excludedCount,
    totalZones: gridResponse.totalZones,
    gridDuplicatesRemoved: gridResponse.duplicatesRemoved,
  };
}

export async function findDuplicateWebsites(tenantId: string, websites: string[]): Promise<string[]> {
  const normalizedInputUrls = new Map<string, string>();
  for (const url of websites) {
    const normalized = normalizeUrl(url);
    if (normalized) {
      normalizedInputUrls.set(normalized, url);
    }
  }

  const duplicates: string[] = [];
  const sheets = await storage.getAllActiveGoogleSheets(tenantId);
  const storeSheet = sheets.find((sheet) => sheet.sheetPurpose === "Store Database");

  if (storeSheet) {
    const storeRange = `${storeSheet.sheetName}!A:ZZ`;
    const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);
    if (storeRows && storeRows.length > 1) {
      const headers = storeRows[0].map((header: string) => (header || "").toLowerCase().trim());
      const websiteIndex = headers.indexOf("website");
      if (websiteIndex !== -1) {
        for (let i = 1; i < storeRows.length; i++) {
          const row = storeRows[i];
          const websiteValue = row[websiteIndex]?.toString() || "";
          const normalizedExisting = normalizeUrl(websiteValue);
          if (normalizedExisting && normalizedInputUrls.has(normalizedExisting)) {
            duplicates.push(normalizedInputUrls.get(normalizedExisting)!);
          }
        }
      }
    }
  } else {
    const { leads } = await storage.listQualificationLeads(tenantId, { limit: 10000 });
    for (const lead of leads) {
      if (lead.website) {
        const normalizedExisting = normalizeUrl(lead.website);
        if (normalizedExisting && normalizedInputUrls.has(normalizedExisting)) {
          duplicates.push(normalizedInputUrls.get(normalizedExisting)!);
        }
      }
    }
  }

  return [...new Set(duplicates)];
}
