/**
 * Data Prefetch Service
 * 
 * Prefetches critical data for offline access:
 * - User data
 * - Property data
 * - Payment history
 * - Lease information
 * - Static assets
 */

import { cacheAPIResponse } from './cache-service';
import { Network } from '@capacitor/network';

// Prefetch configuration
const PREFETCH_CONFIG = {
  // Prefetch on app start
  onAppStart: true,
  // Prefetch when coming online
  onOnline: true,
  // Prefetch on schedule (every X hours)
  scheduleInterval: 6, // hours
  // Maximum data size to prefetch (in MB)
  maxDataSize: 50,
};

// Critical data endpoints
const CRITICAL_ENDPOINTS = [
  {
    endpoint: '/api/user/profile',
    ttl: 'medium' as const,
    priority: 'high' as const,
  },
  {
    endpoint: '/api/properties',
    ttl: 'long' as const,
    priority: 'high' as const,
  },
  {
    endpoint: '/api/leases',
    ttl: 'medium' as const,
    priority: 'high' as const,
  },
  {
    endpoint: '/api/payments/recent',
    ttl: 'short' as const,
    priority: 'medium' as const,
  },
  {
    endpoint: '/api/invoices',
    ttl: 'medium' as const,
    priority: 'medium' as const,
  },
];

// Prefetch status
let isPrefetching = false;
let lastPrefetchAt: number | null = null;

/**
 * Initialize prefetch service
 */
export async function initializePrefetchService(): Promise<void> {
  // Prefetch on app start if enabled
  if (PREFETCH_CONFIG.onAppStart) {
    const networkStatus = await Network.getStatus();
    if (networkStatus.connected) {
      await prefetchCriticalData();
    }
  }

  // Listen for network changes
  Network.addListener('networkStatusChange', async (status) => {
    if (status.connected && PREFETCH_CONFIG.onOnline) {
      await prefetchCriticalData();
    }
  });

  // Schedule periodic prefetch
  if (PREFETCH_CONFIG.scheduleInterval > 0) {
    schedulePeriodicPrefetch();
  }

  console.warn('Prefetch service initialized');
}

/**
 * Prefetch critical data
 */
export async function prefetchCriticalData(): Promise<void> {
  if (isPrefetching) {
    console.warn('Prefetch already in progress');
    return;
  }

  const networkStatus = await Network.getStatus();
  if (!networkStatus.connected) {
    console.warn('Offline, skipping prefetch');
    return;
  }

  isPrefetching = true;

  try {
    console.warn('Prefetching critical data...');

    // Prefetch high priority endpoints first
    const highPriorityEndpoints = CRITICAL_ENDPOINTS.filter(e => e.priority === 'high');
    await prefetchEndpoints(highPriorityEndpoints);

    // Prefetch medium priority endpoints
    const mediumPriorityEndpoints = CRITICAL_ENDPOINTS.filter(e => e.priority === 'medium');
    await prefetchEndpoints(mediumPriorityEndpoints);

    lastPrefetchAt = Date.now();
    console.warn('Critical data prefetch completed');
  } catch (error) {
    console.error('Prefetch failed:', error);
  } finally {
    isPrefetching = false;
  }
}

/**
 * Prefetch specific endpoints
 */
async function prefetchEndpoints(
  endpoints: Array<{ endpoint: string; ttl: 'short' | 'medium' | 'long' | 'veryLong' }>
): Promise<void> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;

  for (const { endpoint, ttl } of endpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        await cacheAPIResponse(endpoint, data, ttl);
        console.warn(`Prefetched: ${endpoint}`);
      }
    } catch (error) {
      console.error(`Failed to prefetch ${endpoint}:`, error);
    }
  }
}

/**
 * Prefetch user-specific data
 */
export async function prefetchUserData(userId: string): Promise<void> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  const userEndpoints = [
    `/api/user/${userId}/profile`,
    `/api/user/${userId}/properties`,
    `/api/user/${userId}/leases`,
    `/api/user/${userId}/payments`,
  ];

  for (const endpoint of userEndpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        await cacheAPIResponse(endpoint, data, 'medium');
        console.warn(`Prefetched user data: ${endpoint}`);
      }
    } catch (error) {
      console.error(`Failed to prefetch user data ${endpoint}:`, error);
    }
  }
}

/**
 * Prefetch property data
 */
export async function prefetchPropertyData(propertyId: string): Promise<void> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  const propertyEndpoints = [
    `/api/properties/${propertyId}`,
    `/api/properties/${propertyId}/units`,
    `/api/properties/${propertyId}/leases`,
    `/api/properties/${propertyId}/payments`,
  ];

  for (const endpoint of propertyEndpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        await cacheAPIResponse(endpoint, data, 'long');
        console.warn(`Prefetched property data: ${endpoint}`);
      }
    } catch (error) {
      console.error(`Failed to prefetch property data ${endpoint}:`, error);
    }
  }
}

/**
 * Prefetch static assets
 */
export async function prefetchStaticAssets(assetUrls: string[]): Promise<void> {
  for (const url of assetUrls) {
    try {
      const response = await fetch(url);
      
      if (response.ok) {
        const blob = await response.blob();
        // Cache the blob data
        await cacheAPIResponse(url, blob, 'veryLong');
        console.warn(`Prefetched static asset: ${url}`);
      }
    } catch (error) {
      console.error(`Failed to prefetch static asset ${url}:`, error);
    }
  }
}

/**
 * Schedule periodic prefetch
 */
function schedulePeriodicPrefetch(): void {
  const intervalMs = PREFETCH_CONFIG.scheduleInterval * 60 * 60 * 1000;
  
  setInterval(async () => {
    const networkStatus = await Network.getStatus();
    if (networkStatus.connected) {
      await prefetchCriticalData();
    }
  }, intervalMs);
}

/**
 * Get prefetch status
 */
export function getPrefetchStatus(): {
  isPrefetching: boolean;
  lastPrefetchAt: number | null;
} {
  return {
    isPrefetching,
    lastPrefetchAt,
  };
}

/**
 * Force prefetch
 */
export async function forcePrefetch(): Promise<void> {
  await prefetchCriticalData();
}

/**
 * Clear prefetched data
 */
export async function clearPrefetchedData(): Promise<void> {
  const { clearOfflineData } = await import('./database');
  await clearOfflineData();
  lastPrefetchAt = null;
  console.warn('Prefetched data cleared');
}

/**
 * Check if data is stale
 */
export function isDataStale(lastPrefetchAt: number | null, maxAge: number = 3600000): boolean {
  if (!lastPrefetchAt) return true;
  return Date.now() - lastPrefetchAt > maxAge;
}

/**
 * Prefetch on demand
 */
export async function prefetchOnDemand(
  endpoints: Array<{ endpoint: string; ttl?: 'short' | 'medium' | 'long' | 'veryLong' }>
): Promise<void> {
  const endpointsWithDefaults = endpoints.map(e => ({
    endpoint: e.endpoint,
    ttl: e.ttl || 'medium',
  }));
  await prefetchEndpoints(endpointsWithDefaults);
}
