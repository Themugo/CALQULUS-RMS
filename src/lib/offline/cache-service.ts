/**
 * Mobile Cache Service
 * 
 * Provides intelligent caching for mobile devices:
 * - Static asset caching
 * - API response caching
 * - Cache invalidation
 * - Cache size management
 */

import { cacheResponse, getCachedResponse, clearExpiredCache } from './database';

// Cache configuration
const CACHE_CONFIG = {
  // API response TTL (in seconds)
  apiTTL: {
    short: 60, // 1 minute - frequently changing data
    medium: 300, // 5 minutes - moderately changing data
    long: 3600, // 1 hour - rarely changing data
    veryLong: 86400, // 24 hours - static data
  },
  // Static asset TTL (in seconds)
  staticTTL: 86400, // 24 hours
  // Maximum cache size (in bytes)
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  // Cache cleanup interval (in milliseconds)
  cleanupInterval: 3600000, // 1 hour
};

// Cache categories
export enum CacheCategory {
  API = 'api',
  STATIC = 'static',
  USER_DATA = 'user_data',
  PROPERTY_DATA = 'property_data',
  PAYMENT_DATA = 'payment_data',
}

/**
 * Generate cache key
 */
function generateCacheKey(
  category: CacheCategory,
  identifier: string,
  params?: Record<string, unknown>
): string {
  const paramString = params ? JSON.stringify(params) : '';
  return `${category}:${identifier}:${paramString}`;
}

/**
 * Cache API response
 */
export async function cacheAPIResponse(
  endpoint: string,
  data: unknown,
  ttl: 'short' | 'medium' | 'long' | 'veryLong' = 'medium',
  params?: Record<string, unknown>
): Promise<void> {
  const key = generateCacheKey(CacheCategory.API, endpoint, params);
  const ttlSeconds = CACHE_CONFIG.apiTTL[ttl];
  await cacheResponse(key, data, ttlSeconds);
}

/**
 * Get cached API response
 */
export async function getCachedAPIResponse(
  endpoint: string,
  params?: Record<string, unknown>
): Promise<unknown | null> {
  const key = generateCacheKey(CacheCategory.API, endpoint, params);
  return getCachedResponse(key);
}

/**
 * Cache static asset
 */
export async function cacheStaticAsset(
  url: string,
  data: unknown
): Promise<void> {
  const key = generateCacheKey(CacheCategory.STATIC, url);
  await cacheResponse(key, data, CACHE_CONFIG.staticTTL);
}

/**
 * Get cached static asset
 */
export async function getCachedStaticAsset(url: string): Promise<unknown | null> {
  const key = generateCacheKey(CacheCategory.STATIC, url);
  return getCachedResponse(key);
}

/**
 * Cache user data
 */
export async function cacheUserData(
  userId: string,
  data: unknown
): Promise<void> {
  const key = generateCacheKey(CacheCategory.USER_DATA, userId);
  await cacheResponse(key, data, CACHE_CONFIG.apiTTL.medium);
}

/**
 * Get cached user data
 */
export async function getCachedUserData(userId: string): Promise<unknown | null> {
  const key = generateCacheKey(CacheCategory.USER_DATA, userId);
  return getCachedResponse(key);
}

/**
 * Cache property data
 */
export async function cachePropertyData(
  propertyId: string,
  data: unknown
): Promise<void> {
  const key = generateCacheKey(CacheCategory.PROPERTY_DATA, propertyId);
  await cacheResponse(key, data, CACHE_CONFIG.apiTTL.long);
}

/**
 * Get cached property data
 */
export async function getCachedPropertyData(
  propertyId: string
): Promise<unknown | null> {
  const key = generateCacheKey(CacheCategory.PROPERTY_DATA, propertyId);
  return getCachedResponse(key);
}

/**
 * Invalidate cache by category
 */
export async function invalidateCacheCategory(
  _category: CacheCategory
): Promise<void> {
  // This would require a more sophisticated implementation
  // For now, we'll clear expired cache
  await clearExpiredCache();
}

/**
 * Invalidate specific cache entry
 */
export async function invalidateCacheEntry(
  _category: CacheCategory,
  _identifier: string,
  _params?: Record<string, unknown>
): Promise<void> {
  // This would require a delete operation in the database
  // For now, we'll rely on TTL expiration
}

/**
 * Prefetch data for offline access
 */
export async function prefetchData(
  endpoints: Array<{
    endpoint: string;
    params?: Record<string, unknown>;
    ttl?: 'short' | 'medium' | 'long' | 'veryLong';
  }>
): Promise<void> {
  for (const { endpoint, params, ttl } of endpoints) {
    try {
      // Fetch data from API
      const response = await fetch(endpoint);
      const data = await response.json();
      
      // Cache the response
      await cacheAPIResponse(endpoint, data, ttl || 'medium', params);
    } catch (error) {
      console.error(`Failed to prefetch ${endpoint}:`, error);
    }
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  const { clearOfflineData } = await import('./database');
  await clearOfflineData();
}

/**
 * Get cache size
 */
export async function getCacheSize(): Promise<number> {
  const { getDatabaseSize } = await import('./database');
  return getDatabaseSize();
}

/**
 * Start cache cleanup
 */
export function startCacheCleanup(): void {
  setInterval(async () => {
    await clearExpiredCache();
    
    // Check cache size and clear old entries if needed
    const size = await getCacheSize();
    if (size > CACHE_CONFIG.maxCacheSize) {
      console.warn('Cache size exceeded, clearing old entries');
      // Implement LRU cache eviction
    }
  }, CACHE_CONFIG.cleanupInterval);
}

/**
 * Cache-aware fetch wrapper
 */
export async function cachedFetch(
  endpoint: string,
  options?: RequestInit & {
    cache?: 'short' | 'medium' | 'long' | 'veryLong';
    params?: Record<string, unknown>;
  }
): Promise<unknown> {
  const { cache = 'medium', params, ...fetchOptions } = options || {};

  // Try to get from cache first
  const cached = await getCachedAPIResponse(endpoint, params);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const response = await fetch(endpoint, fetchOptions);
  const data = await response.json();

  // Cache the response
  await cacheAPIResponse(endpoint, data, cache, params);

  return data;
}
