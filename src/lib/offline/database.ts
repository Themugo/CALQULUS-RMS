/**
 * Offline Database (IndexedDB via Dexie)
 * 
 * Provides local storage for offline functionality:
 * - Cached API responses
 * - Queued operations for sync
 * - Offline data storage
 * - Conflict resolution tracking
 */

import Dexie, { Table } from 'dexie';

// Define database schema
export interface OfflineData {
  id?: number;
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt?: number;
  version: number;
}

export interface QueuedOperation {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  endpoint: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  errorMessage?: string;
  conflictResolved?: boolean;
}

export interface SyncMetadata {
  id?: number;
  lastSyncAt: number;
  syncVersion: number;
  pendingOperations: number;
}

export interface ConflictRecord {
  id?: number;
  operationId: number;
  localData: unknown;
  serverData: unknown;
  timestamp: number;
  resolved: boolean;
  resolution?: 'local' | 'server' | 'merge';
}

export class RentFlowOfflineDB extends Dexie {
  offlineData!: Table<OfflineData, number>;
  queuedOperations!: Table<QueuedOperation, number>;
  syncMetadata!: Table<SyncMetadata, number>;
  conflictRecords!: Table<ConflictRecord, number>;

  constructor() {
    super('RentFlowOfflineDB');
    
    this.version(1).stores({
      offlineData: '++id, key, timestamp, expiresAt, version',
      queuedOperations: '++id, operation, endpoint, timestamp, status, retryCount',
      syncMetadata: '++id, lastSyncAt, syncVersion',
      conflictRecords: '++id, operationId, timestamp, resolved',
    });
  }
}

// Initialize database
const db = new RentFlowOfflineDB();

/**
 * Cache API response locally
 */
export async function cacheResponse(
  key: string,
  data: unknown,
  ttl?: number
): Promise<void> {
  const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;
  await db.offlineData.put({
    key,
    data,
    timestamp: Date.now(),
    expiresAt,
    version: 1,
  });
}

/**
 * Get cached response
 */
export async function getCachedResponse(key: string): Promise<unknown | null> {
  const cached = await db.offlineData.where('key').equals(key).first();
  
  if (!cached) return null;
  
  // Check if expired
  if (cached.expiresAt && cached.expiresAt < Date.now()) {
    await db.offlineData.delete(cached.id!);
    return null;
  }
  
  return cached.data;
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  const now = Date.now();
  await db.offlineData
    .where('expiresAt')
    .below(now)
    .delete();
}

/**
 * Queue operation for sync
 */
export async function queueOperation(
  operation: 'create' | 'update' | 'delete',
  endpoint: string,
  payload: unknown
): Promise<number> {
  const id = await db.queuedOperations.add({
    operation,
    endpoint,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  });
  
  // Update sync metadata
  await updatePendingOperationsCount();
  
  return id;
}

/**
 * Get pending operations
 */
export async function getPendingOperations(): Promise<QueuedOperation[]> {
  return db.queuedOperations
    .where('status')
    .equals('pending')
    .toArray();
}

/**
 * Get failed operations
 */
export async function getFailedOperations(): Promise<QueuedOperation[]> {
  return db.queuedOperations
    .where('status')
    .equals('failed')
    .toArray();
}

/**
 * Update operation status
 */
export async function updateOperationStatus(
  id: number,
  status: 'pending' | 'syncing' | 'failed' | 'completed',
  errorMessage?: string
): Promise<void> {
  await db.queuedOperations.update(id, {
    status,
    errorMessage,
    retryCount: status === 'failed' ? 1 : 0,
  });
  
  if (status === 'completed') {
    await updatePendingOperationsCount();
  }
}

/**
 * Increment operation retry count
 */
export async function incrementRetryCount(id: number): Promise<void> {
  const operation = await db.queuedOperations.get(id);
  if (operation) {
    await db.queuedOperations.update(id, {
      retryCount: operation.retryCount + 1,
    });
  }
}

/**
 * Delete operation
 */
export async function deleteOperation(id: number): Promise<void> {
  await db.queuedOperations.delete(id);
  await updatePendingOperationsCount();
}

/**
 * Update sync metadata
 */
export async function updateSyncMetadata(
  lastSyncAt: number,
  syncVersion: number
): Promise<void> {
  const metadata = await db.syncMetadata.get(1);
  if (metadata) {
    await db.syncMetadata.update(1, {
      lastSyncAt,
      syncVersion,
    });
  } else {
    await db.syncMetadata.add({
      lastSyncAt,
      syncVersion,
      pendingOperations: 0,
    });
  }
}

/**
 * Get sync metadata
 */
export async function getSyncMetadata(): Promise<SyncMetadata | undefined> {
  return db.syncMetadata.get(1);
}

/**
 * Update pending operations count
 */
async function updatePendingOperationsCount(): Promise<void> {
  const pendingCount = await db.queuedOperations
    .where('status')
    .equals('pending')
    .count();
  
  const metadata = await db.syncMetadata.get(1);
  if (metadata) {
    await db.syncMetadata.update(1, {
      pendingOperations: pendingCount,
    });
  }
}

/**
 * Record conflict
 */
export async function recordConflict(
  operationId: number,
  localData: unknown,
  serverData: unknown
): Promise<number> {
  return db.conflictRecords.add({
    operationId,
    localData,
    serverData,
    timestamp: Date.now(),
    resolved: false,
  });
}

/**
 * Get unresolved conflicts
 */
export async function getUnresolvedConflicts(): Promise<ConflictRecord[]> {
  return db.conflictRecords
    .where('resolved')
    .equals(0)
    .toArray();
}

/**
 * Resolve conflict
 */
export async function resolveConflict(
  id: number,
  resolution: 'local' | 'server' | 'merge'
): Promise<void> {
  await db.conflictRecords.update(id, {
    resolved: true,
    resolution,
  });
}

/**
 * Clear all offline data
 */
export async function clearOfflineData(): Promise<void> {
  await db.offlineData.clear();
  await db.queuedOperations.clear();
  await db.syncMetadata.clear();
  await db.conflictRecords.clear();
}

/**
 * Get database size estimate
 */
export async function getDatabaseSize(): Promise<number> {
  const offlineData = await db.offlineData.toArray();
  const queuedOperations = await db.queuedOperations.toArray();
  const conflictRecords = await db.conflictRecords.toArray();
  
  const size = 
    JSON.stringify(offlineData).length +
    JSON.stringify(queuedOperations).length +
    JSON.stringify(conflictRecords).length;
  
  return size; // in bytes
}

export default db;
