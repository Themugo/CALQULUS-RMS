/**
 * SLA Workflow System
 * 
 * Implements Service Level Agreement workflows with:
 * - SLA definition and tracking
 * - Performance monitoring
 * - Alert triggering
 * - Breach detection
 * - Reporting and analytics
 * - Escalation handling
 */

// SLA status
export enum SLAStatus {
  ACTIVE = 'active',
  AT_RISK = 'at_risk',
  BREACHED = 'breached',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// SLA metric type
export enum SLAMetricType {
  RESPONSE_TIME = 'response_time',
  RESOLUTION_TIME = 'resolution_time',
  UPTIME = 'uptime',
  AVAILABILITY = 'availability',
  FIRST_CONTACT_RESOLUTION = 'first_contact_resolution',
  CUSTOMER_SATISFACTION = 'customer_satisfaction',
}

// SLA definition
export interface SLADefinition {
  id: string;
  name: string;
  description: string;
  serviceType: 'maintenance' | 'support' | 'cleaning' | 'security' | 'general';
  priority: 'low' | 'medium' | 'high' | 'critical';
  metrics: SLAMetric[];
  workingHours: {
    start: string; // HH:MM
    end: string; // HH:MM
    days: number[]; // 0-6 (Sunday-Saturday)
  };
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
}

// SLA metric
export interface SLAMetric {
  type: SLAMetricType;
  targetValue: number; // in hours, percentage, etc.
  unit: string;
  warningThreshold: number; // percentage of target
  criticalThreshold: number; // percentage of target
}

// SLA instance
export interface SLAInstance {
  id: string;
  definitionId: string;
  entityId: string; // maintenance request ID, ticket ID, etc.
  entityType: 'maintenance_request' | 'support_ticket' | 'service_request';
  status: SLAStatus;
  startTime: Date;
  endTime?: Date;
  targetEndTime: Date;
  metrics: Record<SLAMetricType, {
    target: number;
    current: number;
    unit: string;
    status: 'on_track' | 'warning' | 'critical' | 'breached';
  }>;
  breachReason?: string;
  createdAt: Date;
}

// SLA breach
export interface SLABreach {
  id: string;
  instanceId: string;
  metricType: SLAMetricType;
  breachedAt: Date;
  severity: 'warning' | 'critical';
  impact: string;
  rootCause?: string;
  resolvedAt?: Date;
  resolutionAction?: string;
}

// SLA alert
export interface SLAAlert {
  id: string;
  instanceId: string;
  alertType: 'warning' | 'breach' | 'recovery';
  metricType: SLAMetricType;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

// SLA performance report
export interface SLAPerformanceReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  definitionId: string;
  totalInstances: number;
  metSLA: number;
  breachedSLA: number;
  complianceRate: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  byMetric: Record<SLAMetricType, {
    target: number;
    average: number;
    met: number;
    breached: number;
  }>;
}

/**
 * Create SLA definition
 */
export function createSLADefinition(
  name: string,
  description: string,
  serviceType: 'maintenance' | 'support' | 'cleaning' | 'security' | 'general',
  priority: 'low' | 'medium' | 'high' | 'critical',
  metrics: SLAMetric[],
  workingHours: {
    start: string;
    end: string;
    days: number[];
  },
  timezone: string,
  createdBy: string
): SLADefinition {
  return {
    id: `sla_def_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    serviceType,
    priority,
    metrics,
    workingHours,
    timezone,
    isActive: true,
    createdAt: new Date(),
    createdBy,
  };
}

/**
 * Create SLA instance
 */
export function createSLAInstance(
  definitionId: string,
  entityId: string,
  entityType: 'maintenance_request' | 'support_ticket' | 'service_request',
  startTime: Date,
  targetEndTime: Date,
  metrics: SLAMetric[]
): SLAInstance {
  const metricRecords: Record<SLAMetricType, {
    target: number;
    current: number;
    unit: string;
    status: 'on_track' | 'warning' | 'critical' | 'breached';
  }> = {} as any;
  
  for (const metric of metrics) {
    metricRecords[metric.type] = {
      target: metric.targetValue,
      current: 0,
      unit: metric.unit,
      status: 'on_track',
    };
  }
  
  return {
    id: `sla_inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    definitionId,
    entityId,
    entityType,
    status: SLAStatus.ACTIVE,
    startTime,
    targetEndTime,
    metrics: metricRecords,
    createdAt: new Date(),
  };
}

/**
 * Calculate business hours duration
 */
export function calculateBusinessHoursDuration(
  startTime: Date,
  endTime: Date,
  workingHours: { start: string; end: string; days: number[] },
  timezone: string
): number {
  const [startHour, startMinute] = workingHours.start.split(':').map(Number);
  const [endHour, endMinute] = workingHours.end.split(':').map(Number);
  
  const current = new Date(startTime);
  let totalMinutes = 0;
  
  while (current < endTime) {
    const day = current.getDay();
    
    if (workingHours.days.includes(day)) {
      const dayStart = new Date(current);
      dayStart.setHours(startHour, startMinute, 0, 0);
      
      const dayEnd = new Date(current);
      dayEnd.setHours(endHour, endMinute, 0, 0);
      
      const dayMinutes = Math.min(
        Math.max(0, Math.min(endTime.getTime(), dayEnd.getTime()) - Math.max(startTime.getTime(), dayStart.getTime())),
        (endHour - startHour) * 60 * 60 * 1000
      );
      
      totalMinutes += dayMinutes / (60 * 1000);
    }
    
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }
  
  return totalMinutes / 60; // Return in hours
}

/**
 * Update SLA metric
 */
export function updateSLAMetric(
  instance: SLAInstance,
  metricType: SLAMetricType,
  currentValue: number,
  definition: SLADefinition
): SLAInstance {
  const metric = definition.metrics.find(m => m.type === metricType);
  
  if (!metric) {
    return instance;
  }
  
  const metricRecord = instance.metrics[metricType];
  metricRecord.current = currentValue;
  
  // Calculate status
  const percentage = (currentValue / metric.targetValue) * 100;
  
  if (percentage >= 100) {
    metricRecord.status = 'breached';
  } else if (percentage >= metric.criticalThreshold) {
    metricRecord.status = 'critical';
  } else if (percentage >= metric.warningThreshold) {
    metricRecord.status = 'warning';
  } else {
    metricRecord.status = 'on_track';
  }
  
  // Update overall SLA status
  const hasBreached = Object.values(instance.metrics).some(m => m.status === 'breached');
  const hasCritical = Object.values(instance.metrics).some(m => m.status === 'critical');
  
  if (hasBreached) {
    instance.status = SLAStatus.BREACHED;
  } else if (hasCritical) {
    instance.status = SLAStatus.AT_RISK;
  }
  
  return instance;
}

/**
 * Check SLA breach
 */
export function checkSLABreach(instance: SLAInstance): SLABreach | null {
  const breachedMetrics = Object.entries(instance.metrics)
    .filter(([_, metric]) => metric.status === 'breached');
  
  if (breachedMetrics.length === 0) {
    return null;
  }
  
  const [metricType, metric] = breachedMetrics[0];
  
  return {
    id: `sla_breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    instanceId: instance.id,
    metricType: metricType as SLAMetricType,
    breachedAt: new Date(),
    severity: metric.status === 'breached' ? 'critical' : 'warning',
    impact: `${metricType} exceeded target of ${metric.target} ${metric.unit}`,
  };
}

/**
 * Create SLA alert
 */
export function createSLAAlert(
  instanceId: string,
  metricType: SLAMetricType,
  alertType: 'warning' | 'breach' | 'recovery',
  message: string,
  severity: 'low' | 'medium' | 'high' | 'critical'
): SLAAlert {
  return {
    id: `sla_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    instanceId,
    alertType,
    metricType,
    message,
    severity,
    triggeredAt: new Date(),
  };
}

/**
 * Acknowledge SLA alert
 */
export function acknowledgeSLAAlert(
  alert: SLAAlert,
  acknowledgedBy: string
): SLAAlert {
  return {
    ...alert,
    acknowledgedAt: new Date(),
    acknowledgedBy,
  };
}

/**
 * Complete SLA instance
 */
export function completeSLAInstance(instance: SLAInstance): SLAInstance {
  return {
    ...instance,
    status: SLAStatus.COMPLETED,
    endTime: new Date(),
  };
}

/**
 * Cancel SLA instance
 */
export function cancelSLAInstance(instance: SLAInstance, reason: string): SLAInstance {
  return {
    ...instance,
    status: SLAStatus.CANCELLED,
    breachReason: reason,
  };
}

/**
 * Calculate SLA compliance rate
 */
export function calculateSLAComplianceRate(instances: SLAInstance[]): number {
  if (instances.length === 0) return 0;
  
  const completed = instances.filter(i => i.status === SLAStatus.COMPLETED).length;
  const breached = instances.filter(i => i.status === SLAStatus.BREACHED).length;
  
  const totalCompleted = completed + breached;
  
  if (totalCompleted === 0) return 0;
  
  return (completed / totalCompleted) * 100;
}

/**
 * Generate SLA performance report
 */
export function generateSLAPerformanceReport(
  definitionId: string,
  instances: SLAInstance[],
  startDate: Date,
  endDate: Date
): SLAPerformanceReport {
  const periodInstances = instances.filter(i => {
    const instanceDate = new Date(i.createdAt);
    return instanceDate >= startDate && instanceDate <= endDate;
  });
  
  const completed = periodInstances.filter(i => i.status === SLAStatus.COMPLETED);
  const breached = periodInstances.filter(i => i.status === SLAStatus.BREACHED);
  
  const complianceRate = calculateSLAComplianceRate(periodInstances);
  
  // Calculate average response time
  const responseTimes = completed
    .filter(i => i.metrics[SLAMetricType.RESPONSE_TIME])
    .map(i => i.metrics[SLAMetricType.RESPONSE_TIME].current);
  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
    : 0;
  
  // Calculate average resolution time
  const resolutionTimes = completed
    .filter(i => i.metrics[SLAMetricType.RESOLUTION_TIME])
    .map(i => i.metrics[SLAMetricType.RESOLUTION_TIME].current);
  const averageResolutionTime = resolutionTimes.length > 0
    ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
    : 0;
  
  // Calculate by metric
  const byMetric: Record<SLAMetricType, {
    target: number;
    average: number;
    met: number;
    breached: number;
  }> = {} as any;
  
  const metricTypes: SLAMetricType[] = [
    SLAMetricType.RESPONSE_TIME,
    SLAMetricType.RESOLUTION_TIME,
    SLAMetricType.UPTIME,
    SLAMetricType.AVAILABILITY,
    SLAMetricType.FIRST_CONTACT_RESOLUTION,
    SLAMetricType.CUSTOMER_SATISFACTION,
  ];
  
  for (const metricType of metricTypes) {
    const metricData = completed
      .filter(i => i.metrics[metricType])
      .map(i => i.metrics[metricType]);
    
    if (metricData.length === 0) {
      byMetric[metricType] = {
        target: 0,
        average: 0,
        met: 0,
        breached: 0,
      };
      continue;
    }
    
    const target = metricData[0].target;
    const average = metricData.reduce((sum, m) => sum + m.current, 0) / metricData.length;
    const met = metricData.filter(m => m.status === 'on_track').length;
    const breachedCount = metricData.filter(m => m.status === 'breached').length;
    
    byMetric[metricType] = {
      target,
      average,
      met,
      breached: breachedCount,
    };
  }
  
  return {
    period: {
      startDate,
      endDate,
    },
    definitionId,
    totalInstances: periodInstances.length,
    metSLA: completed.length,
    breachedSLA: breached.length,
    complianceRate,
    averageResponseTime,
    averageResolutionTime,
    byMetric,
  };
}

/**
 * Get SLA status label
 */
export function getSLAStatusLabel(status: SLAStatus): string {
  const labels: Record<SLAStatus, string> = {
    [SLAStatus.ACTIVE]: 'Active',
    [SLAStatus.AT_RISK]: 'At Risk',
    [SLAStatus.BREACHED]: 'Breached',
    [SLAStatus.COMPLETED]: 'Completed',
    [SLAStatus.CANCELLED]: 'Cancelled',
  };

  return labels[status];
}

/**
 * Get SLA metric type label
 */
export function getSLAMetricTypeLabel(type: SLAMetricType): string {
  const labels: Record<SLAMetricType, string> = {
    [SLAMetricType.RESPONSE_TIME]: 'Response Time',
    [SLAMetricType.RESOLUTION_TIME]: 'Resolution Time',
    [SLAMetricType.UPTIME]: 'Uptime',
    [SLAMetricType.AVAILABILITY]: 'Availability',
    [SLAMetricType.FIRST_CONTACT_RESOLUTION]: 'First Contact Resolution',
    [SLAMetricType.CUSTOMER_SATISFACTION]: 'Customer Satisfaction',
  };

  return labels[type];
}

/**
 * Filter SLA instances by status
 */
export function filterSLAInstancesByStatus(
  instances: SLAInstance[],
  status: SLAStatus
): SLAInstance[] {
  return instances.filter(instance => instance.status === status);
}

/**
 * Filter SLA instances by date range
 */
export function filterSLAInstancesByDateRange(
  instances: SLAInstance[],
  startDate: Date,
  endDate: Date
): SLAInstance[] {
  return instances.filter(instance => {
    const instanceDate = new Date(instance.createdAt);
    return instanceDate >= startDate && instanceDate <= endDate;
  });
}

/**
 * Get SLA breach statistics
 */
export function getSLABreachStatistics(breaches: SLABreach[]): {
  totalBreaches: number;
  bySeverity: Record<'warning' | 'critical', number>;
  byMetricType: Record<SLAMetricType, number>;
  resolved: number;
  unresolved: number;
  averageResolutionTime: number;
} {
  const stats = {
    totalBreaches: breaches.length,
    bySeverity: {
      warning: 0,
      critical: 0,
    },
    byMetricType: {
      [SLAMetricType.RESPONSE_TIME]: 0,
      [SLAMetricType.RESOLUTION_TIME]: 0,
      [SLAMetricType.UPTIME]: 0,
      [SLAMetricType.AVAILABILITY]: 0,
      [SLAMetricType.FIRST_CONTACT_RESOLUTION]: 0,
      [SLAMetricType.CUSTOMER_SATISFACTION]: 0,
    },
    resolved: 0,
    unresolved: 0,
    averageResolutionTime: 0,
  };
  
  for (const breach of breaches) {
    stats.bySeverity[breach.severity]++;
    stats.byMetricType[breach.metricType]++;
    
    if (breach.resolvedAt) {
      stats.resolved++;
    } else {
      stats.unresolved++;
    }
  }
  
  // Calculate average resolution time
  const resolvedBreaches = breaches.filter(b => b.resolvedAt);
  if (resolvedBreaches.length > 0) {
    const resolutionTimes = resolvedBreaches.map(b => {
      if (!b.resolvedAt) return 0;
      return (b.resolvedAt.getTime() - b.breachedAt.getTime()) / (1000 * 60 * 60); // hours
    });
    stats.averageResolutionTime = resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length;
  }
  
  return stats;
}

/**
 * Get default SLA definitions
 */
export function getDefaultSLADefinitions(): Omit<SLADefinition, 'id' | 'createdAt' | 'createdBy'>[] {
  return [
    {
      name: 'Emergency Maintenance SLA',
      description: 'SLA for emergency maintenance requests',
      serviceType: 'maintenance',
      priority: 'critical',
      metrics: [
        {
          type: SLAMetricType.RESPONSE_TIME,
          targetValue: 1, // 1 hour
          unit: 'hours',
          warningThreshold: 80,
          criticalThreshold: 95,
        },
        {
          type: SLAMetricType.RESOLUTION_TIME,
          targetValue: 4, // 4 hours
          unit: 'hours',
          warningThreshold: 80,
          criticalThreshold: 95,
        },
      ],
      workingHours: {
        start: '00:00',
        end: '23:59',
        days: [0, 1, 2, 3, 4, 5, 6],
      },
      timezone: 'Africa/Nairobi',
      isActive: true,
    },
    {
      name: 'Standard Maintenance SLA',
      description: 'SLA for standard maintenance requests',
      serviceType: 'maintenance',
      priority: 'medium',
      metrics: [
        {
          type: SLAMetricType.RESPONSE_TIME,
          targetValue: 4, // 4 hours
          unit: 'hours',
          warningThreshold: 80,
          criticalThreshold: 95,
        },
        {
          type: SLAMetricType.RESOLUTION_TIME,
          targetValue: 24, // 24 hours
          unit: 'hours',
          warningThreshold: 80,
          criticalThreshold: 95,
        },
      ],
      workingHours: {
        start: '08:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5],
      },
      timezone: 'Africa/Nairobi',
      isActive: true,
    },
  ];
}
