import crypto from 'crypto';

interface CacheEntry<T> {
  hash: string;
  data: T;
  timestamp: number;
}

const caches = new Map<string, CacheEntry<any>>();

export function computeHash(data: any): string {
  const content = JSON.stringify(data);
  return crypto.createHash('md5').update(content).digest('hex');
}

export function getCached<T>(key: string, currentHash: string): T | null {
  const entry = caches.get(key);
  if (!entry) return null;
  
  if (entry.hash === currentHash) {
    return entry.data as T;
  }
  
  return null;
}

export function setCache<T>(key: string, hash: string, data: T): void {
  caches.set(key, {
    hash,
    data,
    timestamp: Date.now(),
  });
}

export function getCacheStats(): { key: string; age: number; hash: string }[] {
  const now = Date.now();
  return Array.from(caches.entries()).map(([key, entry]) => ({
    key,
    age: Math.round((now - entry.timestamp) / 1000),
    hash: entry.hash.substring(0, 8),
  }));
}

export function clearCache(key?: string): void {
  if (key) {
    caches.delete(key);
  } else {
    caches.clear();
  }
}
