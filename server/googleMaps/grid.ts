import fetch from "node-fetch";
import { GOOGLE_MAPS_API_KEY } from "./constants";
import { geocodeBounds } from "./geocode";
import { searchPlaces } from "./placesApi";
import type { GeoBounds, GridSearchProgress, GridSearchResponse, GridZone, PlaceSearchResult } from "./types";

export function createGridZones(bounds: GeoBounds, gridSize: number = 3): GridZone[] {
  const { northeast, southwest } = bounds;

  const latRange = northeast.lat - southwest.lat;
  const lngRange = northeast.lng - southwest.lng;

  const latStep = latRange / gridSize;
  const lngStep = lngRange / gridSize;

  const zones: GridZone[] = [];
  let index = 0;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const centerLat = southwest.lat + (row + 0.5) * latStep;
      const centerLng = southwest.lng + (col + 0.5) * lngStep;

      zones.push({
        center: { lat: centerLat, lng: centerLng },
        index: index++,
      });
    }
  }

  return zones;
}

export function calculateGridSize(bounds: GeoBounds): number {
  const { northeast, southwest } = bounds;

  const latDiff = Math.abs(northeast.lat - southwest.lat);
  const lngDiff = Math.abs(northeast.lng - southwest.lng);

  const avgLat = (northeast.lat + southwest.lat) / 2;
  const kmPerDegreeLng = 111 * Math.cos((avgLat * Math.PI) / 180);

  const heightKm = latDiff * 111;
  const widthKm = lngDiff * kmPerDegreeLng;
  const areaKm2 = heightKm * widthKm;

  if (areaKm2 > 5000) return 4;
  if (areaKm2 > 1000) return 3;
  if (areaKm2 > 200) return 2;
  return 1;
}

async function searchZoneWithPagination(
  query: string,
  zoneCenter: { lat: number; lng: number },
  excludedTypes?: string[],
): Promise<PlaceSearchResult[]> {
  const allResults: PlaceSearchResult[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;
  const maxPages = 3;

  do {
    try {
      const requestBody: any = {
        textQuery: query,
        maxResultCount: 20,
        locationBias: {
          circle: {
            center: {
              latitude: zoneCenter.lat,
              longitude: zoneCenter.lng,
            },
            radius: 15000,
          },
        },
      };

      if (excludedTypes && excludedTypes.length > 0) {
        requestBody.excludedTypes = excludedTypes;
      }

      if (pageToken) {
        requestBody.pageToken = pageToken;
      }

      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.businessStatus,places.rating,places.userRatingCount,nextPageToken",
        },
        body: JSON.stringify(requestBody),
      });

      const data: any = await response.json();

      if (!response.ok) {
        console.error(`Zone search error: ${response.status} - ${data.error?.message}`);
        break;
      }

      if (data.places && data.places.length > 0) {
        const results = data.places.map((place: any) => ({
          place_id: place.id.replace("places/", ""),
          name: place.displayName?.text || "",
          formatted_address: place.formattedAddress || "",
          geometry: {
            location: {
              lat: place.location?.latitude || 0,
              lng: place.location?.longitude || 0,
            },
          },
          types: place.types || [],
          business_status: place.businessStatus || "OPERATIONAL",
          rating: place.rating,
          user_ratings_total: place.userRatingCount,
        }));
        allResults.push(...results);
      }

      pageToken = data.nextPageToken;
      pageCount++;

      if (pageToken && pageCount < maxPages) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error("Error in zone search:", error);
      break;
    }
  } while (pageToken && pageCount < maxPages);

  return allResults;
}

export async function gridSearch(
  query: string,
  location: string,
  excludedTypes?: string[],
  onProgress?: (progress: GridSearchProgress) => void,
): Promise<GridSearchResponse> {
  const geocodeResult = await geocodeBounds(location);

  if (!geocodeResult) {
    const regularSearch = await searchPlaces(query, location, excludedTypes);
    return {
      results: regularSearch.results,
      totalZones: 1,
      duplicatesRemoved: 0,
    };
  }

  const gridSize = calculateGridSize(geocodeResult.bounds);

  if (gridSize === 1) {
    const regularSearch = await searchPlaces(query, location, excludedTypes);
    return {
      results: regularSearch.results,
      totalZones: 1,
      duplicatesRemoved: 0,
    };
  }

  const zones = createGridZones(geocodeResult.bounds, gridSize);
  const totalZones = zones.length;

  console.log(`[GridSearch] Searching ${location} with ${totalZones} zones (${gridSize}x${gridSize} grid)`);

  const allResults: PlaceSearchResult[] = [];
  const seenPlaceIds = new Set<string>();
  let duplicatesRemoved = 0;

  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];

    if (onProgress) {
      onProgress({
        currentZone: i + 1,
        totalZones,
        resultsFound: allResults.length,
      });
    }

    console.log(`[GridSearch] Searching zone ${i + 1}/${totalZones} at (${zone.center.lat.toFixed(4)}, ${zone.center.lng.toFixed(4)})`);

    try {
      const zoneResults = await searchZoneWithPagination(query, zone.center, excludedTypes);

      for (const result of zoneResults) {
        if (!seenPlaceIds.has(result.place_id)) {
          seenPlaceIds.add(result.place_id);
          allResults.push(result);
        } else {
          duplicatesRemoved++;
        }
      }

      console.log(`[GridSearch] Zone ${i + 1}: found ${zoneResults.length} results (${allResults.length} unique total)`);

      if (i < zones.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error(`[GridSearch] Error searching zone ${i + 1}:`, error);
    }
  }

  console.log(`[GridSearch] Complete: ${allResults.length} unique results, ${duplicatesRemoved} duplicates removed`);

  return {
    results: allResults,
    totalZones,
    duplicatesRemoved,
  };
}
