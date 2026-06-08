/**
 * Database Query Profiling
 * 
 * Implements DB query profiling with:
 * - Query execution time tracking
 * - Query analysis
 * - Slow query detection
 * - Query pattern recognition
 * - Performance metrics
 * - Query optimization suggestions
 * - Profiling reports
 */

// Query profile
export interface QueryProfile {
  id: string;
  query: string;
  parameters?: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: Date;
  database: string;
  table?: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER' | 'DROP';
}

// Query statistics
export interface QueryStatistics {
  totalQueries: number;
  averageExecutionTime: number;
  slowQueries: number;
  fastQueries: number;
  byOperation: Record<string, number>;
  byTable: Record<string, number>;
  totalRowsAffected: number;
}

// Performance alert
export interface PerformanceAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  query: string;
  executionTime: number;
  threshold: number;
  timestamp: Date;
}

// Optimization suggestion
export interface OptimizationSuggestion {
  query: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
  estimatedImprovement: number; // percentage
}

/**
 * Query Profiler
 */
export class QueryProfiler {
  private profiles: QueryProfile[];
  private alerts: PerformanceAlert[];
  private slowQueryThreshold: number; // milliseconds
  private enabled: boolean;

  constructor(slowQueryThreshold: number = 1000) {
    this.profiles = [];
    this.alerts = [];
    this.slowQueryThreshold = slowQueryThreshold;
    this.enabled = true;
  }

  /**
   * Profile query execution
   */
  async profileQuery<T>(
    query: string,
    executor: () => Promise<T>,
    parameters?: string,
    database: string = 'default'
  ): Promise<T> {
    if (!this.enabled) {
      return await executor();
    }

    const startTime = Date.now();
    let result: T;
    let rowsAffected = 0;
    let error: Error | null = null;

    try {
      result = await executor();
      rowsAffected = this.extractRowsAffected(result);
      return result;
    } catch (e) {
      error = e as Error;
      throw error;
    } finally {
      const executionTime = Date.now() - startTime;
      const operation = this.extractOperation(query);
      const table = this.extractTable(query);

      const profile: QueryProfile = {
        id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        query,
        parameters,
        executionTime,
        rowsAffected,
        timestamp: new Date(),
        database,
        table,
        operation,
      };

      this.profiles.push(profile);

      // Check for slow query
      if (executionTime > this.slowQueryThreshold) {
        this.createAlert(profile);
      }

      // Keep only last 1000 profiles
      if (this.profiles.length > 1000) {
        this.profiles.shift();
      }
    }
  }

  /**
   * Extract operation from query
   */
  private extractOperation(query: string): QueryProfile['operation'] {
    const firstWord = query.trim().split(' ')[0].toUpperCase();
    if (['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'].includes(firstWord)) {
      return firstWord as QueryProfile['operation'];
    }
    return 'SELECT';
  }

  /**
   * Extract table from query
   */
  private extractTable(query: string): string | undefined {
    const fromMatch = query.match(/FROM\s+(\w+)/i);
    if (fromMatch) return fromMatch[1];

    const intoMatch = query.match(/INTO\s+(\w+)/i);
    if (intoMatch) return intoMatch[1];

    const updateMatch = query.match(/UPDATE\s+(\w+)/i);
    if (updateMatch) return updateMatch[1];

    return undefined;
  }

  /**
   * Extract rows affected from result
   */
  private extractRowsAffected(result: unknown): number {
    if (typeof result === 'number') {
      return result;
    }
    
    if (Array.isArray(result)) {
      return result.length;
    }
    
    if (result && typeof result === 'object' && 'count' in result) {
      return (result as { count: number }).count;
    }
    
    return 0;
  }

  /**
   * Create performance alert
   */
  private createAlert(profile: QueryProfile): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity: profile.executionTime > this.slowQueryThreshold * 3 ? 'critical' : 'warning',
      message: `Slow query detected: ${profile.operation} on ${profile.table || 'unknown'}`,
      query: profile.query,
      executionTime: profile.executionTime,
      threshold: this.slowQueryThreshold,
      timestamp: profile.timestamp,
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
  }

  /**
   * Get query statistics
   */
  getStatistics(): QueryStatistics {
    if (this.profiles.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueries: 0,
        fastQueries: 0,
        byOperation: {},
        byTable: {},
        totalRowsAffected: 0,
      };
    }

    const totalQueries = this.profiles.length;
    const averageExecutionTime = this.profiles.reduce((sum, p) => sum + p.executionTime, 0) / totalQueries;
    const slowQueries = this.profiles.filter(p => p.executionTime > this.slowQueryThreshold).length;
    const fastQueries = totalQueries - slowQueries;
    const totalRowsAffected = this.profiles.reduce((sum, p) => sum + p.rowsAffected, 0);

    const byOperation: Record<string, number> = {};
    const byTable: Record<string, number> = {};

    for (const profile of this.profiles) {
      byOperation[profile.operation] = (byOperation[profile.operation] || 0) + 1;
      if (profile.table) {
        byTable[profile.table] = (byTable[profile.table] || 0) + 1;
      }
    }

    return {
      totalQueries,
      averageExecutionTime,
      slowQueries,
      fastQueries,
      byOperation,
      byTable,
      totalRowsAffected,
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit?: number): QueryProfile[] {
    const slowQueries = this.profiles.filter(p => p.executionTime > this.slowQueryThreshold);
    const sorted = slowQueries.sort((a, b) => b.executionTime - a.executionTime);
    
    if (limit) {
      return sorted.slice(0, limit);
    }
    
    return sorted;
  }

  /**
   * Get alerts
   */
  getAlerts(limit?: number): PerformanceAlert[] {
    const sorted = [...this.alerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (limit) {
      return sorted.slice(0, limit);
    }
    
    return sorted;
  }

  /**
   * Get profiles by table
   */
  getProfilesByTable(table: string): QueryProfile[] {
    return this.profiles.filter(p => p.table === table);
  }

  /**
   * Get profiles by operation
   */
  getProfilesByOperation(operation: QueryProfile['operation']): QueryProfile[] {
    return this.profiles.filter(p => p.operation === operation);
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const stats = this.getStatistics();

    // Check for slow queries
    const slowQueries = this.getSlowQueries(10);
    for (const query of slowQueries) {
      suggestions.push({
        query: query.query,
        suggestion: 'Consider adding indexes or optimizing this slow query',
        impact: query.executionTime > this.slowQueryThreshold * 3 ? 'high' : 'medium',
        estimatedImprovement: Math.min(90, Math.round((query.executionTime / this.slowQueryThreshold) * 30)),
      });
    }

    // Check for missing indexes
    for (const [table, count] of Object.entries(stats.byTable)) {
      if (count > 100 && stats.byOperation['SELECT'] > 0) {
        suggestions.push({
          query: `SELECT * FROM ${table}`,
          suggestion: `High query volume on table ${table} - review indexing strategy`,
          impact: 'high',
          estimatedImprovement: 50,
        });
      }
    }

    return suggestions;
  }

  /**
   * Clear profiles
   */
  clearProfiles(): void {
    this.profiles = [];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Enable profiler
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable profiler
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
  }
}

// Global profiler instance
let globalProfiler: QueryProfiler | null = null;

/**
 * Get global profiler instance
 */
export function getQueryProfiler(slowQueryThreshold?: number): QueryProfiler {
  if (!globalProfiler) {
    globalProfiler = new QueryProfiler(slowQueryThreshold);
  }
  return globalProfiler;
}

/**
 * Reset global profiler
 */
export function resetQueryProfiler(): void {
  globalProfiler = null;
}

/**
 * Query profiling helper
 */
export class QueryProfilingHelper {
  private profiler: QueryProfiler;

  constructor(profiler?: QueryProfiler) {
    this.profiler = profiler ?? getQueryProfiler();
  }

  /**
   * Profile Supabase query
   */
  async profileSupabaseQuery<T>(
    query: string,
    executor: () => Promise<T>,
    parameters?: string
  ): Promise<T> {
    return await this.profiler.profileQuery(query, executor, parameters, 'supabase');
  }

  /**
   * Get profiling report
   */
  getReport(): {
    statistics: QueryStatistics;
    slowQueries: QueryProfile[];
    alerts: PerformanceAlert[];
    suggestions: OptimizationSuggestion[];
  } {
    return {
      statistics: this.profiler.getStatistics(),
      slowQueries: this.profiler.getSlowQueries(20),
      alerts: this.profiler.getAlerts(20),
      suggestions: this.profiler.generateOptimizationSuggestions(),
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    score: number; // 0-100
    issues: string[];
  } {
    const stats = this.profiler.getStatistics();
    const issues: string[] = [];
    let score = 100;

    // Check average execution time
    if (stats.averageExecutionTime > 500) {
      score -= 20;
      issues.push('Average query execution time is high');
    } else if (stats.averageExecutionTime > 200) {
      score -= 10;
      issues.push('Average query execution time could be improved');
    }

    // Check slow query rate
    const slowQueryRate = stats.slowQueries / stats.totalQueries;
    if (slowQueryRate > 0.1) {
      score -= 30;
      issues.push('High slow query rate');
    } else if (slowQueryRate > 0.05) {
      score -= 15;
      issues.push('Slow query rate is elevated');
    }

    // Check total query count
    if (stats.totalQueries > 10000) {
      score -= 10;
      issues.push('High total query count - consider caching');
    }

    // Determine status
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) {
      status = 'excellent';
    } else if (score >= 70) {
      status = 'good';
    } else if (score >= 50) {
      status = 'fair';
    } else {
      status = 'poor';
    }

    return {
      status,
      score: Math.max(0, score),
      issues,
    };
  }

  /**
   * Clear all profiling data
   */
  clearAll(): void {
    this.profiler.clearProfiles();
    this.profiler.clearAlerts();
  }
}

/**
 * Query pattern analyzer
 */
export class QueryPatternAnalyzer {
  /**
   * Analyze query patterns
   */
  static analyzePatterns(profiles: QueryProfile[]): {
    commonPatterns: Array<{ pattern: string; count: number }>;
    bottlenecks: Array<{ table: string; operation: string; avgTime: number }>;
    recommendations: string[];
  } {
    const patterns: Map<string, number> = new Map();
    const tableOperations: Map<string, Array<{ operation: string; time: number }>> = new Map();

    for (const profile of profiles) {
      // Extract pattern (simplified)
      const pattern = this.extractPattern(profile.query);
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);

      // Track table operations
      if (profile.table) {
        const key = profile.table;
        if (!tableOperations.has(key)) {
          tableOperations.set(key, []);
        }
        tableOperations.get(key)!.push({ operation: profile.operation, time: profile.executionTime });
      }
    }

    // Find common patterns
    const commonPatterns = Array.from(patterns.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Find bottlenecks
    const bottlenecks: Array<{ table: string; operation: string; avgTime: number }> = [];
    for (const [table, operations] of tableOperations.entries()) {
      const opTimes = new Map<string, number[]>();
      for (const op of operations) {
        if (!opTimes.has(op.operation)) {
          opTimes.set(op.operation, []);
        }
        opTimes.get(op.operation)!.push(op.time);
      }

      for (const [operation, times] of opTimes.entries()) {
        const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
        if (avgTime > 500) {
          bottlenecks.push({ table, operation, avgTime });
        }
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (bottlenecks.length > 0) {
      recommendations.push('Consider adding indexes to frequently queried tables');
    }
    if (commonPatterns.some(p => p.pattern.includes('SELECT *'))) {
      recommendations.push('Avoid SELECT * - specify only needed columns');
    }
    if (commonPatterns.some(p => p.pattern.includes('WHERE'))) {
      recommendations.push('Ensure WHERE clause columns are indexed');
    }

    return {
      commonPatterns,
      bottlenecks,
      recommendations,
    };
  }

  /**
   * Extract query pattern
   */
  private static extractPattern(query: string): string {
    const normalized = query.toUpperCase().replace(/\s+/g, ' ');
    const parts = normalized.split(' ');
    return parts.slice(0, 3).join(' ');
  }
}

/**
 * Performance metrics collector
 */
export class PerformanceMetricsCollector {
  private profiler: QueryProfiler;

  constructor(profiler?: QueryProfiler) {
    this.profiler = profiler ?? getQueryProfiler();
  }

  /**
   * Collect metrics
   */
  collectMetrics(): {
    queryMetrics: QueryStatistics;
    performanceMetrics: {
      p50: number;
      p95: number;
      p99: number;
    };
    healthScore: number;
  } {
    const stats = this.profiler.getStatistics();
    const executionTimes = this.profiler['profiles'].map(p => p.executionTime).sort((a, b) => a - b);

    const p50 = this.getPercentile(executionTimes, 50);
    const p95 = this.getPercentile(executionTimes, 95);
    const p99 = this.getPercentile(executionTimes, 99);

    const healthScore = this.calculateHealthScore(stats, p95);

    return {
      queryMetrics: stats,
      performanceMetrics: {
        p50,
        p95,
        p99,
      },
      healthScore,
    };
  }

  /**
   * Get percentile
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(stats: QueryStatistics, p95: number): number {
    let score = 100;

    // Penalize slow queries
    const slowQueryRate = stats.slowQueries / stats.totalQueries;
    score -= slowQueryRate * 50;

    // Penalize high p95
    if (p95 > 1000) {
      score -= 20;
    } else if (p95 > 500) {
      score -= 10;
    }

    // Penalize high average execution time
    if (stats.averageExecutionTime > 500) {
      score -= 20;
    } else if (stats.averageExecutionTime > 200) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }
}
