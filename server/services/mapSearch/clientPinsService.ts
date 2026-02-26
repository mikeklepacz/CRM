import { inArray } from "drizzle-orm";
import { geocodeCache as geocodeCacheTable } from "@shared/schema";
import { db } from "../../db";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

type GeocodeFn = (address: string) => Promise<{ lat: number; lng: number } | null>;
type PrimeCacheFn = (address: string, coords: { lat: number; lng: number }) => void;

type Params = {
  storeSheetId: string;
  trackerSheetId: string;
  joinColumn: string;
  state: string;
  city?: string;
  tenantId?: string;
  userId?: string;
};

function getField(row: Record<string, any>, fieldName: string): string {
  const key = Object.keys(row).find((item) => item.toLowerCase() === fieldName.toLowerCase());
  return key ? (row[key] || "").toString().trim() : "";
}

export async function buildClientPins(
  params: Params,
  deps: { geocodeAddress: GeocodeFn; primeGeocodeCache: PrimeCacheFn }
): Promise<any[]> {
  const { storeSheetId, trackerSheetId, joinColumn, state, city, tenantId, userId } = params;

  const currentUser = userId ? await storage.getUser(userId) : null;
  const isAdminUser = currentUser?.isSuperAdmin || currentUser?.role === "admin";

  let isOrgAdmin = false;
  if (!isAdminUser && tenantId && userId) {
    const roleInTenant = await storage.getUserTenantRole(userId, tenantId);
    isOrgAdmin = roleInTenant === "org_admin";
  }

  const canSeeAll = isAdminUser || isOrgAdmin;
  const currentAgentName = currentUser?.agentName || "";
  const storeSheet = await storage.getGoogleSheetById(storeSheetId, tenantId as string);
  const trackerSheet = await storage.getGoogleSheetById(trackerSheetId, tenantId as string);

  if (!storeSheet || !trackerSheet) {
    throw new Error("One or both sheets not found");
  }

  const storeRange = `${storeSheet.sheetName}!A:ZZ`;
  const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
  const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);
  const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

  if (storeRows.length === 0) {
    return [];
  }

  const storeHeaders = storeRows[0];
  const storeData = storeRows.slice(1).map((row, index) => {
    const obj: any = { _storeRowIndex: index + 2, _storeSheetId: storeSheetId };
    storeHeaders.forEach((header, i) => {
      obj[header] = row[i] || "";
    });
    return obj;
  });

  const trackerHeaders = trackerRows.length > 0 ? trackerRows[0] : [];
  const trackerData =
    trackerRows.length > 1
      ? trackerRows.slice(1).map((row, index) => {
          const obj: any = { _trackerRowIndex: index + 2, _trackerSheetId: trackerSheetId };
          trackerHeaders.forEach((header, i) => {
            obj[header] = row[i] || "";
          });
          return obj;
        })
      : [];

  const actualStoreJoinColumn = storeHeaders.find((header) => header.toLowerCase() === joinColumn.toLowerCase()) || joinColumn;
  const actualTrackerJoinColumn = trackerHeaders.find((header) => header.toLowerCase() === joinColumn.toLowerCase()) || joinColumn;

  const trackerMap = new Map<string, any>();
  trackerData.forEach((row) => {
    const key = (row[actualTrackerJoinColumn] || "").toString().trim().toLowerCase();
    if (key) trackerMap.set(key, row);
  });

  const mergedData = storeData.map((storeRow) => {
    const joinValue = (storeRow[actualStoreJoinColumn] || "").toString().trim().toLowerCase();
    const trackerRow = joinValue ? trackerMap.get(joinValue) : undefined;
    return trackerRow ? { ...storeRow, ...trackerRow } : storeRow;
  });

  let filtered = mergedData.filter((row) => {
    const rowState = getField(row, "state") || getField(row, "province") || getField(row, "region");
    return rowState.toLowerCase() === state.toLowerCase();
  });

  if (city) {
    const cityLower = city.toLowerCase();
    filtered = filtered.filter((row) => getField(row, "city").toLowerCase().includes(cityLower));
  }

  if (!canSeeAll) {
    filtered = filtered.filter((row) => {
      const rowAgentName = getField(row, "agent name");
      if (!rowAgentName) return true;
      return currentAgentName && rowAgentName.toLowerCase() === currentAgentName.toLowerCase();
    });
  }

  const allAddresses = [
    ...new Set(
      filtered
        .map((row) => [getField(row, "address"), getField(row, "city"), getField(row, "state")].filter(Boolean).join(", "))
        .filter(Boolean)
    ),
  ];

  if (allAddresses.length > 0) {
    try {
      const cachedRows = await db.select().from(geocodeCacheTable).where(inArray(geocodeCacheTable.address, allAddresses));
      for (const cached of cachedRows) {
        deps.primeGeocodeCache(cached.address, { lat: parseFloat(cached.lat), lng: parseFloat(cached.lng) });
      }
    } catch (_error: any) {
      // Geocode cache warm-up is best effort.
    }
  }

  const results: Array<{ name: string; address: string; city: string; state: string; status: string; lat: number; lng: number; row: any }> = [];
  const batchSize = 10;

  for (let i = 0; i < filtered.length; i += batchSize) {
    const batch = filtered.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (row) => {
        const rowAddress = getField(row, "address");
        const rowCity = getField(row, "city");
        const rowState = getField(row, "state");
        const fullAddress = [rowAddress, rowCity, rowState].filter(Boolean).join(", ");
        if (!fullAddress) return null;

        const coords = await deps.geocodeAddress(fullAddress);
        if (!coords) return null;

        return {
          name: getField(row, "name") || getField(row, "company") || getField(row, "business name") || "Unknown",
          address: rowAddress,
          city: rowCity,
          state: rowState,
          status: getField(row, "status"),
          lat: coords.lat,
          lng: coords.lng,
          row,
        };
      })
    );

    for (const item of batchResults) {
      if (item) results.push(item);
    }
  }

  return results;
}
