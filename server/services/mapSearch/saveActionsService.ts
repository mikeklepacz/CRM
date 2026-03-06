import * as googleMaps from "../../googleMaps";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { buildSheetRange } from "../sheets/a1Range";
import { resolveStoreDatabaseSheet } from "../sheets/storeDatabaseResolver";

const RETRYABLE_HTTP_CODES = new Set([408, 429, 500, 502, 503, 504]);

function formatHours(weekdayText?: string[]): string {
  if (!weekdayText || weekdayText.length === 0) return "";
  return weekdayText[0] || "";
}

function normalizeWebsite(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return trimmed;
  }
}

function isRetryableError(error: any): boolean {
  const status = Number(error?.status || error?.code || error?.response?.status);
  if (Number.isFinite(status) && RETRYABLE_HTTP_CODES.has(status)) {
    return true;
  }

  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("backenderror") ||
    message.includes("internal error")
  );
}

async function withRetry<T>(operation: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }
      const delayMs = 250 * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

export async function saveMapPlaceToStoreSheet(params: {
  placeId: string;
  tenantId: string;
  category?: string;
  projectId?: string;
}): Promise<{ message: string; place: any }> {
  const { placeId, tenantId, category, projectId } = params;
  const placeDetails = await withRetry(() => googleMaps.getPlaceDetails(placeId));
  if (!placeDetails) {
    throw new Error("Place not found");
  }
  if (placeDetails.business_status === "CLOSED_PERMANENTLY") {
    throw new Error("Cannot import permanently closed business");
  }

  const { street, city, state, zip, country } = googleMaps.extractAddressFromComponents(
    placeDetails.address_components,
    placeDetails.formatted_address
  );

  let effectiveCategory = category;
  if (projectId) {
    const project = await storage.getTenantProjectById(projectId, tenantId);
    if (project) {
      effectiveCategory = project.name;
    }
  }
  if (!effectiveCategory) {
    throw new Error("Category or valid projectId is required");
  }

  if (effectiveCategory.trim()) {
    await storage.getOrCreateCategoryByName(tenantId, effectiveCategory.trim(), projectId);
  }

  const storeSheet = await resolveStoreDatabaseSheet({
    tenantId,
    projectId,
    preferProjectMatch: true,
    requireProjectMatch: !!projectId,
  });
  if (!storeSheet) {
    if (projectId) {
      throw new Error("Store Database sheet for this project not found. Create or connect a matching tab first.");
    }
    throw new Error("Store Database sheet not found. Please connect a Google Sheet first.");
  }

  const headerRange = buildSheetRange(storeSheet.sheetName, "1:1");
  const headerRows = await withRetry(() => googleSheets.readSheetData(storeSheet.spreadsheetId, headerRange));
  if (!headerRows || headerRows.length === 0) {
    throw new Error("Store Database sheet is empty or has no headers");
  }

  const allHeaders = headerRows[0];
  const headers = allHeaders.filter((header) => header && header.trim() !== "");
  const findColumnIndex = (columnName: string) =>
    headers.findIndex((header: string) => header.toLowerCase() === columnName.toLowerCase());

  const row = new Array(headers.length).fill("");
  const nameIndex = findColumnIndex("name");
  const typeIndex = findColumnIndex("type");
  const linkIndex = findColumnIndex("link");
  const addressIndex = findColumnIndex("address");
  const cityIndex = findColumnIndex("city");
  const stateIndex = findColumnIndex("state");
  const zipIndex = findColumnIndex("zip");
  const phoneIndex = findColumnIndex("phone");
  const websiteIndex = findColumnIndex("website");
  const hoursIndex = findColumnIndex("hours");
  const openIndex = findColumnIndex("open");
  const categoryIndex = findColumnIndex("category");
  const countryIndex = findColumnIndex("country");

  if (nameIndex !== -1) row[nameIndex] = placeDetails.name || "";
  if (typeIndex !== -1) row[typeIndex] = placeDetails.types?.[0] || "";
  if (linkIndex !== -1) row[linkIndex] = placeDetails.url || `https://www.google.com/maps/place/?q=place_id:${placeDetails.place_id}`;
  if (addressIndex !== -1) row[addressIndex] = street;
  if (cityIndex !== -1) row[cityIndex] = city;
  if (stateIndex !== -1) row[stateIndex] = state;
  if (zipIndex !== -1) row[zipIndex] = zip;
  if (phoneIndex !== -1) row[phoneIndex] = placeDetails.formatted_phone_number || placeDetails.international_phone_number || "";
  if (websiteIndex !== -1) row[websiteIndex] = normalizeWebsite(placeDetails.website);
  if (hoursIndex !== -1) row[hoursIndex] = formatHours(placeDetails.opening_hours?.weekday_text);
  if (openIndex !== -1) row[openIndex] = placeDetails.business_status === "OPERATIONAL" ? "TRUE" : "FALSE";
  if (categoryIndex !== -1) row[categoryIndex] = effectiveCategory;
  if (countryIndex !== -1) row[countryIndex] = country;

  await withRetry(() =>
    googleSheets.appendSheetData(storeSheet.spreadsheetId, buildSheetRange(storeSheet.sheetName, "A:ZZ"), [row])
  );
  await storage.recordImportedPlace(placeId, tenantId);

  return {
    message: "Place saved successfully to Store Database",
    place: {
      name: placeDetails.name,
      address: placeDetails.formatted_address,
      category: effectiveCategory,
    },
  };
}

export async function saveMapPlaceToQualification(params: {
  placeId: string;
  tenantId: string;
  category?: string;
  projectId?: string;
}): Promise<{ message: string; lead: any }> {
  const { placeId, tenantId, category, projectId } = params;
  const placeDetails = await withRetry(() => googleMaps.getPlaceDetails(placeId));
  if (!placeDetails) {
    throw new Error("Place not found");
  }
  if (placeDetails.business_status === "CLOSED_PERMANENTLY") {
    throw new Error("Cannot import permanently closed business");
  }

  const { street, city, state, zip, country: extractedCountry } = googleMaps.extractAddressFromComponents(
    placeDetails.address_components,
    placeDetails.formatted_address
  );
  const country = extractedCountry || "United States";

  let countryCode = "US";
  if (placeDetails.address_components) {
    const countryComponent = placeDetails.address_components.find((component: any) =>
      component.types?.includes("country")
    );
    if (countryComponent) {
      countryCode = countryComponent.short_name || countryCode;
    }
  }

  let effectiveCategory = category;
  if (projectId) {
    const project = await storage.getTenantProjectById(projectId, tenantId);
    if (project) {
      effectiveCategory = project.name;
    }
  }
  if (!effectiveCategory) {
    throw new Error("Category or valid projectId is required");
  }

  if (effectiveCategory.trim()) {
    await storage.getOrCreateCategoryByName(tenantId, effectiveCategory.trim(), projectId);
  }

  const leadData = {
    tenantId,
    company: placeDetails.name || "Unknown Business",
    website: normalizeWebsite(placeDetails.website) || null,
    googleMapsUrl: placeDetails.url || null,
    category: effectiveCategory || null,
    projectId: projectId || null,
    pocPhone: placeDetails.formatted_phone_number || placeDetails.international_phone_number || null,
    address: street || null,
    city: city || null,
    state: state || null,
    postalCode: zip || null,
    country,
    countryCode,
    latitude: placeDetails.geometry?.location?.lat != null ? String(placeDetails.geometry.location.lat) : null,
    longitude: placeDetails.geometry?.location?.lng != null ? String(placeDetails.geometry.location.lng) : null,
    businessStatus: placeDetails.business_status || null,
    businessHours: placeDetails.opening_hours?.weekday_text?.join(" | ") || null,
    source: "map_search",
    callStatus: "pending",
    tags: placeDetails.types || [],
  };

  const createdLead = await storage.createQualificationLead(leadData);
  await storage.recordImportedPlace(placeId, tenantId);

  return {
    message: "Lead saved successfully to Qualification Leads",
    lead: {
      id: createdLead.id,
      company: createdLead.company,
      city: createdLead.city,
      state: createdLead.state,
      category: createdLead.category,
    },
  };
}
