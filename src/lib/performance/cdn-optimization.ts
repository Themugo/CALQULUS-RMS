/**
 * CDN Optimization
 * 
 * Implements CDN optimization with:
 * - Asset URL generation
 * - Cache control headers
 * - CDN invalidation
 * - Asset versioning
 * - CDN configuration
 * - Edge caching rules
 * - Performance monitoring
 */

// CDN configuration
export interface CDNConfig {
  provider: 'cloudflare' | 'aws-cloudfront' | 'fastly' | 'akamai' | 'custom';
  domain: string;
  zoneId?: string;
  apiKey?: string;
  enabled: boolean;
  cacheRules: CacheRule[];
}

// Cache rule
export interface CacheRule {
  pattern: string;
  ttl: number;
  bypassCacheOn?: string[];
}

// Asset info
export interface AssetInfo {
  path: string;
  version: string;
  mimeType: string;
  size: number;
  lastModified: Date;
}

// CDN statistics
export interface CDNStatistics {
  totalRequests: number;
  cachedRequests: number;
  cacheHitRate: number;
  bandwidthSaved: number;
  averageResponseTime: number;
}

/**
 * CDN Manager
 */
export class CDNManager {
  private config: CDNConfig;
  private assetVersions: Map<string, string>;
  private statistics: CDNStatistics;

  constructor(config: CDNConfig) {
    this.config = config;
    this.assetVersions = new Map();
    this.statistics = {
      totalRequests: 0,
      cachedRequests: 0,
      cacheHitRate: 0,
      bandwidthSaved: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Generate CDN URL for asset
   */
  generateURL(path: string, version?: string): string {
    if (!this.config.enabled) {
      return path;
    }

    const assetVersion = version || this.getAssetVersion(path);
    const versionedPath = this.addVersionToPath(path, assetVersion);
    
    return `https://${this.config.domain}${versionedPath}`;
  }

  /**
   * Add version to path
   */
  private addVersionToPath(path: string, version: string): string {
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    const dotIndex = filename.lastIndexOf('.');
    
    if (dotIndex === -1) {
      return `${path}?v=${version}`;
    }

    const name = filename.substring(0, dotIndex);
    const extension = filename.substring(dotIndex);
    parts[parts.length - 1] = `${name}.${version}${extension}`;
    
    return parts.join('/');
  }

  /**
   * Get asset version
   */
  private getAssetVersion(path: string): string {
    if (this.assetVersions.has(path)) {
      return this.assetVersions.get(path)!;
    }
    
    // Generate version from timestamp
    const version = Date.now().toString();
    this.assetVersions.set(path, version);
    
    return version;
  }

  /**
   * Set asset version
   */
  setAssetVersion(path: string, version: string): void {
    this.assetVersions.set(path, version);
  }

  /**
   * Bump asset version
   */
  bumpAssetVersion(path: string): string {
    const currentVersion = this.getAssetVersion(path);
    const newVersion = (parseInt(currentVersion) + 1).toString();
    this.setAssetVersion(path, newVersion);
    
    return newVersion;
  }

  /**
   * Invalidate CDN cache
   */
  async invalidateCache(pattern: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    // In production, this would call the CDN provider's API
    // For now, we'll simulate the invalidation
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clear local version cache for matching assets
      for (const [path] of this.assetVersions.entries()) {
        if (path.includes(pattern) || pattern.includes(path)) {
          this.bumpAssetVersion(path);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to invalidate CDN cache:', error);
      return false;
    }
  }

  /**
   * Purge all cache
   */
  async purgeAllCache(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Bump all asset versions
      for (const path of this.assetVersions.keys()) {
        this.bumpAssetVersion(path);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to purge CDN cache:', error);
      return false;
    }
  }

  /**
   * Get cache control headers
   */
  getCacheHeaders(mimeType: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    // Adjust based on asset type
    if (mimeType.startsWith('image/')) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else if (mimeType.startsWith('text/css') || mimeType === 'application/javascript') {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else if (mimeType.startsWith('text/html')) {
      headers['Cache-Control'] = 'public, max-age=3600';
    } else {
      headers['Cache-Control'] = 'public, max-age=86400';
    }

    return headers;
  }

  /**
   * Get CDN statistics
   */
  getStatistics(): CDNStatistics {
    return { ...this.statistics };
  }

  /**
   * Update statistics
   */
  updateStatistics(cached: boolean, responseTime: number, size: number): void {
    this.statistics.totalRequests++;
    
    if (cached) {
      this.statistics.cachedRequests++;
      this.statistics.bandwidthSaved += size;
    }
    
    // Update average response time
    const totalTime = this.statistics.averageResponseTime * (this.statistics.totalRequests - 1) + responseTime;
    this.statistics.averageResponseTime = totalTime / this.statistics.totalRequests;
    
    // Update cache hit rate
    this.statistics.cacheHitRate = this.statistics.cachedRequests / this.statistics.totalRequests;
  }

  /**
   * Enable CDN
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable CDN
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// Global CDN manager instance
let globalCDNManager: CDNManager | null = null;

/**
 * Get global CDN manager instance
 */
export function getCDNManager(config?: CDNConfig): CDNManager {
  if (!globalCDNManager) {
    const defaultConfig: CDNConfig = {
      provider: 'custom',
      domain: 'cdn.rentflow.ink',
      enabled: true,
      cacheRules: [],
    };
    globalCDNManager = new CDNManager(config || defaultConfig);
  }
  return globalCDNManager;
}

/**
 * Reset global CDN manager
 */
export function resetCDNManager(): void {
  globalCDNManager = null;
}

/**
 * Asset URL builder
 */
export class AssetURLBuilder {
  private cdnManager: CDNManager;

  constructor(cdnManager?: CDNManager) {
    this.cdnManager = cdnManager ?? getCDNManager();
  }

  /**
   * Build asset URL
   */
  buildURL(path: string, version?: string): string {
    return this.cdnManager.generateURL(path, version);
  }

  /**
   * Build image URL
   */
  buildImageURL(path: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
  }): string {
    let url = this.cdnManager.generateURL(path);
    
    if (options) {
      const params: string[] = [];
      
      if (options.width) params.push(`w=${options.width}`);
      if (options.height) params.push(`h=${options.height}`);
      if (options.quality) params.push(`q=${options.quality}`);
      if (options.format) params.push(`f=${options.format}`);
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
    }
    
    return url;
  }

  /**
   * Build script URL
   */
  buildScriptURL(path: string, version?: string): string {
    return this.cdnManager.generateURL(path, version);
  }

  /**
   * Build stylesheet URL
   */
  buildStylesheetURL(path: string, version?: string): string {
    return this.cdnManager.generateURL(path, version);
  }

  /**
   * Build font URL
   */
  buildFontURL(path: string, version?: string): string {
    return this.cdnManager.generateURL(path, version);
  }
}

/**
 * Common asset paths
 */
export const AssetPaths = {
  // Images
  LOGO: '/assets/images/logo.svg',
  FAVICON: '/assets/images/favicon.ico',
  DEFAULT_PROPERTY_IMAGE: '/assets/images/default-property.jpg',
  DEFAULT_AVATAR: '/assets/images/default-avatar.png',
  
  // Scripts
  MAIN_JS: '/assets/js/main.js',
  VENDOR_JS: '/assets/js/vendor.js',
  
  // Stylesheets
  MAIN_CSS: '/assets/css/main.css',
  VENDOR_CSS: '/assets/css/vendor.css',
  
  // Fonts
  INTER_FONT: '/assets/fonts/inter.woff2',
  ROBOTO_FONT: '/assets/fonts/roboto.woff2',
};

/**
 * Cache control helper
 */
export class CacheControlHelper {
  /**
   * Get cache control header
   */
  static getHeader(mimeType: string, maxAge?: number): string {
    const defaultMaxAge = maxAge || this.getDefaultMaxAge(mimeType);
    return `public, max-age=${defaultMaxAge}`;
  }

  /**
   * Get default max age based on MIME type
   */
  private static getDefaultMaxAge(mimeType: string): number {
    if (mimeType.startsWith('image/')) {
      return 31536000; // 1 year
    }
    
    if (mimeType === 'text/css' || mimeType === 'application/javascript') {
      return 31536000; // 1 year
    }
    
    if (mimeType.startsWith('text/html')) {
      return 3600; // 1 hour
    }
    
    if (mimeType.startsWith('application/json')) {
      return 300; // 5 minutes
    }
    
    return 86400; // 1 day
  }

  /**
   * Get ETag header
   */
  static getETag(version: string): string {
    return `"${version}"`;
  }

  /**
   * Get Last-Modified header
   */
  static getLastModified(date: Date): string {
    return date.toUTCString();
  }
}

/**
 * CDN invalidation helper
 */
export class CDNInvalidationHelper {
  private cdnManager: CDNManager;

  constructor(cdnManager?: CDNManager) {
    this.cdnManager = cdnManager ?? getCDNManager();
  }

  /**
   * Invalidate asset
   */
  async invalidateAsset(path: string): Promise<boolean> {
    return await this.cdnManager.invalidateCache(path);
  }

  /**
   * Invalidate by pattern
   */
  async invalidateByPattern(pattern: string): Promise<boolean> {
    return await this.cdnManager.invalidateCache(pattern);
  }

  /**
   * Invalidate all assets
   */
  async invalidateAll(): Promise<boolean> {
    return await this.cdnManager.purgeAllCache();
  }

  /**
   * Invalidate CSS and JS
   */
  async invalidateStaticAssets(): Promise<boolean> {
    await this.invalidateByPattern('.css');
    await this.invalidateByPattern('.js');
    return true;
  }

  /**
   * Invalidate images
   */
  async invalidateImages(): Promise<boolean> {
    await this.invalidateByPattern('.jpg');
    await this.invalidateByPattern('.png');
    await this.invalidateByPattern('.svg');
    await this.invalidateByPattern('.webp');
    return true;
  }
}

/**
 * Performance monitoring
 */
export class CDNPerformanceMonitor {
  private cdnManager: CDNManager;

  constructor(cdnManager?: CDNManager) {
    this.cdnManager = cdnManager ?? getCDNManager();
  }

  /**
   * Record request
   */
  recordRequest(cached: boolean, responseTime: number, size: number): void {
    this.cdnManager.updateStatistics(cached, responseTime, size);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    cacheHitRate: number;
    averageResponseTime: number;
    bandwidthSaved: number;
    totalRequests: number;
  } {
    const stats = this.cdnManager.getStatistics();
    
    return {
      cacheHitRate: stats.cacheHitRate,
      averageResponseTime: stats.averageResponseTime,
      bandwidthSaved: stats.bandwidthSaved,
      totalRequests: stats.totalRequests,
    };
  }

  /**
   * Get performance report
   */
  getReport(): {
    metrics: {
      cacheHitRate: number;
      averageResponseTime: number;
      bandwidthSaved: number;
      totalRequests: number;
    };
    status: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];
    let status: 'excellent' | 'good' | 'fair' | 'poor';

    if (metrics.cacheHitRate < 0.5) {
      recommendations.push('Cache hit rate is below 50% - consider increasing cache TTL');
      status = 'poor';
    } else if (metrics.cacheHitRate < 0.7) {
      recommendations.push('Cache hit rate could be improved - review cache rules');
      status = 'fair';
    } else if (metrics.cacheHitRate < 0.9) {
      recommendations.push('Cache hit rate is good but could be optimized');
      status = 'good';
    } else {
      status = 'excellent';
    }

    if (metrics.averageResponseTime > 500) {
      recommendations.push('Average response time is high - consider edge locations');
      status = status === 'excellent' ? 'good' : status;
    }

    if (metrics.bandwidthSaved < metrics.totalRequests * 1000) {
      recommendations.push('Bandwidth savings could be improved - increase cache duration');
    }

    return {
      metrics,
      status,
      recommendations,
    };
  }
}
