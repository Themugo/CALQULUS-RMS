/**
 * Conflict Resolution Service
 * 
 * Handles conflict resolution for offline changes:
 * - Detect conflicts between local and server data
 * - Resolve conflicts using strategies
 * - Merge conflicting data
 * - Provide UI for conflict resolution
 */

import db, {
  recordConflict,
  getUnresolvedConflicts,
  resolveConflict,
} from './database';

// Conflict resolution strategies
export enum ConflictResolutionStrategy {
  LOCAL_WINS = 'local_wins',
  SERVER_WINS = 'server_wins',
  MANUAL_MERGE = 'manual_merge',
  LATEST_WINS = 'latest_wins',
}

// Conflict type
export enum ConflictType {
  VERSION_MISMATCH = 'version_mismatch',
  DATA_CONFLICT = 'data_conflict',
  DELETED_CONFLICT = 'deleted_conflict',
  CONSTRAINT_VIOLATION = 'constraint_violation',
}

// Conflict interface
export interface Conflict {
  id?: number;
  operationId: number;
  type: ConflictType;
  localData: unknown;
  serverData: unknown;
  timestamp: number;
  resolved: boolean;
  resolution?: 'local' | 'server' | 'merge';
}

/**
 * Detect conflict between local and server data
 */
export async function detectConflict(
  operationId: number,
  localData: unknown,
  serverData: unknown
): Promise<boolean> {
  // Check if data has changed
  const hasChanged = hasDataChanged(localData, serverData);
  
  if (hasChanged) {
    // Record conflict
    await recordConflict(operationId, localData, serverData);
    
    return true;
  }
  
  return false;
}

/**
 * Check if data has changed
 */
function hasDataChanged(localData: unknown, serverData: unknown): boolean {
  const localJson = JSON.stringify(localData);
  const serverJson = JSON.stringify(serverData);
  
  return localJson !== serverJson;
}

/**
 * Determine conflict type
 */
function determineConflictType(localData: unknown, serverData: unknown): ConflictType {
  if (!localData && serverData) {
    return ConflictType.DELETED_CONFLICT;
  }
  
  if (localData && !serverData) {
    return ConflictType.DELETED_CONFLICT;
  }
  
  // Check for version mismatch
  const localVersion = (localData as Record<string, unknown>)?.version;
  const serverVersion = (serverData as Record<string, unknown>)?.version;
  
  if (localVersion !== serverVersion) {
    return ConflictType.VERSION_MISMATCH;
  }
  
  return ConflictType.DATA_CONFLICT;
}

/**
 * Get all unresolved conflicts
 */
export async function getConflicts(): Promise<Conflict[]> {
  const conflicts = await getUnresolvedConflicts();
  
  return conflicts.map(conflict => ({
    ...conflict,
    type: determineConflictType(conflict.localData, conflict.serverData),
  }));
}

/**
 * Resolve conflict with strategy
 */
export async function resolveConflictWithStrategy(
  conflictId: number,
  strategy: ConflictResolutionStrategy,
  _mergedData?: unknown
): Promise<void> {
  let resolution: 'local' | 'server' | 'merge';
  
  switch (strategy) {
    case ConflictResolutionStrategy.LOCAL_WINS:
      resolution = 'local';
      break;
    
    case ConflictResolutionStrategy.SERVER_WINS:
      resolution = 'server';
      break;
    
    case ConflictResolutionStrategy.MANUAL_MERGE:
      resolution = 'merge';
      break;
    
    case ConflictResolutionStrategy.LATEST_WINS: {
      const conflict = await db.conflictRecords.get(conflictId);
      if (conflict) {
        const localTimestamp = (conflict.localData as Record<string, unknown>)?.updated_at as number || 0;
        const serverTimestamp = (conflict.serverData as Record<string, unknown>)?.updated_at as number || 0;
        resolution = localTimestamp > serverTimestamp ? 'local' : 'server';
      } else {
        resolution = 'server';
      }
      break;
    }
    
    default:
      resolution = 'server';
  }
  
  await resolveConflict(conflictId, resolution);
}

/**
 * Merge conflicting data
 */
export function mergeData(
  localData: unknown,
  serverData: unknown,
  mergeStrategy: 'local' | 'server' | 'deep_merge' = 'deep_merge'
): unknown {
  switch (mergeStrategy) {
    case 'local':
      return localData;
    
    case 'server':
      return serverData;
    
    case 'deep_merge':
      return deepMerge(localData, serverData);
  }
}

/**
 * Deep merge two objects
 */
function deepMerge(target: unknown, source: unknown): unknown {
  if (typeof target !== 'object' || target === null) {
    return source;
  }
  
  if (typeof source !== 'object' || source === null) {
    return target;
  }
  
  const result = { ...(target as Record<string, unknown>) };
  
  for (const key in source as Record<string, unknown>) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetValue = (target as Record<string, unknown>)[key];
      const sourceValue = (source as Record<string, unknown>)[key];
      
      if (typeof targetValue === 'object' && typeof sourceValue === 'object') {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue;
      }
    }
  }
  
  return result;
}

/**
 * Auto-resolve conflicts based on strategy
 */
export async function autoResolveConflicts(
  strategy: ConflictResolutionStrategy
): Promise<number> {
  const conflicts = await getConflicts();
  let resolvedCount = 0;
  
  for (const conflict of conflicts) {
    try {
      await resolveConflictWithStrategy(conflict.id, strategy);
      resolvedCount++;
    } catch (error) {
      console.error(`Failed to resolve conflict ${conflict.id}:`, error);
    }
  }
  
  return resolvedCount;
}

/**
 * Get conflict summary
 */
export async function getConflictSummary(): Promise<{
  total: number;
  unresolved: number;
  byType: Record<ConflictType, number>;
}> {
  const conflicts = await getConflicts();
  const unresolved = conflicts.filter(c => !c.resolved);
  
  const byType: Record<ConflictType, number> = {
    [ConflictType.VERSION_MISMATCH]: 0,
    [ConflictType.DATA_CONFLICT]: 0,
    [ConflictType.DELETED_CONFLICT]: 0,
    [ConflictType.CONSTRAINT_VIOLATION]: 0,
  };
  
  for (const conflict of unresolved) {
    byType[conflict.type]++;
  }
  
  return {
    total: conflicts.length,
    unresolved: unresolved.length,
    byType,
  };
}

/**
 * Clear resolved conflicts
 */
export async function clearResolvedConflicts(): Promise<void> {
  const conflicts = await db.conflictRecords.where('resolved').equals(1).toArray();
  
  for (const conflict of conflicts) {
    if (conflict.id) {
      await db.conflictRecords.delete(conflict.id);
    }
  }
}

/**
 * Get conflict by operation ID
 */
export async function getConflictByOperationId(
  operationId: number
): Promise<Conflict | undefined> {
  const conflict = await db.conflictRecords
    .where('operationId')
    .equals(operationId)
    .first();
  
  if (!conflict) return undefined;
  
  return {
    ...conflict,
    type: determineConflictType(conflict.localData, conflict.serverData),
  };
}

/**
 * Batch resolve conflicts
 */
export async function batchResolveConflicts(
  conflictIds: number[],
  strategy: ConflictResolutionStrategy
): Promise<{ resolved: number; failed: number }> {
  let resolved = 0;
  let failed = 0;
  
  for (const conflictId of conflictIds) {
    try {
      await resolveConflictWithStrategy(conflictId, strategy);
      resolved++;
    } catch (error) {
      console.error(`Failed to resolve conflict ${conflictId}:`, error);
      failed++;
    }
  }
  
  return { resolved, failed };
}
