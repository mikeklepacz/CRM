import type { EhubContact } from '../../../shared/schema';

interface TenantCache {
  contacts: EhubContact[];
  timestamp: number;
}

const tenantCacheMap = new Map<string, TenantCache>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getCachedContacts(cacheKey: string): EhubContact[] | null {
  const now = Date.now();
  const tenantCache = tenantCacheMap.get(cacheKey);
  const cacheValid = tenantCache && (now - tenantCache.timestamp < CACHE_TTL_MS);
  return cacheValid ? tenantCache.contacts : null;
}

export function setCachedContacts(cacheKey: string, contacts: EhubContact[]): void {
  tenantCacheMap.set(cacheKey, { contacts, timestamp: Date.now() });
}

export function invalidateCache(tenantId?: string): void {
  if (tenantId) {
    for (const key of tenantCacheMap.keys()) {
      if (key === tenantId || key.startsWith(`${tenantId}:`)) {
        tenantCacheMap.delete(key);
      }
    }
  } else {
    tenantCacheMap.clear();
  }
}
