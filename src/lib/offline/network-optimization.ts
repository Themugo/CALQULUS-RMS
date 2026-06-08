/**
 * Network Optimization Service
 * 
 * Provides optimization for low-network conditions:
 * - Image compression
 * - Request batching
 * - Adaptive quality
 * - Data compression
 */

import { CapacitorHttp } from '@capacitor/core';
import { Network } from '@capacitor/network';

// Network optimization configuration
const NETWORK_CONFIG = {
  // Image quality settings
  imageQuality: {
    excellent: 0.9, // 90% quality
    good: 0.8, // 80% quality
    fair: 0.7, // 70% quality
    poor: 0.5, // 50% quality
  },
  // Image size limits (in pixels)
  imageSize: {
    excellent: 1920, // Full HD
    good: 1280, // HD
    fair: 1024, // HD
    poor: 800, // SD
  },
  // Request batching
  batching: {
    enabled: true,
    maxBatchSize: 10,
    batchDelay: 1000, // 1 second
  },
  // Compression
  compression: {
    enabled: true,
    threshold: 1024, // Only compress responses > 1KB
  },
};

// Network quality detection
type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor';
let currentNetworkQuality: NetworkQuality = 'good';

/**
 * Detect network quality
 */
export async function detectNetworkQuality(): Promise<NetworkQuality> {
  const status = await Network.getStatus();
  
  if (!status.connected) {
    return 'poor';
  }

  // Estimate quality based on connection type
  switch (status.connectionType) {
    case 'wifi':
      return 'excellent';
    case 'cellular':
      // For cellular, default to 'good' since networkType may not be available
      return 'good';
    default:
      return 'good';
  }
}

/**
 * Update network quality
 */
export async function updateNetworkQuality(): Promise<void> {
  currentNetworkQuality = await detectNetworkQuality();
}

/**
 * Get current network quality
 */
export function getNetworkQuality(): NetworkQuality {
  return currentNetworkQuality;
}

/**
 * Compress image
 */
export async function compressImage(
  file: File,
  quality?: number,
  maxSize?: number
): Promise<Blob> {
  const imgQuality = quality || NETWORK_CONFIG.imageQuality[currentNetworkQuality];
  const imgMaxSize = maxSize || NETWORK_CONFIG.imageSize[currentNetworkQuality];

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate dimensions
      let width = img.width;
      let height = img.height;

      if (width > imgMaxSize || height > imgMaxSize) {
        const ratio = Math.min(imgMaxSize / width, imgMaxSize / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        imgQuality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Resize image
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to resize image'));
          }
        },
        'image/jpeg',
        0.9
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Request batcher
 */
class RequestBatcher {
  private batch: Array<{
    endpoint: string;
    options: RequestInit;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(private maxBatchSize: number = NETWORK_CONFIG.batching.maxBatchSize) {}

  /**
   * Add request to batch
   */
  add(
    endpoint: string,
    options: RequestInit
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.batch.push({ endpoint, options, resolve, reject });

      if (this.batch.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => this.flush(), NETWORK_CONFIG.batching.batchDelay);
      }
    });
  }

  /**
   * Flush batch
   */
  private async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.batch.length === 0) return;

    const currentBatch = this.batch;
    this.batch = [];

    try {
      // Process batch
      const results = await Promise.allSettled(
        currentBatch.map(({ endpoint, options }) =>
          CapacitorHttp.request({
            url: endpoint,
            method: (options.method as any) || 'GET',
            data: options.body,
            headers: options.headers as Record<string, string>,
          })
        )
      );

      // Resolve/reject individual promises
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          currentBatch[index].resolve(result.value.data);
        } else {
          currentBatch[index].reject(result.reason);
        }
      });
    } catch (error) {
      // Reject all if batch fails
      currentBatch.forEach(({ reject }) => {
        reject(error as Error);
      });
    }
  }
}

// Global request batcher
const requestBatcher = new RequestBatcher();

/**
 * Batched request
 */
export async function batchedRequest(
  endpoint: string,
  options?: RequestInit
): Promise<unknown> {
  if (!NETWORK_CONFIG.batching.enabled) {
    const response = await CapacitorHttp.request({
      url: endpoint,
      method: (options?.method as any) || 'GET',
      data: options?.body,
      headers: options?.headers as Record<string, string>,
    });
    return response.data;
  }

  return requestBatcher.add(endpoint, options || {});
}

/**
 * Compress data
 */
export function compressData(data: string): string {
  if (!NETWORK_CONFIG.compression.enabled) {
    return data;
  }

  // Simple compression using JSON.stringify with space removal
  // In production, use a proper compression library like pako
  try {
    const parsed = JSON.parse(data);
    return JSON.stringify(parsed);
  } catch {
    return data;
  }
}

/**
 * Get adaptive image quality
 */
export function getAdaptiveImageQuality(): number {
  return NETWORK_CONFIG.imageQuality[currentNetworkQuality];
}

/**
 * Get adaptive image size
 */
export function getAdaptiveImageSize(): number {
  return NETWORK_CONFIG.imageSize[currentNetworkQuality];
}

/**
 * Should use low-quality mode
 */
export function shouldUseLowQuality(): boolean {
  return currentNetworkQuality === 'poor' || currentNetworkQuality === 'fair';
}

/**
 * Optimize request for current network
 */
export function optimizeRequest(options: RequestInit): RequestInit {
  const optimized = { ...options };

  // Add compression headers
  if (NETWORK_CONFIG.compression.enabled) {
    optimized.headers = {
      ...optimized.headers,
      'Accept-Encoding': 'gzip, deflate',
    };
  }

  // Add timeout for poor network
  if (currentNetworkQuality === 'poor') {
    // Signal doesn't support timeout in RequestInit, but we can handle it in the fetch
  }

  return optimized;
}

/**
 * Monitor network quality changes
 */
export function startNetworkQualityMonitoring(): void {
  Network.addListener('networkStatusChange', async () => {
    await updateNetworkQuality();
  });

  // Initial check
  updateNetworkQuality();
}
