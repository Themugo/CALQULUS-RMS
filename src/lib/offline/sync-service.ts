/**
 * Offline Sync Service
 * 
 * Handles synchronization between local offline data and remote server:
 * - Queue operations when offline
 * - Sync when online
 * - Conflict resolution
 * - Retry logic
 */

import { CapacitorHttp } from '@capacitor/core';
import { Network } from '@capacitor/network';
import db, {
  queueOperation,
  getPendingOperations,
  getFailedOperations,
  updateOperationStatus,
  incrementRetryCount,
  deleteOperation,
  updateSyncMetadata,
  getSyncMetadata,
  recordConflict,
  getUnresolvedConflicts,
  resolveConflict,
} from './database';

// Sync configuration
const SYNC_CONFIG = {
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  syncInterval: 30000, // 30 seconds
  batchSize: 10,
};

// Sync state
let isSyncing = false;
let syncInterval: NodeJS.Timeout | null = null;
let isOnline = true;

/**
 * Initialize sync service
 */
export async function initializeSyncService(): Promise<void> {
  // Check initial network status
  const status = await Network.getStatus();
  isOnline = status.connected;

  // Listen for network changes
  Network.addListener('networkStatusChange', (status: { connected: boolean }) => {
    isOnline = status.connected;
    if (isOnline) {
      // Trigger sync when coming back online
      syncPendingOperations();
    }
  });

  // Start periodic sync
  startPeriodicSync();

  console.warn('Sync service initialized');
}

/**
 * Start periodic sync
 */
function startPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  syncInterval = setInterval(() => {
    if (isOnline && !isSyncing) {
      syncPendingOperations();
    }
  }, SYNC_CONFIG.syncInterval);
}

/**
 * Stop periodic sync
 */
export function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

/**
 * Sync pending operations
 */
export async function syncPendingOperations(): Promise<void> {
  if (isSyncing) {
    console.warn('Sync already in progress');
    return;
  }

  if (!isOnline) {
    console.warn('Offline, skipping sync');
    return;
  }

  isSyncing = true;

  try {
    const operations = await getPendingOperations();
    const failedOperations = await getFailedOperations();
    const allOperations = [...operations, ...failedOperations];

    if (allOperations.length === 0) {
      console.warn('No operations to sync');
      return;
    }

    console.warn(`Syncing ${allOperations.length} operations`);

    // Process in batches
    for (let i = 0; i < allOperations.length; i += SYNC_CONFIG.batchSize) {
      const batch = allOperations.slice(i, i + SYNC_CONFIG.batchSize);
      await processBatch(batch);
    }

    // Update sync metadata
    await updateSyncMetadata(Date.now(), Date.now());

    console.warn('Sync completed');
  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    isSyncing = false;
  }
}

/**
 * Process batch of operations
 */
async function processBatch(operations: any[]): Promise<void> {
  for (const operation of operations) {
    try {
      await updateOperationStatus(operation.id!, 'syncing');
      await executeOperation(operation);
      await updateOperationStatus(operation.id!, 'completed');
      await deleteOperation(operation.id!);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await incrementRetryCount(operation.id!);
      
      if (operation.retryCount >= SYNC_CONFIG.maxRetries) {
        await updateOperationStatus(operation.id!, 'failed', errorMessage);
        
        // Record conflict if it's a conflict error
        if (errorMessage.includes('conflict') || errorMessage.includes('409')) {
          await recordConflict(
            operation.id!,
            operation.payload,
            null // Server data would be fetched separately
          );
        }
      } else {
        await updateOperationStatus(operation.id!, 'pending');
      }
    }
  }
}

/**
 * Execute single operation
 */
async function executeOperation(operation: any): Promise<void> {
  const { operation: opType, endpoint, payload } = operation;

  let response;
  switch (opType) {
    case 'create':
      response = await CapacitorHttp.post({
        url: endpoint,
        data: payload,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      break;

    case 'update':
      response = await CapacitorHttp.put({
        url: endpoint,
        data: payload,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      break;

    case 'delete':
      response = await CapacitorHttp.delete({
        url: endpoint,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      break;

    default:
      throw new Error(`Unknown operation type: ${opType}`);
  }

  if (response.status >= 400) {
    throw new Error(`HTTP ${response.status}: ${response.data?.message || 'Request failed'}`);
  }

  return response.data;
}

/**
 * Queue operation for sync
 */
export async function queueOfflineOperation(
  operation: 'create' | 'update' | 'delete',
  endpoint: string,
  payload: unknown
): Promise<number> {
  const id = await queueOperation(operation, endpoint, payload);
  
  // Trigger sync if online
  if (isOnline) {
    syncPendingOperations();
  }
  
  return id;
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<{
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncAt: number | undefined;
  conflicts: number;
}> {
  const metadata = await getSyncMetadata();
  const pending = await getPendingOperations();
  const conflicts = await getUnresolvedConflicts();

  return {
    isOnline,
    isSyncing,
    pendingOperations: pending.length,
    lastSyncAt: metadata?.lastSyncAt,
    conflicts: conflicts.length,
  };
}

/**
 * Force sync
 */
export async function forceSync(): Promise<void> {
  if (!isOnline) {
    throw new Error('Cannot sync while offline');
  }
  
  await syncPendingOperations();
}

/**
 * Resolve conflict
 */
export async function resolveOfflineConflict(
  conflictId: number,
  resolution: 'local' | 'server' | 'merge'
): Promise<void> {
  await resolveConflict(conflictId, resolution);
  
  // If resolved with local data, re-queue the operation
  if (resolution === 'local') {
    const conflict = await db.conflictRecords.get(conflictId);
    if (conflict) {
      const operation = await db.queuedOperations.get(conflict.operationId);
      if (operation) {
        await updateOperationStatus(operation.id!, 'pending');
      }
    }
  }
}

/**
 * Clear all pending operations
 */
export async function clearPendingOperations(): Promise<void> {
  const operations = await getPendingOperations();
  for (const operation of operations) {
    await deleteOperation(operation.id!);
  }
}

/**
 * Get network status
 */
export async function getNetworkStatus(): Promise<boolean> {
  const status = await Network.getStatus();
  return status.connected;
}

/**
 * Add network status listener
 */
export function addNetworkStatusListener(
  callback: (status: boolean) => void
): void {
  Network.addListener('networkStatusChange', (status: { connected: boolean }) => {
    callback(status.connected);
  });
}
