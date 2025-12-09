type CacheEntry<T> = {
    value: T;
    expiresAt: number;
};

// In-memory TTL cache (per server instance)
const cache = new Map<string, CacheEntry<unknown>>();

export function setCache<T>(key: string, value: T, ttlMs: number) {
    const expiresAt = Date.now() + ttlMs;
    cache.set(key, { value, expiresAt });
}

export function getCache<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.value as T;
}

export function clearCache(key: string) {
    cache.delete(key);
}

// Clear all cache entries that start with a given prefix
export function clearCacheByPrefix(prefix: string) {
    // Use Array.from to avoid downlevel iteration issues
    const keysToDelete = Array.from(cache.keys()).filter((key) =>
        key.startsWith(prefix)
    );
    keysToDelete.forEach((key) => cache.delete(key));
}


