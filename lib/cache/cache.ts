import { getRedisClient } from '@/lib/redis';

// Shared Redis cache (accessible across all server instances)
// Falls back gracefully if Redis is unavailable

/**
 * Set a value in the cache with TTL
 * @param key Cache key
 * @param value Value to cache (must be JSON-serializable)
 * @param ttlMs Time to live in milliseconds
 */
export async function setCache<T>(key: string, value: T, ttlMs: number): Promise<void> {
    try {
        const client = getRedisClient();
        const serialized = JSON.stringify(value);
        // Convert milliseconds to seconds (Redis uses seconds)
        const ttlSeconds = Math.ceil(ttlMs / 1000);

        await client.setex(key, ttlSeconds, serialized);
    } catch (error) {
        // Fail silently - log warning but don't throw
        // This allows the application to continue even if Redis is unavailable
        console.warn(`[Cache] Failed to set cache key "${key}":`, error instanceof Error ? error.message : 'Unknown error');
    }
}

/**
 * Get a value from the cache
 * @param key Cache key
 * @returns Cached value or null if not found/expired
 */
export async function getCache<T>(key: string): Promise<T | null> {
    try {
        const client = getRedisClient();
        const serialized = await client.get(key);

        if (!serialized) {
            return null;
        }

        return JSON.parse(serialized) as T;
    } catch (error) {
        // Fail silently - log warning but return null
        // This allows the application to continue even if Redis is unavailable
        console.warn(`[Cache] Failed to get cache key "${key}":`, error instanceof Error ? error.message : 'Unknown error');
        return null;
    }
}

/**
 * Clear a specific cache key
 * @param key Cache key to delete
 */
export async function clearCache(key: string): Promise<void> {
    try {
        const client = getRedisClient();
        await client.del(key);
    } catch (error) {
        // Fail silently - log warning but don't throw
        console.warn(`[Cache] Failed to clear cache key "${key}":`, error instanceof Error ? error.message : 'Unknown error');
    }
}

/**
 * Clear all cache entries that start with a given prefix
 * @param prefix Prefix to match keys
 */
export async function clearCacheByPrefix(prefix: string): Promise<void> {
    try {
        const client = getRedisClient();

        // Use SCAN instead of KEYS for better performance with large datasets
        const stream = client.scanStream({
            match: `${prefix}*`,
            count: 100,
        });

        const keysToDelete: string[] = [];

        stream.on('data', (keys: string[]) => {
            keysToDelete.push(...keys);
        });

        await new Promise<void>((resolve, reject) => {
            stream.on('end', () => {
                resolve();
            });
            stream.on('error', (err) => {
                reject(err);
            });
        });

        if (keysToDelete.length > 0) {
            // Delete all keys in batches
            await client.del(...keysToDelete);
        }
    } catch (error) {
        // Fail silently - log warning but don't throw
        console.warn(`[Cache] Failed to clear cache by prefix "${prefix}":`, error instanceof Error ? error.message : 'Unknown error');
    }
}

