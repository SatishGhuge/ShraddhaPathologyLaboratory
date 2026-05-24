/**
 * Data Caching Service
 * Caches API responses with TTL (Time To Live)
 * Reduces redundant API calls and improves performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

// Default cache duration: 5 minutes
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000;

/**
 * Get cached data or fetch fresh data
 * @param key - Cache key identifier
 * @param fetchFn - Function to fetch data if not cached
 * @param duration - Cache duration in milliseconds (default: 5 minutes)
 * @returns Cached or fresh data
 */
export const getCachedData = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  duration: number = DEFAULT_CACHE_DURATION
): Promise<T> => {
  const cached = cache.get(key);

  // Return cached data if still valid
  if (cached && Date.now() - cached.timestamp < duration) {
    console.log(`✅ Cache HIT: ${key}`);
    return cached.data;
  }

  // Fetch fresh data
  console.log(`🔄 Cache MISS: ${key} - Fetching fresh data`);
  const data = await fetchFn();

  // Store in cache
  cache.set(key, { data, timestamp: Date.now() });

  return data;
};

/**
 * Clear specific cache entry or all cache
 * @param key - Cache key to clear (optional, clears all if not provided)
 */
export const clearCache = (key?: string): void => {
  if (key) {
    cache.delete(key);
    console.log(`🗑️ Cleared cache: ${key}`);
  } else {
    cache.clear();
    console.log(`🗑️ Cleared all cache`);
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: cache.size,
    entries: Array.from(cache.keys())
  };
};

/**
 * Preload cache with data
 * Useful for loading critical data on app startup
 */
export const preloadCache = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  duration?: number
): Promise<T> => {
  console.log(`📦 Preloading cache: ${key}`);
  return getCachedData(key, fetchFn, duration);
};
