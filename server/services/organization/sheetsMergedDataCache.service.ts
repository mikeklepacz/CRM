interface CacheEntry {
  data: any;
  timestamp: number;
}

export function createSheetsMergedDataCache(cacheTtlMs: number = 30000) {
  const sheetsCache = new Map<string, CacheEntry>();

  function generateCacheKey(
    userId: string,
    storeSheetId: string,
    trackerSheetId: string,
    category: string | null,
    projectId?: string
  ): string {
    return `${userId}:${storeSheetId}:${trackerSheetId}:${category || "all"}:${projectId || "all-projects"}`;
  }

  function getCachedData(key: string): any | null {
    const entry = sheetsCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > cacheTtlMs) {
      sheetsCache.delete(key);
      return null;
    }

    return entry.data;
  }

  function setCachedData(key: string, data: any): void {
    sheetsCache.set(key, { data, timestamp: Date.now() });
  }

  function clearUserCache(userId: string): void {
    for (const key of Array.from(sheetsCache.keys())) {
      if (key.startsWith(`${userId}:`)) {
        sheetsCache.delete(key);
      }
    }
  }

  return { clearUserCache, generateCacheKey, getCachedData, setCachedData };
}
