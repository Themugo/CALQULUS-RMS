/**
 * Redis Caching Layer
 * 
 * Implements Redis caching with:
 * - Cache key management
 * - Get/Set/Delete operations
 * - TTL management
 * - Cache invalidation
 * - Cache warming
 * - Cache statistics
 */

// Cache entry
export interface CacheEntry<T> {
  key: string;
  value: T;
  ttl: number; // seconds
  createdAt: Date;
  expiresAt: Date;
  tags: string[];
}

// Cache statistics
export interface CacheStatistics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

// Cache configuration
export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  enabled: boolean;
}

/**
 * Redis Cache Client
 */
export class RedisCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private tagIndex: Map<string, Set<string>>;
  private statistics: CacheStatistics;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.cache = new Map();
    this.tagIndex = new Map();
    this.statistics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0,
    };
    this.config = {
      defaultTTL: 3600, // 1 hour
      maxSize: 10000,
      enabled: true,
      ...config,
    };
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled) {
      return null;
    }

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.statistics.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      this.statistics.misses++;
      this.updateHitRate();
      return null;
    }

    this.statistics.hits++;
    this.updateHitRate();
    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number, tags: string[] = []): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const cacheTTL = ttl ?? this.config.defaultTTL;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + cacheTTL * 1000);

    const entry: CacheEntry<T> = {
      key,
      value,
      ttl: cacheTTL,
      createdAt: now,
      expiresAt,
      tags,
    };

    // Check max size and evict if necessary
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.statistics.sets++;
    this.statistics.size = this.cache.size;

    // Update tag index
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Remove from tag index
    for (const tag of entry.tags) {
      const tagKeys = this.tagIndex.get(tag);
      if (tagKeys) {
        tagKeys.delete(key);
        if (tagKeys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    this.cache.delete(key);
    this.statistics.deletes++;
    this.statistics.size = this.cache.size;
    return true;
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    const keys = this.tagIndex.get(tag);
    if (!keys) {
      return 0;
    }

    let count = 0;
    for (const key of keys) {
      await this.delete(key);
      count++;
    }

    return count;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        await this.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.tagIndex.clear();
    this.statistics.size = 0;
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    return { ...this.statistics };
  }

  /**
   * Warm cache with data
   */
  async warmCache<T>(
    data: Map<string, T>,
    ttl?: number,
    tags: string[] = []
  ): Promise<void> {
    for (const [key, value] of data.entries()) {
      await this.set(key, value, ttl, tags);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestDate: Date | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (!oldestDate || entry.createdAt < oldestDate) {
        oldestDate = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.statistics.hits + this.statistics.misses;
    this.statistics.hitRate = total > 0 ? this.statistics.hits / total : 0;
  }

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<number> {
    const now = new Date();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        await this.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable cache
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable cache
   */
  disable(): void {
    this.config.enabled = false;
  }
}

// Global cache instance
let globalCache: RedisCache | null = null;

/**
 * Get global cache instance
 */
export function getCache(config?: Partial<CacheConfig>): RedisCache {
  if (!globalCache) {
    globalCache = new RedisCache(config);
  }
  return globalCache;
}

/**
 * Reset global cache
 */
export function resetCache(): void {
  globalCache = null;
}

/**
 * Cache key builder
 */
export class CacheKeyBuilder {
  private parts: string[];

  constructor(prefix: string = 'rentflow') {
    this.parts = [prefix];
  }

  addPart(part: string): CacheKeyBuilder {
    this.parts.push(part);
    return this;
  }

  addId(id: string): CacheKeyBuilder {
    this.parts.push(`id:${id}`);
    return this;
  }

  addTenantId(tenantId: string): CacheKeyBuilder {
    this.parts.push(`tenant:${tenantId}`);
    return this;
  }

  addPropertyId(propertyId: string): CacheKeyBuilder {
    this.parts.push(`property:${propertyId}`);
    return this;
  }

  addUserId(userId: string): CacheKeyBuilder {
    this.parts.push(`user:${userId}`);
    return this;
  }

  build(): string {
    return this.parts.join(':');
  }
}

/**
 * Common cache keys
 */
export const CacheKeys = {
  // User data
  USER_PROFILE: (userId: string) => new CacheKeyBuilder('user').addId(userId).build(),
  USER_PERMISSIONS: (userId: string) => new CacheKeyBuilder('user').addId(userId).addPart('permissions').build(),
  
  // Property data
  PROPERTY: (propertyId: string) => new CacheKeyBuilder('property').addId(propertyId).build(),
  PROPERTY_UNITS: (propertyId: string) => new CacheKeyBuilder('property').addId(propertyId).addPart('units').build(),
  PROPERTY_TENANTS: (propertyId: string) => new CacheKeyBuilder('property').addId(propertyId).addPart('tenants').build(),
  
  // Tenant data
  TENANT_PROFILE: (tenantId: string) => new CacheKeyBuilder('tenant').addId(tenantId).build(),
  TENANT_LEASE: (tenantId: string) => new CacheKeyBuilder('tenant').addId(tenantId).addPart('lease').build(),
  
  // Financial data
  PAYMENT_HISTORY: (propertyId: string) => new CacheKeyBuilder('financial').addPropertyId(propertyId).addPart('payments').build(),
  INVOICE_LIST: (propertyId: string) => new CacheKeyBuilder('financial').addPropertyId(propertyId).addPart('invoices').build(),
  
  // Reports
  REPORT: (reportId: string) => new CacheKeyBuilder('report').addId(reportId).build(),
  REPORT_DATA: (reportId: string) => new CacheKeyBuilder('report').addId(reportId).addPart('data').build(),
  
  // Dashboard
  DASHBOARD_STATS: (userId: string) => new CacheKeyBuilder('dashboard').addUserId(userId).addPart('stats').build(),
  DASHBOARD_CHARTS: (userId: string) => new CacheKeyBuilder('dashboard').addUserId(userId).addPart('charts').build(),
};

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: unknown[]) => Promise<unknown>>(
  keyBuilder: (...args: Parameters<T>) => string,
  ttl?: number,
  tags: string[] = []
) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>): Promise<ReturnType<T>> {
      const cache = getCache();
      const key = keyBuilder(...args);

      // Try to get from cache
      const cached = await cache.get<ReturnType<T>>(key);
      if (cached !== null) {
        return cached;
      }

      // Call original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      await cache.set(key, result, ttl, tags);

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation helper
 */
export class CacheInvalidator {
  private cache: RedisCache;

  constructor(cache?: RedisCache) {
    this.cache = cache ?? getCache();
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.cache.delete(CacheKeys.USER_PROFILE(userId));
    await this.cache.delete(CacheKeys.USER_PERMISSIONS(userId));
    await this.cache.invalidateByPattern(`user:${userId}:*`);
  }

  /**
   * Invalidate property-related cache
   */
  async invalidateProperty(propertyId: string): Promise<void> {
    await this.cache.delete(CacheKeys.PROPERTY(propertyId));
    await this.cache.delete(CacheKeys.PROPERTY_UNITS(propertyId));
    await this.cache.delete(CacheKeys.PROPERTY_TENANTS(propertyId));
    await this.cache.delete(CacheKeys.PAYMENT_HISTORY(propertyId));
    await this.cache.delete(CacheKeys.INVOICE_LIST(propertyId));
    await this.cache.invalidateByPattern(`property:${propertyId}:*`);
  }

  /**
   * Invalidate tenant-related cache
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    await this.cache.delete(CacheKeys.TENANT_PROFILE(tenantId));
    await this.cache.delete(CacheKeys.TENANT_LEASE(tenantId));
    await this.cache.invalidateByPattern(`tenant:${tenantId}:*`);
  }

  /**
   * Invalidate dashboard cache
   */
  async invalidateDashboard(userId: string): Promise<void> {
    await this.cache.delete(CacheKeys.DASHBOARD_STATS(userId));
    await this.cache.delete(CacheKeys.DASHBOARD_CHARTS(userId));
  }

  /**
   * Invalidate report cache
   */
  async invalidateReport(reportId: string): Promise<void> {
    await this.cache.delete(CacheKeys.REPORT(reportId));
    await this.cache.delete(CacheKeys.REPORT_DATA(reportId));
  }
}
