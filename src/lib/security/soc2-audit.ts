/**
 * SOC2-Style Audit Readiness System
 * 
 * Implements SOC2 compliance tracking with:
 * - Control framework management
 * - Evidence collection
 * - Audit trail logging
 * - Compliance monitoring
 * - Risk assessment
 * - Report generation
 */

// SOC2 trust service criteria
export enum SOCCriteria {
  SECURITY = 'security',
  AVAILABILITY = 'availability',
  PROCESSING_INTEGRITY = 'processing_integrity',
  CONFIDENTIALITY = 'confidentialiality',
  PRIVACY = 'privacy',
}

// Control status
export enum ControlStatus {
  IMPLEMENTED = 'implemented',
  PARTIALLY_IMPLEMENTED = 'partially_implemented',
  NOT_IMPLEMENTED = 'not_implemented',
  DOCUMENTED = 'documented',
  TESTED = 'tested',
  EFFECTIVE = 'effective',
  INEFFECTIVE = 'ineffective',
}

// Risk level
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Control
export interface Control {
  id: string;
  code: string;
  title: string;
  description: string;
  criteria: SOCCriteria[];
  status: ControlStatus;
  owner: string;
  implementationDate?: Date;
  lastTestedAt?: Date;
  lastTestResult?: 'pass' | 'fail' | 'inconclusive';
  evidence: Evidence[];
  risks: Risk[];
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
}

// Evidence
export interface Evidence {
  id: string;
  controlId: string;
  type: 'document' | 'screenshot' | 'log' | 'configuration' | 'test_result' | 'interview';
  title: string;
  description: string;
  filePath?: string;
  collectedAt: Date;
  collectedBy: string;
  isValid: boolean;
  expiresAt?: Date;
}

// Risk
export interface Risk {
  id: string;
  controlId: string;
  title: string;
  description: string;
  level: RiskLevel;
  likelihood: 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost_certain';
  impact: 'negligible' | 'minor' | 'moderate' | 'major' | 'catastrophic';
  mitigationPlan?: string;
  mitigatedAt?: Date;
  status: 'open' | 'mitigated' | 'accepted' | 'transferred';
}

// Audit log
export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Compliance report
export interface ComplianceReport {
  id: string;
  reportDate: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  criteria: SOCCriteria[];
  overallScore: number; // 0-100
  controls: Control[];
  summary: ComplianceSummary;
  recommendations: Recommendation[];
  generatedBy: string;
}

// Compliance summary
export interface ComplianceSummary {
  totalControls: number;
  implementedControls: number;
  effectiveControls: number;
  testedControls: number;
  byCriteria: Record<SOCCriteria, {
    total: number;
    effective: number;
    score: number;
  }>;
  openRisks: number;
  mitigatedRisks: number;
}

// Recommendation
export interface Recommendation {
  id: string;
  controlId: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo?: string;
}

/**
 * Create control
 */
export function createControl(
  code: string,
  title: string,
  description: string,
  criteria: SOCCriteria[],
  owner: string,
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' = 'quarterly'
): Control {
  return {
    id: `control_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    code,
    title,
    description,
    criteria,
    status: ControlStatus.NOT_IMPLEMENTED,
    owner,
    frequency,
    evidence: [],
    risks: [],
  };
}

/**
 * Update control status
 */
export function updateControlStatus(
  control: Control,
  status: ControlStatus
): Control {
  return {
    ...control,
    status,
    implementationDate: status === ControlStatus.IMPLEMENTED ? new Date() : control.implementationDate,
  };
}

/**
 * Add evidence to control
 */
export function addEvidence(
  control: Control,
  evidence: Omit<Evidence, 'id' | 'collectedAt'>
): Control {
  const newEvidence: Evidence = {
    ...evidence,
    id: `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    collectedAt: new Date(),
  };
  
  return {
    ...control,
    evidence: [...control.evidence, newEvidence],
  };
}

/**
 * Add risk to control
 */
export function addRisk(
  control: Control,
  risk: Omit<Risk, 'id' | 'status'>
): Control {
  const newRisk: Risk = {
    ...risk,
    id: `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'open',
  };
  
  return {
    ...control,
    risks: [...control.risks, newRisk],
  };
}

/**
 * Mitigate risk
 */
export function mitigateRisk(
  risk: Risk,
  mitigationPlan: string
): Risk {
  return {
    ...risk,
    status: 'mitigated',
    mitigationPlan,
    mitigatedAt: new Date(),
  };
}

/**
 * Create audit log
 */
export function createAuditLog(
  userId: string,
  action: string,
  resource: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): AuditLog {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    userId,
    action,
    resource,
    details,
    ipAddress,
    userAgent,
  };
}

/**
 * Calculate control effectiveness
 */
export function calculateControlEffectiveness(control: Control): number {
  let score = 0;
  
  // Status score
  const statusScores: Record<ControlStatus, number> = {
    [ControlStatus.IMPLEMENTED]: 60,
    [ControlStatus.DOCUMENTED]: 70,
    [ControlStatus.TESTED]: 80,
    [ControlStatus.EFFECTIVE]: 100,
    [ControlStatus.INEFFECTIVE]: 0,
    [ControlStatus.PARTIALLY_IMPLEMENTED]: 30,
    [ControlStatus.NOT_IMPLEMENTED]: 0,
  };
  
  score += statusScores[control.status] || 0;
  
  // Evidence score
  const evidenceScore = Math.min(20, control.evidence.length * 5);
  score += evidenceScore;
  
  // Risk penalty
  const openRisks = control.risks.filter(r => r.status === 'open').length;
  const riskPenalty = openRisks * 10;
  score -= riskPenalty;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate compliance score
 */
export function calculateComplianceScore(controls: Control[]): number {
  if (controls.length === 0) return 0;
  
  const totalScore = controls.reduce((sum, control) => sum + calculateControlEffectiveness(control), 0);
  return totalScore / controls.length;
}

/**
 * Generate compliance report
 */
export function generateComplianceReport(
  controls: Control[],
  criteria: SOCCriteria[],
  period: { startDate: Date; endDate: Date },
  generatedBy: string
): ComplianceReport {
  const overallScore = calculateComplianceScore(controls);
  const summary = generateComplianceSummary(controls, criteria);
  const recommendations = generateRecommendations(controls);
  
  return {
    id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    reportDate: new Date(),
    period,
    criteria,
    overallScore,
    controls,
    summary,
    recommendations,
    generatedBy,
  };
}

/**
 * Generate compliance summary
 */
export function generateComplianceSummary(
  controls: Control[],
  criteria: SOCCriteria[]
): ComplianceSummary {
  const byCriteria: Record<SOCCriteria, {
    total: number;
    effective: number;
    score: number;
  }> = {} as any;
  
  for (const criterion of criteria) {
    byCriteria[criterion] = {
      total: 0,
      effective: 0,
      score: 0,
    };
  }
  
  let effectiveControls = 0;
  let testedControls = 0;
  let openRisks = 0;
  let mitigatedRisks = 0;
  
  for (const control of controls) {
    for (const criterion of control.criteria) {
      if (byCriteria[criterion]) {
        byCriteria[criterion].total++;
        if (control.status === ControlStatus.EFFECTIVE) {
          byCriteria[criterion].effective++;
        }
      }
    }
    
    if (control.status === ControlStatus.EFFECTIVE) {
      effectiveControls++;
    }
    
    if (control.status === ControlStatus.TESTED || control.status === ControlStatus.EFFECTIVE) {
      testedControls++;
    }
    
    openRisks += control.risks.filter(r => r.status === 'open').length;
    mitigatedRisks += control.risks.filter(r => r.status === 'mitigated').length;
  }
  
  // Calculate scores per criterion
  for (const criterion of criteria) {
    const criterionData = byCriteria[criterion];
    criterionData.score = criterionData.total > 0
      ? (criterionData.effective / criterionData.total) * 100
      : 0;
  }
  
  return {
    totalControls: controls.length,
    implementedControls: controls.filter(c => c.status === ControlStatus.IMPLEMENTED).length,
    effectiveControls,
    testedControls,
    byCriteria,
    openRisks,
    mitigatedRisks,
  };
}

/**
 * Generate recommendations
 */
export function generateRecommendations(controls: Control[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  for (const control of controls) {
    const effectiveness = calculateControlEffectiveness(control);
    
    if (effectiveness < 50) {
      recommendations.push({
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        controlId: control.id,
        priority: 'critical',
        title: `Improve control: ${control.title}`,
        description: `Control effectiveness is ${effectiveness.toFixed(0)}%. Implement missing controls and add evidence.`,
        status: 'pending',
      });
    }
    
    if (control.evidence.length === 0) {
      recommendations.push({
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        controlId: control.id,
        priority: 'high',
        title: `Add evidence for control: ${control.title}`,
        description: 'No evidence has been collected for this control. Add documentation, test results, or other evidence.',
        status: 'pending',
      });
    }
    
    const openCriticalRisks = control.risks.filter(r => r.status === 'open' && r.level === RiskLevel.CRITICAL);
    if (openCriticalRisks.length > 0) {
      recommendations.push({
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        controlId: control.id,
        priority: 'critical',
        title: `Mitigate critical risks for control: ${control.title}`,
        description: `${openCriticalRisks.length} critical risks are open. Create and execute mitigation plans.`,
        status: 'pending',
      });
    }
  }
  
  return recommendations;
}

/**
 * Get default SOC2 controls
 */
export function getDefaultSOC2Controls(): Omit<Control, 'id'>[] {
  return [
    {
      code: 'CC1.1',
      title: 'Access Control Policy',
      description: 'The entity implements logical and physical access controls to manage access to systems and data.',
      criteria: [SOCCriteria.SECURITY],
      status: ControlStatus.NOT_IMPLEMENTED,
      owner: 'security-team',
      frequency: 'quarterly',
      evidence: [],
      risks: [],
    },
    {
      code: 'CC2.1',
      title: 'Asset Inventory',
      description: 'The entity maintains an inventory of assets and identifies their owners.',
      criteria: [SOCCriteria.SECURITY],
      status: ControlStatus.NOT_IMPLEMENTED,
      owner: 'it-operations',
      frequency: 'quarterly',
      evidence: [],
      risks: [],
    },
    {
      code: 'CC3.1',
      title: 'Change Management',
      description: 'The entity implements change management processes to track and authorize changes.',
      criteria: [SOCCriteria.SECURITY, SOCCriteria.AVAILABILITY],
      status: ControlStatus.NOT_IMPLEMENTED,
      owner: 'devops',
      frequency: 'continuous',
      evidence: [],
      risks: [],
    },
    {
      code: 'CC4.1',
      title: 'Incident Response',
      description: 'The entity has incident response procedures to detect, respond to, and recover from incidents.',
      criteria: [SOCCriteria.SECURITY, SOCCriteria.AVAILABILITY],
      status: ControlStatus.NOT_IMPLEMENTED,
      owner: 'security-team',
      frequency: 'continuous',
      evidence: [],
      risks: [],
    },
    {
      code: 'CC5.1',
      title: 'Data Encryption',
      description: 'The entity encrypts data at rest and in transit to protect confidentiality.',
      criteria: [SOCCriteria.SECURITY, SOCCriteria.CONFIDENTIALITY],
      status: ControlStatus.NOT_IMPLEMENTED,
      owner: 'security-team',
      frequency: 'quarterly',
      evidence: [],
      risks: [],
    },
    {
      code: 'CC6.1',
      title: 'Monitoring and Logging',
      description: 'The entity monitors systems and logs security events for detection and investigation.',
      criteria: [SOCCriteria.SECURITY, SOCCriteria.AVAILABILITY],
      status: ControlStatus.NOT_IMPLEMENTED,
      owner: 'security-team',
      frequency: 'continuous',
      evidence: [],
      risks: [],
    },
    {
      code: 'CC7.1',
      title: 'Business Continuity',
      description: 'The entity has business continuity plans to ensure availability during disruptions.',
      criteria: [SOCCriteria.AVAILABILITY],
      status: ControlStatus.NOT_IMPLEMENTED,
      owner: 'operations',
      frequency: 'annually',
      evidence: [],
      risks: [],
    },
  ];
}

/**
 * Get SOC2 criteria label
 */
export function getSOCCriteriaLabel(criteria: SOCCriteria): string {
  const labels: Record<SOCCriteria, string> = {
    [SOCCriteria.SECURITY]: 'Security',
    [SOCCriteria.AVAILABILITY]: 'Availability',
    [SOCCriteria.PROCESSING_INTEGRITY]: 'Processing Integrity',
    [SOCCriteria.CONFIDENTIALITY]: 'Confidentiality',
    [SOCCriteria.PRIVACY]: 'Privacy',
  };

  return labels[criteria];
}

/**
 * Get control status label
 */
export function getControlStatusLabel(status: ControlStatus): string {
  const labels: Record<ControlStatus, string> = {
    [ControlStatus.IMPLEMENTED]: 'Implemented',
    [ControlStatus.PARTIALLY_IMPLEMENTED]: 'Partially Implemented',
    [ControlStatus.NOT_IMPLEMENTED]: 'Not Implemented',
    [ControlStatus.DOCUMENTED]: 'Documented',
    [ControlStatus.TESTED]: 'Tested',
    [ControlStatus.EFFECTIVE]: 'Effective',
    [ControlStatus.INEFFECTIVE]: 'Ineffective',
  };

  return labels[status];
}

/**
 * Get risk level label
 */
export function getRiskLevelLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    [RiskLevel.LOW]: 'Low',
    [RiskLevel.MEDIUM]: 'Medium',
    [RiskLevel.HIGH]: 'High',
    [RiskLevel.CRITICAL]: 'Critical',
  };

  return labels[level];
}

/**
 * Filter controls by criteria
 */
export function filterControlsByCriteria(controls: Control[], criteria: SOCCriteria): Control[] {
  return controls.filter(control => control.criteria.includes(criteria));
}

/**
 * Filter controls by status
 */
export function filterControlsByStatus(controls: Control[], status: ControlStatus): Control[] {
  return controls.filter(control => control.status === status);
}

/**
 * Get audit logs by user
 */
export function getAuditLogsByUser(logs: AuditLog[], userId: string): AuditLog[] {
  return logs.filter(log => log.userId === userId);
}

/**
 * Get audit logs by date range
 */
export function getAuditLogsByDateRange(
  logs: AuditLog[],
  startDate: Date,
  endDate: Date
): AuditLog[] {
  return logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= startDate && logDate <= endDate;
  });
}

/**
 * Get audit statistics
 */
export function getAuditStatistics(logs: AuditLog[]): {
  totalLogs: number;
  uniqueUsers: number;
  topActions: Array<{ action: string; count: number }>;
  logsByHour: Record<number, number>;
} {
  const uniqueUsers = new Set(logs.map(log => log.userId)).size;
  
  const actionCounts = new Map<string, number>();
  for (const log of logs) {
    actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
  }
  
  const topActions = Array.from(actionCounts.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  const logsByHour: Record<number, number> = {};
  for (const log of logs) {
    const hour = new Date(log.timestamp).getHours();
    logsByHour[hour] = (logsByHour[hour] || 0) + 1;
  }
  
  return {
    totalLogs: logs.length,
    uniqueUsers,
    topActions,
    logsByHour,
  };
}
