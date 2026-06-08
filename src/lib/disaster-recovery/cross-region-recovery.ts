/**
 * Cross-Region Recovery System
 * 
 * Implements multi-region disaster recovery with:
 * - Region health monitoring
 * - Automated failover
 * - Data replication
 * - Recovery point objectives
 * - Recovery time objectives
 * - Region synchronization
 */

// Region status
export enum RegionStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  OFFLINE = 'offline',
  RECOVERING = 'recovering',
}

// Replication status
export enum ReplicationStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  FAILED = 'failed',
  SYNCING = 'syncing',
  COMPLETED = 'completed',
}

// Failover status
export enum FailoverStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLBACK = 'rollback',
}

// Region configuration
export interface RegionConfig {
  id: string;
  name: string;
  location: string;
  provider: 'aws' | 'azure' | 'gcp' | 'on-premise';
  isPrimary: boolean;
  isActive: boolean;
  endpoint: string;
  apiEndpoint: string;
  storageEndpoint: string;
  status: RegionStatus;
  lastHealthCheck?: Date;
  latency?: number; // milliseconds
  metadata?: Record<string, unknown>;
}

// Replication configuration
export interface ReplicationConfig {
  id: string;
  sourceRegionId: string;
  targetRegionId: string;
  type: 'sync' | 'async' | 'scheduled';
  frequency: number; // minutes
  status: ReplicationStatus;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  lagSeconds?: number;
  dataSize: number;
}

// Failover configuration
export interface FailoverConfig {
  id: string;
  primaryRegionId: string;
  secondaryRegionId: string;
  autoFailover: boolean;
  healthCheckInterval: number; // seconds
  failoverThreshold: number; // consecutive failures
  rtoSeconds: number; // Recovery Time Objective
  rpoSeconds: number; // Recovery Point Objective
  isActive: boolean;
}

// Failover event
export interface FailoverEvent {
  id: string;
  configId: string;
  triggeredAt: Date;
  triggeredBy: string;
  reason: string;
  fromRegionId: string;
  toRegionId: string;
  status: FailoverStatus;
  completedAt?: Date;
  duration?: number; // seconds
  rollbackAvailable: boolean;
}

// Region health check
export interface RegionHealthCheck {
  regionId: string;
  timestamp: Date;
  isHealthy: boolean;
  latency: number;
  errorCount: number;
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    latency?: number;
  }>;
}

/**
 * Create region configuration
 */
export function createRegionConfig(
  name: string,
  location: string,
  provider: 'aws' | 'azure' | 'gcp' | 'on-premise',
  isPrimary: boolean,
  endpoint: string,
  apiEndpoint: string,
  storageEndpoint: string
): RegionConfig {
  return {
    id: `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    location,
    provider,
    isPrimary,
    isActive: true,
    endpoint,
    apiEndpoint,
    storageEndpoint,
    status: RegionStatus.HEALTHY,
  };
}

/**
 * Update region status
 */
export function updateRegionStatus(
  region: RegionConfig,
  status: RegionStatus
): RegionConfig {
  return {
    ...region,
    status,
    lastHealthCheck: new Date(),
  };
}

/**
 * Perform health check
 */
export async function performHealthCheck(region: RegionConfig): Promise<RegionHealthCheck> {
  const startTime = Date.now();
  
  try {
    // Simulate health check - in production, actual API calls would be made
    const latency = Math.floor(Math.random() * 100) + 10;
    
    const services = [
      { name: 'API', status: 'up' as const, latency },
      { name: 'Database', status: 'up' as const, latency: latency + 20 },
      { name: 'Storage', status: 'up' as const, latency: latency + 10 },
      { name: 'Cache', status: 'up' as const, latency: latency + 5 },
    ];
    
    const isHealthy = services.every(s => s.status === 'up');
    
    return {
      regionId: region.id,
      timestamp: new Date(),
      isHealthy,
      latency,
      errorCount: 0,
      services,
    };
  } catch (error) {
    return {
      regionId: region.id,
      timestamp: new Date(),
      isHealthy: false,
      latency: Date.now() - startTime,
      errorCount: 1,
      services: [],
    };
  }
}

/**
 * Create replication configuration
 */
export function createReplicationConfig(
  sourceRegionId: string,
  targetRegionId: string,
  type: 'sync' | 'async' | 'scheduled',
  frequency: number
): ReplicationConfig {
  const nextSyncAt = new Date();
  nextSyncAt.setMinutes(nextSyncAt.getMinutes() + frequency);
  
  return {
    id: `replication_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sourceRegionId,
    targetRegionId,
    type,
    frequency,
    status: ReplicationStatus.ACTIVE,
    nextSyncAt,
    dataSize: 0,
  };
}

/**
 * Update replication status
 */
export function updateReplicationStatus(
  replication: ReplicationConfig,
  status: ReplicationStatus,
  lagSeconds?: number
): ReplicationConfig {
  return {
    ...replication,
    status,
    lagSeconds,
    lastSyncAt: status === ReplicationStatus.COMPLETED ? new Date() : replication.lastSyncAt,
  };
}

/**
 * Create failover configuration
 */
export function createFailoverConfig(
  primaryRegionId: string,
  secondaryRegionId: string,
  autoFailover: boolean,
  healthCheckInterval: number,
  failoverThreshold: number,
  rtoSeconds: number,
  rpoSeconds: number
): FailoverConfig {
  return {
    id: `failover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    primaryRegionId,
    secondaryRegionId,
    autoFailover,
    healthCheckInterval,
    failoverThreshold,
    rtoSeconds,
    rpoSeconds,
    isActive: true,
  };
}

/**
 * Trigger failover
 */
export function triggerFailover(
  config: FailoverConfig,
  reason: string,
  triggeredBy: string
): FailoverEvent {
  return {
    id: `failover_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    configId: config.id,
    triggeredAt: new Date(),
    triggeredBy,
    reason,
    fromRegionId: config.primaryRegionId,
    toRegionId: config.secondaryRegionId,
    status: FailoverStatus.IN_PROGRESS,
    rollbackAvailable: true,
  };
}

/**
 * Complete failover
 */
export function completeFailover(event: FailoverEvent): FailoverEvent {
  const duration = (Date.now() - event.triggeredAt.getTime()) / 1000;
  
  return {
    ...event,
    status: FailoverStatus.COMPLETED,
    completedAt: new Date(),
    duration,
  };
}

/**
 * Fail failover
 */
export function failFailover(event: FailoverEvent, reason: string): FailoverEvent {
  return {
    ...event,
    status: FailoverStatus.FAILED,
    completedAt: new Date(),
    metadata: {
      ...event.metadata,
      failureReason: reason,
    },
  };
}

/**
 * Rollback failover
 */
export function rollbackFailover(event: FailoverEvent, triggeredBy: string): FailoverEvent {
  return {
    ...event,
    status: FailoverStatus.ROLLBACK,
    triggeredBy,
  };
}

/**
 * Check if failover should be triggered
 */
export function shouldTriggerFailover(
  config: FailoverConfig,
  healthChecks: RegionHealthCheck[],
  consecutiveFailures: number
): boolean {
  if (!config.autoFailover || !config.isActive) {
    return false;
  }
  
  return consecutiveFailures >= config.failoverThreshold;
}

/**
 * Calculate RPO compliance
 */
export function calculateRPOCompliance(
  replication: ReplicationConfig,
  targetRPOSeconds: number
): {
  isCompliant: boolean;
  actualRPOSeconds: number;
  compliancePercentage: number;
} {
  const actualRPOSeconds = replication.lagSeconds || 0;
  const isCompliant = actualRPOSeconds <= targetRPOSeconds;
  const compliancePercentage = Math.min(100, (targetRPOSeconds / actualRPOSeconds) * 100);
  
  return {
    isCompliant,
    actualRPOSeconds,
    compliancePercentage,
  };
}

/**
 * Calculate RTO compliance
 */
export function calculateRTOCompliance(
  event: FailoverEvent,
  targetRTOSeconds: number
): {
  isCompliant: boolean;
  actualRTOSeconds: number;
  compliancePercentage: number;
} {
  if (!event.duration) {
    return {
      isCompliant: false,
      actualRPOSeconds: 0,
      compliancePercentage: 0,
    };
  }
  
  const actualRTOSeconds = event.duration;
  const isCompliant = actualRTOSeconds <= targetRTOSeconds;
  const compliancePercentage = Math.min(100, (targetRTOSeconds / actualRTOSeconds) * 100);
  
  return {
    isCompliant,
    actualRTOSeconds,
    compliancePercentage,
  };
}

/**
 * Get region status label
 */
export function getRegionStatusLabel(status: RegionStatus): string {
  const labels: Record<RegionStatus, string> = {
    [RegionStatus.HEALTHY]: 'Healthy',
    [RegionStatus.DEGRADED]: 'Degraded',
    [RegionStatus.UNHEALTHY]: 'Unhealthy',
    [RegionStatus.OFFLINE]: 'Offline',
    [RegionStatus.RECOVERING]: 'Recovering',
  };

  return labels[status];
}

/**
 * Get replication status label
 */
export function getReplicationStatusLabel(status: ReplicationStatus): string {
  const labels: Record<ReplicationStatus, string> = {
    [ReplicationStatus.ACTIVE]: 'Active',
    [ReplicationStatus.PAUSED]: 'Paused',
    [ReplicationStatus.FAILED]: 'Failed',
    [ReplicationStatus.SYNCING]: 'Syncing',
    [ReplicationStatus.COMPLETED]: 'Completed',
  };

  return labels[status];
}

/**
 * Get failover status label
 */
export function getFailoverStatusLabel(status: FailoverStatus): string {
  const labels: Record<FailoverStatus, string> = {
    [FailoverStatus.PENDING]: 'Pending',
    [FailoverStatus.IN_PROGRESS]: 'In Progress',
    [FailoverStatus.COMPLETED]: 'Completed',
    [FailoverStatus.FAILED]: 'Failed',
    [FailoverStatus.ROLLBACK]: 'Rollback',
  };

  return labels[status];
}

/**
 * Get healthy regions
 */
export function getHealthyRegions(regions: RegionConfig[]): RegionConfig[] {
  return regions.filter(region => region.status === RegionStatus.HEALTHY && region.isActive);
}

/**
 * Get primary region
 */
export function getPrimaryRegion(regions: RegionConfig[]): RegionConfig | null {
  return regions.find(region => region.isPrimary) || null;
}

/**
 * Get secondary regions
 */
export function getSecondaryRegions(regions: RegionConfig[]): RegionConfig[] {
  return regions.filter(region => !region.isPrimary && region.isActive);
}

/**
 * Get region statistics
 */
export function getRegionStatistics(regions: RegionConfig[]): {
  totalRegions: number;
  healthyRegions: number;
  degradedRegions: number;
  unhealthyRegions: number;
  offlineRegions: number;
  averageLatency: number;
  byProvider: Record<string, number>;
  byStatus: Record<RegionStatus, number>;
} {
  const healthyRegions = regions.filter(r => r.status === RegionStatus.HEALTHY).length;
  const degradedRegions = regions.filter(r => r.status === RegionStatus.DEGRADED).length;
  const unhealthyRegions = regions.filter(r => r.status === RegionStatus.UNHEALTHY).length;
  const offlineRegions = regions.filter(r => r.status === RegionStatus.OFFLINE).length;
  
  const latencies = regions.filter(r => r.latency !== undefined).map(r => r.latency!);
  const averageLatency = latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0;
  
  const byProvider: Record<string, number> = {};
  const byStatus: Record<RegionStatus, number> = {
    [RegionStatus.HEALTHY]: 0,
    [RegionStatus.DEGRADED]: 0,
    [RegionStatus.UNHEALTHY]: 0,
    [RegionStatus.OFFLINE]: 0,
    [RegionStatus.RECOVERING]: 0,
  };
  
  for (const region of regions) {
    byProvider[region.provider] = (byProvider[region.provider] || 0) + 1;
    byStatus[region.status]++;
  }
  
  return {
    totalRegions: regions.length,
    healthyRegions,
    degradedRegions,
    unhealthyRegions,
    offlineRegions,
    averageLatency,
    byProvider,
    byStatus,
  };
}

/**
 * Get replication statistics
 */
export function getReplicationStatistics(replications: ReplicationConfig[]): {
  totalReplications: number;
  activeReplications: number;
  failedReplications: number;
  averageLag: number;
  totalDataSize: number;
  byType: Record<string, number>;
  byStatus: Record<ReplicationStatus, number>;
} {
  const activeReplications = replications.filter(r => r.status === ReplicationStatus.ACTIVE).length;
  const failedReplications = replications.filter(r => r.status === ReplicationStatus.FAILED).length;
  
  const lags = replications.filter(r => r.lagSeconds !== undefined).map(r => r.lagSeconds!);
  const averageLag = lags.length > 0 ? lags.reduce((sum, l) => sum + l, 0) / lags.length : 0;
  
  const totalDataSize = replications.reduce((sum, r) => sum + r.dataSize, 0);
  
  const byType: Record<string, number> = {};
  const byStatus: Record<ReplicationStatus, number> = {
    [ReplicationStatus.ACTIVE]: 0,
    [ReplicationStatus.PAUSED]: 0,
    [ReplicationStatus.FAILED]: 0,
    [ReplicationStatus.SYNCING]: 0,
    [ReplicationStatus.COMPLETED]: 0,
  };
  
  for (const replication of replications) {
    byType[replication.type] = (byType[replication.type] || 0) + 1;
    byStatus[replication.status]++;
  }
  
  return {
    totalReplications: replications.length,
    activeReplications,
    failedReplications,
    averageLag,
    totalDataSize,
    byType,
    byStatus,
  };
}

/**
 * Get failover statistics
 */
export function getFailoverStatistics(events: FailoverEvent[]): {
  totalFailovers: number;
  successfulFailovers: number;
  failedFailovers: number;
  rolledBackFailovers: number;
  averageDuration: number;
  averageRTOCompliance: number;
  byStatus: Record<FailoverStatus, number>;
} {
  const successfulFailovers = events.filter(e => e.status === FailoverStatus.COMPLETED).length;
  const failedFailovers = events.filter(e => e.status === FailoverStatus.FAILED).length;
  const rolledBackFailovers = events.filter(e => e.status === FailoverStatus.ROLLBACK).length;
  
  const durations = events.filter(e => e.duration !== undefined).map(e => e.duration!);
  const averageDuration = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
  
  const byStatus: Record<FailoverStatus, number> = {
    [FailoverStatus.PENDING]: 0,
    [FailoverStatus.IN_PROGRESS]: 0,
    [FailoverStatus.COMPLETED]: 0,
    [FailoverStatus.FAILED]: 0,
    [FailoverStatus.ROLLBACK]: 0,
  };
  
  for (const event of events) {
    byStatus[event.status]++;
  }
  
  return {
    totalFailovers: events.length,
    successfulFailovers,
    failedFailovers,
    rolledBackFailovers,
    averageDuration,
    averageRTOCompliance: 0, // Would need config to calculate
    byStatus,
  };
}

/**
 * Format duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(0)}s`;
  }
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${(seconds % 60).toFixed(0)}s`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Format latency
 */
export function formatLatency(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(0)}ms`;
  }
  
  return `${(milliseconds / 1000).toFixed(2)}s`;
}
