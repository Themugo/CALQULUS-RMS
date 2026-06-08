/**
 * Rate Limiting Middleware
 * 
 * Provides rate limiting for API endpoints to prevent abuse:
 * - IP-based rate limiting
 * - User-based rate limiting
 * - Endpoint-specific limits
 * - Sliding window algorithm
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client (for production)
// For development, we'll use an in-memory fallback
let ratelimit: Ratelimit | null = null;

try {
  if (import.meta.env.VITE_UPSTASH_REDIS_REST_URL && import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL,
      token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
    });

    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
      analytics: true,
      prefix: 'rentflow_ratelimit',
    });
  }
} catch (error) {
  console.warn('Failed to initialize Redis rate limiter, using in-memory fallback:', error);
}

// In-memory fallback for development
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP address or user ID)
 * @param limit - Maximum number of requests
 * @param window - Time window in seconds
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  window: number = 10
): Promise<{ success: boolean; remaining: number; reset: number }> {
  // Use Upstash Redis if available
  if (ratelimit) {
    try {
      const result = await ratelimit.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fallback to in-memory
    }
  }

  // In-memory fallback
  const now = Date.now();
  const windowMs = window * 1000;
  const key = identifier;

  const stored = inMemoryStore.get(key);

  if (!stored || now > stored.resetTime) {
    // New window
    inMemoryStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: limit - 1,
      reset: now + windowMs,
    };
  }

  if (stored.count >= limit) {
    return {
      success: false,
      remaining: 0,
      reset: stored.resetTime,
    };
  }

  // Increment count
  stored.count += 1;
  inMemoryStore.set(key, stored);

  return {
    success: true,
    remaining: limit - stored.count,
    reset: stored.resetTime,
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Authentication endpoints
  auth: {
    login: { limit: 5, window: 60 }, // 5 requests per minute
    signup: { limit: 3, window: 60 }, // 3 requests per minute
    resetPassword: { limit: 3, window: 60 }, // 3 requests per minute
  },
  // Payment endpoints
  payments: {
    callback: { limit: 100, window: 60 }, // 100 requests per minute (webhooks)
    initiate: { limit: 10, window: 60 }, // 10 requests per minute
  },
  // Messaging endpoints
  messaging: {
    sms: { limit: 20, window: 60 }, // 20 requests per minute
    email: { limit: 20, window: 60 }, // 20 requests per minute
    whatsapp: { limit: 20, window: 60 }, // 20 requests per minute
  },
  // API endpoints
  api: {
    general: { limit: 100, window: 60 }, // 100 requests per minute
    read: { limit: 200, window: 60 }, // 200 requests per minute
    write: { limit: 50, window: 60 }, // 50 requests per minute
  },
} as const;

/**
 * Get rate limit configuration for an endpoint
 * @param endpoint - Endpoint name
 * @param action - Action type (optional)
 */
export function getRateLimitConfig(endpoint: keyof typeof RATE_LIMITS, action?: string) {
  const config = RATE_LIMITS[endpoint];
  if (action && typeof config === 'object' && action in config) {
    return (config as any)[action];
  }
  if (typeof config === 'object' && 'general' in config) {
    return (config as any).general;
  }
  return { limit: 100, window: 60 }; // Default
}

/**
 * Clean up expired in-memory rate limit entries
 */
export function cleanupExpiredRateLimits() {
  const now = Date.now();
  for (const [key, value] of inMemoryStore.entries()) {
    if (now > value.resetTime) {
      inMemoryStore.delete(key);
    }
  }
}

// Run cleanup every minute
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredRateLimits, 60000);
}
