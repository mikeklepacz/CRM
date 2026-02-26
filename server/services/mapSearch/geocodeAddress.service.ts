type Deps = {
  db: any;
  eq: any;
  geocodeCacheTable: any;
  memoryGeocodeCache?: Map<string, { lat: number; lng: number } | null>;
};

export function createGeocodeAddressFn(deps: Deps) {
  const { db, eq, geocodeCacheTable } = deps;
  const memoryGeocodeCache = deps.memoryGeocodeCache ?? new Map<string, { lat: number; lng: number } | null>();

  return async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    if (memoryGeocodeCache.has(address)) {
      return memoryGeocodeCache.get(address)!;
    }

    try {
      const dbResult = await db
        .select()
        .from(geocodeCacheTable)
        .where(eq(geocodeCacheTable.address, address))
        .limit(1);
      if (dbResult.length > 0) {
        const cached = { lat: parseFloat(dbResult[0].lat), lng: parseFloat(dbResult[0].lng) };
        memoryGeocodeCache.set(address, cached);
        return cached;
      }
    } catch {
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const result = { lat: location.lat, lng: location.lng };
        memoryGeocodeCache.set(address, result);

        try {
          await db
            .insert(geocodeCacheTable)
            .values({ address, lat: result.lat.toString(), lng: result.lng.toString() })
            .onConflictDoNothing();
        } catch {
        }

        return result;
      }

      memoryGeocodeCache.set(address, null);
      return null;
    } catch (error) {
      console.error("Geocoding failed for:", address, error);
      memoryGeocodeCache.set(address, null);
      return null;
    }
  };
}
