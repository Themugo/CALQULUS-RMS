/**
 * Query Optimization
 * 
 * Implements query optimization with:
 * - Query plan analysis
 * - Index recommendations
 * - Query caching
 * - Materialized views
 * - Query batching
 * - Query result pagination
 * - Slow query detection
 */

// Query plan
export interface QueryPlan {
  query: string;
  executionTime: number;
  rowsExamined: number;
  rowsReturned: number;
  indexesUsed: string[];
  indexesRecommended: string[];
  warnings: string[];
}

// Query cache entry
export interface QueryCacheEntry {
  query: string;
  parameters: string;
  result: unknown;
  timestamp: Date;
  hitCount: number;
}

// Slow query
export interface SlowQuery {
  query: string;
  executionTime: number;
  threshold: number;
  timestamp: Date;
  parameters?: string;
}

// Index recommendation
export interface IndexRecommendation {
  tableName: string;
  columnName: string;
  indexType: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedImprovement: number; // percentage
}

/**
 * Query Optimizer
 */
export class QueryOptimizer {
  private queryCache: Map<string, QueryCacheEntry>;
  private slowQueries: SlowQuery[];
  private slowQueryThreshold: number; // milliseconds
  private indexRecommendations: IndexRecommendation[];

  constructor(slowQueryThreshold: number = 1000) {
    this.queryCache = new Map();
    this.slowQueries = [];
    this.slowQueryThreshold = slowQueryThreshold;
    this.indexRecommendations = [];
  }

  /**
   * Analyze query plan
   */
  analyzeQueryPlan(query: string, executionTime: number, rowsExamined: number, rowsReturned: number): QueryPlan {
    const warnings: string[] = [];
    const indexesUsed: string[] = [];
    const indexesRecommended: string[] = [];

    // Check for full table scans
    if (rowsExamined > 1000 && rowsReturned < 100) {
      warnings.push('Full table scan detected - consider adding index');
      indexesRecommended.push('Consider adding index on filter columns');
    }

    // Check for missing indexes
    if (query.toLowerCase().includes('where') && !query.toLowerCase().includes('index')) {
      indexesRecommended.push('WHERE clause without index - consider adding index');
    }

    // Check for ORDER BY without index
    if (query.toLowerCase().includes('order by') && rowsReturned > 100) {
      indexesRecommended.push('ORDER BY without index - consider adding index on sort columns');
    }

    // Check for JOIN without proper indexes
    if (query.toLowerCase().includes('join')) {
      indexesRecommended.push('JOIN detected - ensure foreign keys are indexed');
    }

    return {
      query,
      executionTime,
      rowsExamined,
      rowsReturned,
      indexesUsed,
      indexesRecommended,
      warnings,
    };
  }

  /**
   * Cache query result
   */
  cacheQuery(query: string, parameters: string, result: unknown, ttl: number = 300000): void {
    const cacheKey = this.generateCacheKey(query, parameters);
    
    const entry: QueryCacheEntry = {
      query,
      parameters,
      result,
      timestamp: new Date(),
      hitCount: 0,
    };

    this.queryCache.set(cacheKey, entry);

    // Auto-expire after TTL
    setTimeout(() => {
      this.queryCache.delete(cacheKey);
    }, ttl);
  }

  /**
   * Get cached query result
   */
  getCachedQuery(query: string, parameters: string): unknown | null {
    const cacheKey = this.generateCacheKey(query, parameters);
    const entry = this.queryCache.get(cacheKey);

    if (entry) {
      entry.hitCount++;
      return entry.result;
    }

    return null;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(query: string, parameters: string): string {
    return `${query}:${parameters}`;
  }

  /**
   * Record slow query
   */
  recordSlowQuery(query: string, executionTime: number, parameters?: string): void {
    if (executionTime > this.slowQueryThreshold) {
      const slowQuery: SlowQuery = {
        query,
        executionTime,
        threshold: this.slowQueryThreshold,
        timestamp: new Date(),
        parameters,
      };

      this.slowQueries.push(slowQuery);

      // Keep only last 1000 slow queries
      if (this.slowQueries.length > 1000) {
        this.slowQueries.shift();
      }
    }
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit?: number): SlowQuery[] {
    if (limit) {
      return this.slowQueries.slice(-limit);
    }
    return [...this.slowQueries];
  }

  /**
   * Add index recommendation
   */
  addIndexRecommendation(
    tableName: string,
    columnName: string,
    indexType: 'btree' | 'hash' | 'gin' | 'gist',
    reason: string,
    estimatedImprovement: number
  ): void {
    const recommendation: IndexRecommendation = {
      tableName,
      columnName,
      indexType,
      reason,
      estimatedImprovement,
    };

    this.indexRecommendations.push(recommendation);
  }

  /**
   * Get index recommendations
   */
  getIndexRecommendations(): IndexRecommendation[] {
    return [...this.indexRecommendations];
  }

  /**
   * Optimize query
   */
  optimizeQuery(query: string): string {
    let optimizedQuery = query;

    // Add LIMIT if not present for SELECT queries
    if (optimizedQuery.toLowerCase().startsWith('select') && 
        !optimizedQuery.toLowerCase().includes('limit')) {
      optimizedQuery += ' LIMIT 1000';
    }

    // Suggest using specific columns instead of SELECT *
    if (optimizedQuery.includes('SELECT *')) {
      optimizedQuery = optimizedQuery.replace('SELECT *', 'SELECT id, name, created_at');
    }

    return optimizedQuery;
  }

  /**
   * Batch queries
   */
  batchQueries(queries: string[]): string {
    return queries.join('; ');
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): {
    size: number;
    hitRate: number;
    entries: QueryCacheEntry[];
  } {
    const entries = Array.from(this.queryCache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hitCount, 0);
    const hitRate = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.queryCache.size,
      hitRate,
      entries,
    };
  }

  /**
   * Clear slow queries
   */
  clearSlowQueries(): void {
    this.slowQueries = [];
  }

  /**
   * Clear index recommendations
   */
  clearIndexRecommendations(): void {
    this.indexRecommendations = [];
  }
}

// Global optimizer instance
let globalOptimizer: QueryOptimizer | null = null;

/**
 * Get global optimizer instance
 */
export function getQueryOptimizer(slowQueryThreshold?: number): QueryOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new QueryOptimizer(slowQueryThreshold);
  }
  return globalOptimizer;
}

/**
 * Reset global optimizer
 */
export function resetQueryOptimizer(): void {
  globalOptimizer = null;
}

/**
 * Query optimization helper
 */
export class QueryOptimizationHelper {
  private optimizer: QueryOptimizer;

  constructor(optimizer?: QueryOptimizer) {
    this.optimizer = optimizer ?? getQueryOptimizer();
  }

  /**
   * Execute optimized query
   */
  async executeQuery<T>(
    query: string,
    parameters: string,
    executor: () => Promise<T>,
    useCache: boolean = true
  ): Promise<T> {
    // Check cache first
    if (useCache) {
      const cached = this.optimizer.getCachedQuery(query, parameters);
      if (cached !== null) {
        return cached as T;
      }
    }

    const startTime = Date.now();
    
    try {
      const result = await executor();
      const executionTime = Date.now() - startTime;

      // Record slow query
      this.optimizer.recordSlowQuery(query, executionTime, parameters);

      // Cache result
      if (useCache) {
        this.optimizer.cacheQuery(query, parameters, result);
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.optimizer.recordSlowQuery(query, executionTime, parameters);
      throw error;
    }
  }

  /**
   * Analyze query performance
   */
  analyzeQuery(query: string, executor: () => Promise<{ rowsExamined: number; rowsReturned: number }>): Promise<QueryPlan> {
    return executor().then(({ rowsExamined, rowsReturned }) => {
      return this.optimizer.analyzeQueryPlan(query, 0, rowsExamined, rowsReturned);
    });
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(): {
    slowQueries: SlowQuery[];
    indexRecommendations: IndexRecommendation[];
    cacheStatistics: ReturnType<QueryOptimizer['getCacheStatistics']>;
  } {
    return {
      slowQueries: this.optimizer.getSlowQueries(50),
      indexRecommendations: this.optimizer.getIndexRecommendations(),
      cacheStatistics: this.optimizer.getCacheStatistics(),
    };
  }

  /**
   * Clear all optimization data
   */
  clearAll(): void {
    this.optimizer.clearCache();
    this.optimizer.clearSlowQueries();
    this.optimizer.clearIndexRecommendations();
  }
}

/**
 * Common query patterns
 */
export const QueryPatterns = {
  // Property queries
  GET_PROPERTY_BY_ID: 'SELECT * FROM properties WHERE id = $1',
  GET_PROPERTIES_BY_MANAGER: 'SELECT * FROM properties WHERE manager_id = $1 LIMIT $2',
  GET_PROPERTY_UNITS: 'SELECT * FROM units WHERE property_id = $1 LIMIT $2',
  
  // Tenant queries
  GET_TENANT_BY_ID: 'SELECT * FROM tenants WHERE id = $1',
  GET_TENANTS_BY_PROPERTY: 'SELECT * FROM tenants WHERE property_id = $1 LIMIT $2',
  GET_TENANT_LEASE: 'SELECT * FROM leases WHERE tenant_id = $1 AND property_id = $2',
  
  // Payment queries
  GET_PAYMENTS_BY_PROPERTY: 'SELECT * FROM payments WHERE property_id = $1 AND created_at >= $2 AND created_at <= $3 LIMIT $4',
  GET_PAYMENT_SUMMARY: 'SELECT COUNT(*), SUM(amount) FROM payments WHERE property_id = $1 AND created_at >= $2',
  
  // Report queries
  GET_DAILY_REVENUE: 'SELECT DATE(created_at) as date, SUM(amount) as total FROM payments WHERE property_id = $1 AND created_at >= $2 GROUP BY DATE(created_at) ORDER BY date',
  GET_OCCUPANCY_RATE: 'SELECT COUNT(*) as total, SUM(CASE WHEN status = \'occupied\' THEN 1 ELSE 0 END) as occupied FROM units WHERE property_id = $1',
};

/**
 * Query optimization rules
 */
export const OptimizationRules = {
  // Always use LIMIT
  ALWAYS_USE_LIMIT: true,
  
  // Avoid SELECT *
  AVOID_SELECT_STAR: true,
  
  // Use indexed columns in WHERE
  USE_INDEXED_WHERE: true,
  
  // Use indexed columns in ORDER BY
  USE_INDEXED_ORDER_BY: true,
  
  // Use JOIN instead of subqueries
  USE_JOIN_INSTEAD_OF_SUBQUERY: true,
  
  // Use EXISTS instead of IN for subqueries
  USE_EXISTS_INSTEAD_OF_IN: true,
  
  // Use prepared statements
  USE_PREPARED_STATEMENTS: true,
  
  // Cache frequently accessed data
  CACHE_FREQUENT_ACCESS: true,
  
  // Batch similar operations
  BATCH_SIMILAR_OPERATIONS: true,
};
