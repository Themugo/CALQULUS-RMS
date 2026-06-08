/**
 * Rate Limiting System
 * 
 * Implements comprehensive rate limiting with:
 * - Multiple rate limit strategies (token bucket, sliding window, fixed window)
 * - Per-IP, per-user, per-endpoint limits
 * - Distributed rate limiting support
 * - Rate limit breach detection
 * - Automatic blocking and throttling
 * - Configurable policies
 */

// Rate limit strategy
export enum RateLimitStrategy {
  TOKEN_BUCKET = 'token_bucket',
  SLIDING_WINDOW = 'sliding_window',
  FIXED_WINDOW = 'fixed_window',
  LEAKY_BUCKET = 'leaky_bucket',
}

// Rate limit scope
export enum RateLimitScope {
  GLOBAL = 'global',
  PER_IP = 'per_ip',
  PER_USER = 'per_user',
  PER_ENDPOINT = 'per_endpoint',
  PER_API_KEY = 'per_api_key',
}

// Rate limit breach action
export enum RateLimitBreachAction {
  THROTTLE = 'throttle',
  BLOCK = 'block',
  WARN = 'warn',
  QUEUE = 'queue',
}

// Rate limit policy
export interface RateLimitPolicy {
  id: string;
  name: string;
  description: string;
  strategy: RateLimitStrategy;
  scope: RateLimitScope;
  endpointPattern?: string; // Glob pattern for endpoints
  requestsPerWindow: number;
  windowSizeMs: number;
  burstSize?: number;
  breachAction: RateLimitBreachAction;
  blockDurationMs?: number;
  throttleDelayMs?: number;
  priority: number; // Higher priority policies override lower ones
  isActive: boolean;
}

// Rate limit request
export interface RateLimitRequest {
  identifier: string; // IP, user ID, API key, etc.
  endpoint: string;
  method: string;
  timestamp: Date;
  userId?: string;
  apiKey?: string;
}

// Rate limit result
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds
  breachAction?: RateLimitBreachAction;
  policyId?: string;
  reason?: string;
}

// Rate limit breach
export interface RateLimitBreach {
  id: string;
  policyId: string;
  identifier: string;
  endpoint: string;
  timestamp: Date;
  action: RateLimitBreachAction;
  blockedUntil?: Date;
  metadata?: Record<string, unknown>;
}

// Token bucket state
export interface TokenBucketState {
  tokens: number;
  lastRefill: Date;
}

// Sliding window counter
export interface SlidingWindowState {
  requests: Array<{ timestamp: Date }>;
}

/**
 * Token bucket rate limiter
 */
export class TokenBucketRateLimiter {
  private capacity: number;
  private refillRate: number; // tokens per second
  private buckets: Map<string, TokenBucketState> = new Map();

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
  }

  consume(identifier: string, tokens: number = 1): RateLimitResult {
    const now = new Date();
    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      bucket = {
        tokens: this.capacity,
        lastRefill: now,
      };
      this.buckets.set(identifier, bucket);
    }

    // Refill tokens
    const timeSinceLastRefill = (now.getTime() - bucket.lastRefill.getTime()) / 1000;
    const tokensToAdd = Math.min(this.capacity, timeSinceLastRefill * this.refillRate);
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if enough tokens
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      const resetAt = new Date(now.getTime() + (this.capacity - bucket.tokens) / this.refillRate * 1000);
      
      return {
        allowed: true,
        remaining: bucket.tokens,
        resetAt,
      };
    }

    // Calculate retry after
    const retryAfter = (tokens - bucket.tokens) / this.refillRate;
    const resetAt = new Date(now.getTime() + retryAfter * 1000);

    return {
      allowed: false,
      remaining: bucket.tokens,
      resetAt,
      retryAfter,
      reason: 'Rate limit exceeded',
    };
  }

  reset(identifier: string): void {
    this.buckets.delete(identifier);
  }

  resetAll(): void {
    this.buckets.clear();
  }
}

/**
 * Sliding window rate limiter
 */
export class SlidingWindowRateLimiter {
  private windowSizeMs: number;
  private maxRequests: number;
  private windows: Map<string, SlidingWindowState> = new Map();

  constructor(maxRequests: number, windowSizeMs: number) {
    this.maxRequests = maxRequests;
    this.windowSizeMs = windowSizeMs;
  }

  check(identifier: string): RateLimitResult {
    const now = new Date();
    let window = this.windows.get(identifier);

    if (!window) {
      window = { requests: [] };
      this.windows.set(identifier, window);
    }

    // Remove requests outside the window
    const windowStart = new Date(now.getTime() - this.windowSizeMs);
    window.requests = window.requests.filter(r => r.timestamp > windowStart);

    if (window.requests.length < this.maxRequests) {
      window.requests.push({ timestamp: now });
      const resetAt = new Date(windowStart.getTime() + this.windowSizeMs);
      
      return {
        allowed: true,
        remaining: this.maxRequests - window.requests.length,
        resetAt,
      };
    }

    // Calculate retry after
    const oldestRequest = window.requests[0];
    const retryAfter = (oldestRequest.timestamp.getTime() - windowStart.getTime()) / 1000;
    const resetAt = new Date(oldestRequest.timestamp.getTime() + this.windowSizeMs);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter,
      reason: 'Rate limit exceeded',
    };
  }

  reset(identifier: string): void {
    this.windows.delete(identifier);
  }

  resetAll(): void {
    this.windows.clear();
  }
}

/**
 * Fixed window rate limiter
 */
export class FixedWindowRateLimiter {
  private windowSizeMs: number;
  private maxRequests: number;
  private counters: Map<string, { count: number; windowStart: Date }> = new Map();

  constructor(maxRequests: number, windowSizeMs: number) {
    this.maxRequests = maxRequests;
    this.windowSizeMs = windowSizeMs;
  }

  check(identifier: string): RateLimitResult {
    const now = new Date();
    let counter = this.counters.get(identifier);

    if (!counter) {
      counter = { count: 0, windowStart: now };
      this.counters.set(identifier, counter);
    }

    // Check if window has expired
    const windowEnd = new Date(counter.windowStart.getTime() + this.windowSizeMs);
    if (now > windowEnd) {
      counter.count = 0;
      counter.windowStart = now;
    }

    if (counter.count < this.maxRequests) {
      counter.count++;
      const resetAt = windowEnd;
      
      return {
        allowed: true,
        remaining: this.maxRequests - counter.count,
        resetAt,
      };
    }

    const retryAfter = (windowEnd.getTime() - now.getTime()) / 1000;

    return {
      allowed: false,
      remaining: 0,
      resetAt: windowEnd,
      retryAfter,
      reason: 'Rate limit exceeded',
    };
  }

  reset(identifier: string): void {
    this.counters.delete(identifier);
  }

  resetAll(): void {
    this.counters.clear();
  }
}

/**
 * Rate limit manager
 */
export class RateLimitManager {
  private policies: RateLimitPolicy[] = [];
  private tokenBucketLimiters: Map<string, TokenBucketRateLimiter> = new Map();
  private slidingWindowLimiters: Map<string, SlidingWindowRateLimiter> = new Map();
  private fixedWindowLimiters: Map<string, FixedWindowRateLimiter> = new Map();
  private breaches: RateLimitBreach[] = [];

  constructor(policies: RateLimitPolicy[] = []) {
    this.policies = policies;
    this.initializeLimiters();
  }

  private initializeLimiters(): void {
    for (const policy of this.policies) {
      if (!policy.isActive) continue;

      const key = `${policy.id}_${policy.scope}`;
      const refillRate = policy.requestsPerWindow / (policy.windowSizeMs / 1000);

      switch (policy.strategy) {
        case RateLimitStrategy.TOKEN_BUCKET:
          this.tokenBucketLimiters.set(key, new TokenBucketRateLimiter(
            policy.requestsPerWindow,
            refillRate
          ));
          break;

        case RateLimitStrategy.SLIDING_WINDOW:
          this.slidingWindowLimiters.set(key, new SlidingWindowRateLimiter(
            policy.requestsPerWindow,
            policy.windowSizeMs
          ));
          break;

        case RateLimitStrategy.FIXED_WINDOW:
          this.fixedWindowLimiters.set(key, new FixedWindowRateLimiter(
            policy.requestsPerWindow,
            policy.windowSizeMs
          ));
          break;
      }
    }
  }

  addPolicy(policy: RateLimitPolicy): void {
    this.policies.push(policy);
    this.initializeLimiters();
  }

  removePolicy(policyId: string): void {
    this.policies = this.policies.filter(p => p.id !== policyId);
    this.initializeLimiters();
  }

  checkRequest(request: RateLimitRequest): RateLimitResult {
    // Sort policies by priority (highest first)
    const sortedPolicies = [...this.policies]
      .filter(p => p.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (const policy of sortedPolicies) {
      // Check if policy applies to this endpoint
      if (policy.endpointPattern && !this.matchesEndpoint(request.endpoint, policy.endpointPattern)) {
        continue;
      }

      const identifier = this.getIdentifier(request, policy.scope);
      const key = `${policy.id}_${policy.scope}`;
      let result: RateLimitResult;

      switch (policy.strategy) {
        case RateLimitStrategy.TOKEN_BUCKET: {
          const tokenBucketLimiter = this.tokenBucketLimiters.get(key);
          if (tokenBucketLimiter) {
            result = tokenBucketLimiter.consume(identifier);
          } else {
            result = { allowed: true, remaining: Infinity, resetAt: new Date() };
          }
          break;
        }

        case RateLimitStrategy.SLIDING_WINDOW: {
          const slidingWindowLimiter = this.slidingWindowLimiters.get(key);
          if (slidingWindowLimiter) {
            result = slidingWindowLimiter.check(identifier);
          } else {
            result = { allowed: true, remaining: Infinity, resetAt: new Date() };
          }
          break;
        }

        case RateLimitStrategy.FIXED_WINDOW: {
          const fixedWindowLimiter = this.fixedWindowLimiters.get(key);
          if (fixedWindowLimiter) {
            result = fixedWindowLimiter.check(identifier);
          } else {
            result = { allowed: true, remaining: Infinity, resetAt: new Date() };
          }
          break;
        }

        default:
          result = { allowed: true, remaining: Infinity, resetAt: new Date() };
      }

      if (!result.allowed) {
        result.policyId = policy.id;
        result.breachAction = policy.breachAction;
        this.recordBreach(policy, identifier, request.endpoint, policy.breachAction);
        return result;
      }
    }

    return { allowed: true, remaining: Infinity, resetAt: new Date() };
  }

  private matchesEndpoint(endpoint: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(endpoint);
  }

  private getIdentifier(request: RateLimitRequest, scope: RateLimitScope): string {
    switch (scope) {
      case RateLimitScope.PER_IP:
        return request.identifier;
      case RateLimitScope.PER_USER:
        return request.userId || 'anonymous';
      case RateLimitScope.PER_API_KEY:
        return request.apiKey || 'none';
      case RateLimitScope.PER_ENDPOINT:
        return `${request.method}:${request.endpoint}`;
      case RateLimitScope.GLOBAL:
      default:
        return 'global';
    }
  }

  private recordBreach(
    policy: RateLimitPolicy,
    identifier: string,
    endpoint: string,
    action: RateLimitBreachAction
  ): void {
    const breach: RateLimitBreach = {
      id: `breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      policyId: policy.id,
      identifier,
      endpoint,
      timestamp: new Date(),
      action,
      blockedUntil: action === RateLimitBreachAction.BLOCK && policy.blockDurationMs
        ? new Date(Date.now() + policy.blockDurationMs)
        : undefined,
    };

    this.breaches.push(breach);
  }

  isBlocked(identifier: string): boolean {
    const now = new Date();
    return this.breaches.some(b =>
      b.identifier === identifier &&
      b.action === RateLimitBreachAction.BLOCK &&
      b.blockedUntil &&
      b.blockedUntil > now
    );
  }

  getBreaches(identifier?: string): RateLimitBreach[] {
    if (identifier) {
      return this.breaches.filter(b => b.identifier === identifier);
    }
    return this.breaches;
  }

  clearOldBreaches(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    this.breaches = this.breaches.filter(b =>
      now.getTime() - b.timestamp.getTime() < maxAgeMs
    );
  }

  getStatistics(): {
    totalPolicies: number;
    activePolicies: number;
    totalBreaches: number;
    byScope: Record<RateLimitScope, number>;
    byAction: Record<RateLimitBreachAction, number>;
  } {
    const byScope: Record<RateLimitScope, number> = {
      [RateLimitScope.GLOBAL]: 0,
      [RateLimitScope.PER_IP]: 0,
      [RateLimitScope.PER_USER]: 0,
      [RateLimitScope.PER_ENDPOINT]: 0,
      [RateLimitScope.PER_API_KEY]: 0,
    };

    const byAction: Record<RateLimitBreachAction, number> = {
      [RateLimitBreachAction.THROTTLE]: 0,
      [RateLimitBreachAction.BLOCK]: 0,
      [RateLimitBreachAction.WARN]: 0,
      [RateLimitBreachAction.QUEUE]: 0,
    };

    for (const policy of this.policies) {
      byScope[policy.scope]++;
    }

    for (const breach of this.breaches) {
      byAction[breach.action]++;
    }

    return {
      totalPolicies: this.policies.length,
      activePolicies: this.policies.filter(p => p.isActive).length,
      totalBreaches: this.breaches.length,
      byScope,
      byAction,
    };
  }
}

/**
 * Get default rate limit policies
 */
export function getDefaultRateLimitPolicies(): Omit<RateLimitPolicy, 'id'>[] {
  return [
    {
      name: 'Global Rate Limit',
      description: 'Global rate limit for all requests',
      strategy: RateLimitStrategy.SLIDING_WINDOW,
      scope: RateLimitScope.GLOBAL,
      requestsPerWindow: 1000,
      windowSizeMs: 60 * 1000, // 1 minute
      breachAction: RateLimitBreachAction.THROTTLE,
      throttleDelayMs: 1000,
      priority: 1,
      isActive: true,
    },
    {
      name: 'Per-IP Rate Limit',
      description: 'Rate limit per IP address',
      strategy: RateLimitStrategy.SLIDING_WINDOW,
      scope: RateLimitScope.PER_IP,
      requestsPerWindow: 100,
      windowSizeMs: 60 * 1000, // 1 minute
      breachAction: RateLimitBreachAction.BLOCK,
      blockDurationMs: 15 * 60 * 1000, // 15 minutes
      priority: 10,
      isActive: true,
    },
    {
      name: 'Authentication Rate Limit',
      description: 'Rate limit for authentication endpoints',
      strategy: RateLimitStrategy.SLIDING_WINDOW,
      scope: RateLimitScope.PER_IP,
      endpointPattern: '/auth/*',
      requestsPerWindow: 5,
      windowSizeMs: 60 * 1000, // 1 minute
      breachAction: RateLimitBreachAction.BLOCK,
      blockDurationMs: 30 * 60 * 1000, // 30 minutes
      priority: 100,
      isActive: true,
    },
    {
      name: 'API Rate Limit',
      description: 'Rate limit per API key',
      strategy: RateLimitStrategy.TOKEN_BUCKET,
      scope: RateLimitScope.PER_API_KEY,
      requestsPerWindow: 1000,
      windowSizeMs: 60 * 1000, // 1 minute
      burstSize: 100,
      breachAction: RateLimitBreachAction.THROTTLE,
      throttleDelayMs: 500,
      priority: 50,
      isActive: true,
    },
  ];
}

/**
 * Get rate limit strategy label
 */
export function getRateLimitStrategyLabel(strategy: RateLimitStrategy): string {
  const labels: Record<RateLimitStrategy, string> = {
    [RateLimitStrategy.TOKEN_BUCKET]: 'Token Bucket',
    [RateLimitStrategy.SLIDING_WINDOW]: 'Sliding Window',
    [RateLimitStrategy.FIXED_WINDOW]: 'Fixed Window',
    [RateLimitStrategy.LEAKY_BUCKET]: 'Leaky Bucket',
  };

  return labels[strategy];
}

/**
 * Get rate limit scope label
 */
export function getRateLimitScopeLabel(scope: RateLimitScope): string {
  const labels: Record<RateLimitScope, string> = {
    [RateLimitScope.GLOBAL]: 'Global',
    [RateLimitScope.PER_IP]: 'Per IP',
    [RateLimitScope.PER_USER]: 'Per User',
    [RateLimitScope.PER_ENDPOINT]: 'Per Endpoint',
    [RateLimitScope.PER_API_KEY]: 'Per API Key',
  };

  return labels[scope];
}

/**
 * Get breach action label
 */
export function getBreachActionLabel(action: RateLimitBreachAction): string {
  const labels: Record<RateLimitBreachAction, string> = {
    [RateLimitBreachAction.THROTTLE]: 'Throttle',
    [RateLimitBreachAction.BLOCK]: 'Block',
    [RateLimitBreachAction.WARN]: 'Warn',
    [RateLimitBreachAction.QUEUE]: 'Queue',
  };

  return labels[action];
}
