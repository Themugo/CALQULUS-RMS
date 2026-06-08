/**
 * RPO/RTO Documentation and Tracking System
 * 
 * Implements Recovery Point Objective (RPO) and Recovery Time Objective (RTO) management with:
 * - RPO/RTO definition and tracking
 * - Compliance monitoring
 * - Performance metrics
 * - Documentation generation
 * - Alerting on violations
 * - Historical tracking
 */

// RPO/RTO status
export enum RPORTOStatus {
  COMPLIANT = 'compliant',
  WARNING = 'warning',
  VIOLATED = 'violated',
  UNKNOWN = 'unknown',
}

// Service tier
export enum ServiceTier {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// RPO/RTO definition
export interface RPORTODefinition {
  id: string;
  serviceId: string;
  serviceName: string;
  tier: ServiceTier;
  rpoSeconds: number;
  rtoSeconds: number;
  description: string;
  dependencies: string[];
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

// RPO/RTO measurement
export interface RPORTOMeasurement {
  id: string;
  definitionId: string;
  measuredAt: Date;
  actualRPOSeconds: number;
  actualRTOSeconds?: number;
  rpoStatus: RPORTOStatus;
  rtoStatus?: RPORTOStatus;
  context?: Record<string, unknown>;
}

// RPO/RTO compliance report
export interface RPORTOComplianceReport {
  id: string;
  reportDate: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  overallCompliance: number; // 0-100
  definitions: RPORTODefinition[];
  measurements: RPORTOMeasurement[];
  summary: ComplianceSummary;
  recommendations: Recommendation[];
  generatedBy: string;
}

// Compliance summary
export interface ComplianceSummary {
  totalDefinitions: number;
  compliantDefinitions: number;
  warningDefinitions: number;
  violatedDefinitions: number;
  byTier: Record<ServiceTier, {
    total: number;
    compliant: number;
    complianceRate: number;
  }>;
  averageRPO: number;
  averageRTO: number;
}

// Recommendation
export interface Recommendation {
  id: string;
  definitionId: string;
  type: 'rpo' | 'rto' | 'both';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedRPO?: number;
  suggestedRTO?: number;
  status: 'pending' | 'in_progress' | 'completed';
}

/**
 * Create RPO/RTO definition
 */
export function createRPORTODefinition(
  serviceId: string,
  serviceName: string,
  tier: ServiceTier,
  rpoSeconds: number,
  rtoSeconds: number,
  description: string,
  owner: string,
  dependencies: string[] = []
): RPORTODefinition {
  return {
    id: `rporoto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    serviceId,
    serviceName,
    tier,
    rpoSeconds,
    rtoSeconds,
    description,
    dependencies,
    owner,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Update RPO/RTO definition
 */
export function updateRPORTODefinition(
  definition: RPORTODefinition,
  updates: Partial<Omit<RPORTODefinition, 'id' | 'createdAt'>>
): RPORTODefinition {
  return {
    ...definition,
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * Create RPO/RTO measurement
 */
export function createRPORTOMeasurement(
  definitionId: string,
  actualRPOSeconds: number,
  actualRTOSeconds?: number,
  context?: Record<string, unknown>
): RPORTOMeasurement {
  const definition = getDefinitionById(definitionId);
  
  if (!definition) {
    throw new Error(`Definition ${definitionId} not found`);
  }
  
  const rpoStatus = determineStatus(actualRPOSeconds, definition.rpoSeconds);
  const rtoStatus = actualRTOSeconds !== undefined
    ? determineStatus(actualRTOSeconds, definition.rtoSeconds)
    : undefined;
  
  return {
    id: `measurement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    definitionId,
    measuredAt: new Date(),
    actualRPOSeconds,
    actualRTOSeconds,
    rpoStatus,
    rtoStatus,
    context,
  };
}

/**
 * Determine RPO/RTO status
 */
function determineStatus(actual: number, target: number): RPORTOStatus {
  if (actual <= target) {
    return RPORTOStatus.COMPLIANT;
  }
  
  if (actual <= target * 1.5) {
    return RPORTOStatus.WARNING;
  }
  
  return RPORTOStatus.VIOLATED;
}

/**
 * Get definition by ID (placeholder - would need storage)
 */
function getDefinitionById(_definitionId: string): RPORTODefinition | null {
  // In production, this would query a database
  return null;
}

/**
 * Calculate compliance score
 */
export function calculateComplianceScore(measurements: RPORTOMeasurement[]): number {
  if (measurements.length === 0) return 0;
  
  let totalScore = 0;
  
  for (const measurement of measurements) {
    let score = 0;
    
    if (measurement.rpoStatus === RPORTOStatus.COMPLIANT) {
      score += 50;
    } else if (measurement.rpoStatus === RPORTOStatus.WARNING) {
      score += 25;
    }
    
    if (measurement.rtoStatus === RPORTOStatus.COMPLIANT) {
      score += 50;
    } else if (measurement.rtoStatus === RPORTOStatus.WARNING) {
      score += 25;
    }
    
    totalScore += score;
  }
  
  return totalScore / measurements.length;
}

/**
 * Generate compliance report
 */
export function generateComplianceReport(
  definitions: RPORTODefinition[],
  measurements: RPORTOMeasurement[],
  period: { startDate: Date; endDate: Date },
  generatedBy: string
): RPORTOComplianceReport {
  const summary = generateComplianceSummary(definitions, measurements);
  const overallCompliance = calculateComplianceScore(measurements);
  const recommendations = generateRecommendations(definitions, measurements);
  
  return {
    id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    reportDate: new Date(),
    period,
    overallCompliance,
    definitions,
    measurements,
    summary,
    recommendations,
    generatedBy,
  };
}

/**
 * Generate compliance summary
 */
export function generateComplianceSummary(
  definitions: RPORTODefinition[],
  measurements: RPORTOMeasurement[]
): ComplianceSummary {
  const compliantDefinitions = definitions.filter(d => {
    const latestMeasurement = measurements
      .filter(m => m.definitionId === d.id)
      .sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];
    
    if (!latestMeasurement) return false;
    
    return latestMeasurement.rpoStatus === RPORTOStatus.COMPLIANT &&
           (!latestMeasurement.rtoStatus || latestMeasurement.rtoStatus === RPORTOStatus.COMPLIANT);
  }).length;
  
  const warningDefinitions = definitions.filter(d => {
    const latestMeasurement = measurements
      .filter(m => m.definitionId === d.id)
      .sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];
    
    if (!latestMeasurement) return false;
    
    return latestMeasurement.rpoStatus === RPORTOStatus.WARNING ||
           latestMeasurement.rtoStatus === RPORTOStatus.WARNING;
  }).length;
  
  const violatedDefinitions = definitions.filter(d => {
    const latestMeasurement = measurements
      .filter(m => m.definitionId === d.id)
      .sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];
    
    if (!latestMeasurement) return false;
    
    return latestMeasurement.rpoStatus === RPORTOStatus.VIOLATED ||
           latestMeasurement.rtoStatus === RPORTOStatus.VIOLATED;
  }).length;
  
  const byTier: Record<ServiceTier, {
    total: number;
    compliant: number;
    complianceRate: number;
  }> = {} as any;
  
  for (const tier of [ServiceTier.CRITICAL, ServiceTier.HIGH, ServiceTier.MEDIUM, ServiceTier.LOW]) {
    const tierDefinitions = definitions.filter(d => d.tier === tier);
    const tierCompliant = tierDefinitions.filter(d => {
      const latestMeasurement = measurements
        .filter(m => m.definitionId === d.id)
        .sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];
      
      if (!latestMeasurement) return false;
      
      return latestMeasurement.rpoStatus === RPORTOStatus.COMPLIANT &&
             (!latestMeasurement.rtoStatus || latestMeasurement.rtoStatus === RPORTOStatus.COMPLIANT);
    }).length;
    
    byTier[tier] = {
      total: tierDefinitions.length,
      compliant: tierCompliant,
      complianceRate: tierDefinitions.length > 0 ? (tierCompliant / tierDefinitions.length) * 100 : 0,
    };
  }
  
  const averageRPO = definitions.length > 0
    ? definitions.reduce((sum, d) => sum + d.rpoSeconds, 0) / definitions.length
    : 0;
  
  const averageRTO = definitions.length > 0
    ? definitions.reduce((sum, d) => sum + d.rtoSeconds, 0) / definitions.length
    : 0;
  
  return {
    totalDefinitions: definitions.length,
    compliantDefinitions,
    warningDefinitions,
    violatedDefinitions,
    byTier,
    averageRPO,
    averageRTO,
  };
}

/**
 * Generate recommendations
 */
export function generateRecommendations(
  definitions: RPORTODefinition[],
  measurements: RPORTOMeasurement[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  for (const definition of definitions) {
    const latestMeasurement = measurements
      .filter(m => m.definitionId === definition.id)
      .sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];
    
    if (!latestMeasurement) continue;
    
    if (latestMeasurement.rpoStatus === RPORTOStatus.VIOLATED) {
      recommendations.push({
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        definitionId: definition.id,
        type: 'rpo',
        priority: definition.tier === ServiceTier.CRITICAL ? 'critical' : 'high',
        title: `RPO Violation: ${definition.serviceName}`,
        description: `Actual RPO (${latestMeasurement.actualRPOSeconds}s) exceeds target (${definition.rpoSeconds}s)`,
        suggestedRPO: Math.ceil(latestMeasurement.actualRPOSeconds),
        status: 'pending',
      });
    }
    
    if (latestMeasurement.rtoStatus === RPORTOStatus.VIOLATED) {
      recommendations.push({
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        definitionId: definition.id,
        type: 'rto',
        priority: definition.tier === ServiceTier.CRITICAL ? 'critical' : 'high',
        title: `RTO Violation: ${definition.serviceName}`,
        description: `Actual RTO (${latestMeasurement.actualRTOSeconds}s) exceeds target (${definition.rtoSeconds}s)`,
        suggestedRTO: Math.ceil(latestMeasurement.actualRTOSeconds!),
        status: 'pending',
      });
    }
    
    if (latestMeasurement.rpoStatus === RPORTOStatus.WARNING) {
      recommendations.push({
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        definitionId: definition.id,
        type: 'rpo',
        priority: 'medium',
        title: `RPO Warning: ${definition.serviceName}`,
        description: `RPO approaching limit: ${latestMeasurement.actualRPOSeconds}s (target: ${definition.rpoSeconds}s)`,
        status: 'pending',
      });
    }
  }
  
  return recommendations;
}

/**
 * Get default RPO/RTO definitions
 */
export function getDefaultRPORTODefinitions(): Omit<RPORTODefinition, 'id' | 'createdAt' | 'updatedAt'>[] {
  return [
    {
      serviceId: 'database-primary',
      serviceName: 'Primary Database',
      tier: ServiceTier.CRITICAL,
      rpoSeconds: 300, // 5 minutes
      rtoSeconds: 3600, // 1 hour
      description: 'Primary production database',
      dependencies: ['database-replica', 'cache'],
      owner: 'database-team',
    },
    {
      serviceId: 'cache',
      serviceName: 'Cache Layer',
      tier: ServiceTier.HIGH,
      rpoSeconds: 60, // 1 minute
      rtoSeconds: 300, // 5 minutes
      description: 'Redis cache layer',
      dependencies: [],
      owner: 'platform-team',
    },
    {
      serviceId: 'storage',
      serviceName: 'Object Storage',
      tier: ServiceTier.HIGH,
      rpoSeconds: 900, // 15 minutes
      rtoSeconds: 3600, // 1 hour
      description: 'S3-compatible object storage',
      dependencies: [],
      owner: 'storage-team',
    },
    {
      serviceId: 'api',
      serviceName: 'API Services',
      tier: ServiceTier.CRITICAL,
      rpoSeconds: 60, // 1 minute
      rtoSeconds: 300, // 5 minutes
      description: 'Application API endpoints',
      dependencies: ['database-primary', 'cache'],
      owner: 'backend-team',
    },
    {
      serviceId: 'analytics',
      serviceName: 'Analytics Pipeline',
      tier: ServiceTier.MEDIUM,
      rpoSeconds: 3600, // 1 hour
      rtoSeconds: 86400, // 24 hours
      description: 'Data analytics and reporting',
      dependencies: ['data-warehouse'],
      owner: 'analytics-team',
    },
  ];
}

/**
 * Get service tier label
 */
export function getServiceTierLabel(tier: ServiceTier): string {
  const labels: Record<ServiceTier, string> = {
    [ServiceTier.CRITICAL]: 'Critical',
    [ServiceTier.HIGH]: 'High',
    [ServiceTier.MEDIUM]: 'Medium',
    [ServiceTier.LOW]: 'Low',
  };

  return labels[tier];
}

/**
 * Get RPO/RTO status label
 */
export function getRPORTOStatusLabel(status: RPORTOStatus): string {
  const labels: Record<RPORTOStatus, string> = {
    [RPORTOStatus.COMPLIANT]: 'Compliant',
    [RPORTOStatus.WARNING]: 'Warning',
    [RPORTOStatus.VIOLATED]: 'Violated',
    [RPORTOStatus.UNKNOWN]: 'Unknown',
  };

  return labels[status];
}

/**
 * Format duration in seconds
 */
export function formatDurationSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(0)}s`;
  }
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }
  
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  }
  
  const days = Math.floor(seconds / 86400);
  return `${days}d`;
}

/**
 * Filter definitions by tier
 */
export function filterDefinitionsByTier(
  definitions: RPORTODefinition[],
  tier: ServiceTier
): RPORTODefinition[] {
  return definitions.filter(definition => definition.tier === tier);
}

/**
 * Filter measurements by status
 */
export function filterMeasurementsByStatus(
  measurements: RPORTOMeasurement[],
  status: RPORTOStatus
): RPORTOMeasurement[] {
  return measurements.filter(measurement => measurement.rpoStatus === status);
}

/**
 * Filter measurements by date range
 */
export function filterMeasurementsByDateRange(
  measurements: RPORTOMeasurement[],
  startDate: Date,
  endDate: Date
): RPORTOMeasurement[] {
  return measurements.filter(measurement => {
    const measuredDate = new Date(measurement.measuredAt);
    return measuredDate >= startDate && measuredDate <= endDate;
  });
}

/**
 * Get RPO/RTO trend
 */
export function getRPORTOTrend(
  measurements: RPORTOMeasurement[],
  definitionId: string,
  days: number = 30
): {
  rpoTrend: Array<{ date: Date; actualRPO: number; targetRPO: number }>;
  rtoTrend: Array<{ date: Date; actualRTO: number; targetRTO: number }>;
} {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const definitionMeasurements = measurements
    .filter(m => m.definitionId === definitionId && m.measuredAt >= cutoffDate)
    .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
  
  const rpoTrend = definitionMeasurements.map(m => ({
    date: m.measuredAt,
    actualRPO: m.actualRPOSeconds,
    targetRPO: 0, // Would need definition to get target
  }));
  
  const rtoTrend = definitionMeasurements
    .filter(m => m.actualRTOSeconds !== undefined)
    .map(m => ({
      date: m.measuredAt,
      actualRTO: m.actualRTOSeconds!,
      targetRTO: 0, // Would need definition to get target
    }));
  
  return { rpoTrend, rtoTrend };
}

/**
 * Calculate RPO/RTO compliance percentage
 */
export function calculateCompliancePercentage(
  actual: number,
  target: number
): number {
  if (actual <= target) {
    return 100;
  }
  
  return Math.max(0, (target / actual) * 100);
}

/**
 * Get RPO/RTO statistics
 */
export function getRPORTOStatistics(
  definitions: RPORTODefinition[],
  measurements: RPORTOMeasurement[]
): {
  totalDefinitions: number;
  totalMeasurements: number;
  averageRPO: number;
  averageRTO: number;
  rpoComplianceRate: number;
  rtoComplianceRate: number;
  byTier: Record<ServiceTier, {
    total: number;
    averageRPO: number;
    averageRTO: number;
  }>;
} {
  const totalMeasurements = measurements.length;
  
  const averageRPO = definitions.length > 0
    ? definitions.reduce((sum, d) => sum + d.rpoSeconds, 0) / definitions.length
    : 0;
  
  const averageRTO = definitions.length > 0
    ? definitions.reduce((sum, d) => sum + d.rtoSeconds, 0) / definitions.length
    : 0;
  
  const rpoCompliant = measurements.filter(m => m.rpoStatus === RPORTOStatus.COMPLIANT).length;
  const rtoCompliant = measurements.filter(m => m.rtoStatus === RPORTOStatus.COMPLIANT).length;
  
  const rpoComplianceRate = totalMeasurements > 0 ? (rpoCompliant / totalMeasurements) * 100 : 0;
  const rtoComplianceRate = totalMeasurements > 0 ? (rtoCompliant / totalMeasurements) * 100 : 0;
  
  const byTier: Record<ServiceTier, {
    total: number;
    averageRPO: number;
    averageRTO: number;
  }> = {} as any;
  
  for (const tier of [ServiceTier.CRITICAL, ServiceTier.HIGH, ServiceTier.MEDIUM, ServiceTier.LOW]) {
    const tierDefinitions = definitions.filter(d => d.tier === tier);
    
    if (tierDefinitions.length === 0) {
      byTier[tier] = { total: 0, averageRPO: 0, averageRTO: 0 };
      continue;
    }
    
    byTier[tier] = {
      total: tierDefinitions.length,
      averageRPO: tierDefinitions.reduce((sum, d) => sum + d.rpoSeconds, 0) / tierDefinitions.length,
      averageRTO: tierDefinitions.reduce((sum, d) => sum + d.rtoSeconds, 0) / tierDefinitions.length,
    };
  }
  
  return {
    totalDefinitions: definitions.length,
    totalMeasurements,
    averageRPO,
    averageRTO,
    rpoComplianceRate,
    rtoComplianceRate,
    byTier,
  };
}
