/**
 * SOC2 Compliance Framework
 * 
 * Implements SOC2 Type II compliance controls and documentation:
 * - Security controls (access management, encryption, monitoring)
 * - Availability controls (uptime, disaster recovery, backup)
 * - Processing integrity controls (data validation, change management)
 * - Confidentiality controls (data classification, access restrictions)
 * - Privacy controls (data handling, consent management, rights)
 * - Control evidence collection and reporting
 * - Audit trail and logging
 */

export interface SOC2Control {
  id: string;
  category: SOC2Category;
  title: string;
  description: string;
  implementation: string;
  evidence: ControlEvidence[];
  status: 'implemented' | 'partially_implemented' | 'not_implemented';
  lastReviewed: Date;
  nextReview: Date;
  owner: string;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
}

export type SOC2Category = 'security' | 'availability' | 'processing_integrity' | 'confidentiality' | 'privacy';

export interface ControlEvidence {
  id: string;
  type: 'screenshot' | 'log' | 'document' | 'configuration' | 'test_result';
  description: string;
  location: string;
  collectedAt: Date;
  collectedBy: string;
  verified: boolean;
}

export interface SOC2Policy {
  id: string;
  name: string;
  type: 'security' | 'access' | 'data' | 'incident' | 'change' | 'backup' | 'privacy';
  version: string;
  effectiveDate: Date;
  lastReviewed: Date;
  nextReview: Date;
  owner: string;
  approvedBy: string;
  content: string;
  relatedControls: string[];
}

export interface SOC2AuditTrail {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  outcome: 'success' | 'failure';
}

export interface SOC2Incident {
  id: string;
  type: 'security' | 'availability' | 'data_breach' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  discoveredAt: Date;
  reportedAt: Date;
  resolvedAt?: Date;
  rootCause: string;
  impact: string;
  remediation: string;
  prevention: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assignedTo: string;
  evidence: string[];
}

export class SOC2Compliance {
  private controls: Map<string, SOC2Control>;
  private policies: Map<string, SOC2Policy>;
  private auditTrail: SOC2AuditTrail[];
  private incidents: SOC2Incident[];

  constructor() {
    this.controls = new Map();
    this.policies = new Map();
    this.auditTrail = [];
    this.incidents = [];
    this.initializeDefaultControls();
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default SOC2 controls
   */
  private initializeDefaultControls(): void {
    const defaultControls: Omit<SOC2Control, 'id' | 'evidence' | 'lastReviewed' | 'nextReview'>[] = [
      // Security Controls
      {
        category: 'security',
        title: 'Access Control Policy',
        description: 'Implement least privilege access controls with role-based permissions',
        implementation: 'Role-based access control (RBAC) implemented with can() permission checks',
        status: 'implemented',
        owner: 'Security Team',
        frequency: 'continuous'
      },
      {
        category: 'security',
        title: 'Multi-Factor Authentication',
        description: 'Require MFA for all administrative and privileged access',
        implementation: 'MFA enforced for all admin accounts via Supabase Auth',
        status: 'implemented',
        owner: 'Security Team',
        frequency: 'continuous'
      },
      {
        category: 'security',
        title: 'Encryption at Rest',
        description: 'Encrypt all sensitive data at rest using industry-standard encryption',
        implementation: 'AES-256 encryption for all data at rest via Supabase',
        status: 'implemented',
        owner: 'Security Team',
        frequency: 'continuous'
      },
      {
        category: 'security',
        title: 'Encryption in Transit',
        description: 'Encrypt all data in transit using TLS 1.2+',
        implementation: 'TLS 1.3 enforced for all HTTPS connections',
        status: 'implemented',
        owner: 'Security Team',
        frequency: 'continuous'
      },
      {
        category: 'security',
        title: 'Security Monitoring',
        description: 'Continuous security monitoring and alerting',
        implementation: 'Real-time monitoring via Supabase and Vercel',
        status: 'implemented',
        owner: 'Security Team',
        frequency: 'continuous'
      },
      {
        category: 'security',
        title: 'Vulnerability Management',
        description: 'Regular vulnerability scanning and patch management',
        implementation: 'Automated dependency scanning with npm audit',
        status: 'implemented',
        owner: 'Security Team',
        frequency: 'weekly'
      },
      {
        category: 'security',
        title: 'Penetration Testing',
        description: 'Regular penetration testing by third-party assessors',
        implementation: 'Annual penetration testing with quarterly reviews',
        status: 'partially_implemented',
        owner: 'Security Team',
        frequency: 'quarterly'
      },

      // Availability Controls
      {
        category: 'availability',
        title: 'Uptime Monitoring',
        description: 'Continuous uptime monitoring with SLA tracking',
        implementation: 'Uptime monitoring via Vercel and external services',
        status: 'implemented',
        owner: 'Operations Team',
        frequency: 'continuous'
      },
      {
        category: 'availability',
        title: 'Disaster Recovery Plan',
        description: 'Documented and tested disaster recovery procedures',
        implementation: 'DR plan with automated backup and recovery',
        status: 'implemented',
        owner: 'Operations Team',
        frequency: 'quarterly'
      },
      {
        category: 'availability',
        title: 'Backup and Recovery',
        description: 'Regular automated backups with tested recovery procedures',
        implementation: 'Daily automated backups with point-in-time recovery',
        status: 'implemented',
        owner: 'Operations Team',
        frequency: 'daily'
      },
      {
        category: 'availability',
        title: 'High Availability Architecture',
        description: 'Redundant infrastructure for high availability',
        implementation: 'Multi-region deployment with automatic failover',
        status: 'implemented',
        owner: 'Operations Team',
        frequency: 'continuous'
      },

      // Processing Integrity Controls
      {
        category: 'processing_integrity',
        title: 'Data Validation',
        description: 'Input validation and data integrity checks',
        implementation: 'TypeScript validation with Zod schemas',
        status: 'implemented',
        owner: 'Engineering Team',
        frequency: 'continuous'
      },
      {
        category: 'processing_integrity',
        title: 'Change Management',
        description: 'Formal change management process for all system changes',
        implementation: 'Git-based workflow with code review and staging',
        status: 'implemented',
        owner: 'Engineering Team',
        frequency: 'continuous'
      },
      {
        category: 'processing_integrity',
        title: 'Error Handling',
        description: 'Comprehensive error handling and logging',
        implementation: 'Centralized error tracking with Sentry',
        status: 'implemented',
        owner: 'Engineering Team',
        frequency: 'continuous'
      },
      {
        category: 'processing_integrity',
        title: 'Data Reconciliation',
        description: 'Regular data reconciliation and integrity checks',
        implementation: 'Automated data integrity checks',
        status: 'implemented',
        owner: 'Data Team',
        frequency: 'daily'
      },

      // Confidentiality Controls
      {
        category: 'confidentiality',
        title: 'Data Classification',
        description: 'Formal data classification and handling procedures',
        implementation: 'Data classification policy with access controls',
        status: 'implemented',
        owner: 'Security Team',
        frequency: 'continuous'
      },
      {
        category: 'confidentiality',
        title: 'Access Reviews',
        description: 'Regular access reviews and privilege audits',
        implementation: 'Quarterly access reviews with automated reporting',
        status: 'implemented',
        owner: 'Security Team',
        frequency: 'quarterly'
      },
      {
        category: 'confidentiality',
        title: 'Data Loss Prevention',
        description: 'DLP controls to prevent unauthorized data exfiltration',
        implementation: 'Network-level DLP with monitoring',
        status: 'partially_implemented',
        owner: 'Security Team',
        frequency: 'continuous'
      },

      // Privacy Controls
      {
        category: 'privacy',
        title: 'Privacy Policy',
        description: 'Comprehensive privacy policy with clear data handling practices',
        implementation: 'Published privacy policy with regular updates',
        status: 'implemented',
        owner: 'Legal Team',
        frequency: 'annually'
      },
      {
        category: 'privacy',
        title: 'Consent Management',
        description: 'User consent management for data processing',
        implementation: 'Consent management system with opt-in/opt-out',
        status: 'implemented',
        owner: 'Legal Team',
        frequency: 'continuous'
      },
      {
        category: 'privacy',
        title: 'Data Subject Rights',
        description: 'Mechanisms for data subjects to exercise their rights',
        implementation: 'Data access, deletion, and portability features',
        status: 'implemented',
        owner: 'Legal Team',
        frequency: 'continuous'
      },
      {
        category: 'privacy',
        title: 'Cookie Management',
        description: 'Cookie consent and management',
        implementation: 'Cookie banner with granular consent',
        status: 'implemented',
        owner: 'Legal Team',
        frequency: 'continuous'
      }
    ];

    defaultControls.forEach(control => {
      const soc2Control: SOC2Control = {
        ...control,
        id: this.generateId(),
        evidence: [],
        lastReviewed: new Date(),
        nextReview: this.calculateNextReview(control.frequency)
      };
      this.controls.set(soc2Control.id, soc2Control);
    });
  }

  /**
   * Initialize default SOC2 policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: Omit<SOC2Policy, 'id' | 'lastReviewed' | 'nextReview'>[] = [
      {
        name: 'Information Security Policy',
        type: 'security',
        version: '1.0',
        effectiveDate: new Date(),
        owner: 'CISO',
        approvedBy: 'CEO',
        content: 'This policy establishes the information security requirements for RentFlow...',
        relatedControls: []
      },
      {
        name: 'Access Control Policy',
        type: 'access',
        version: '1.0',
        effectiveDate: new Date(),
        owner: 'CISO',
        approvedBy: 'CTO',
        content: 'This policy defines access control requirements and procedures...',
        relatedControls: []
      },
      {
        name: 'Data Classification Policy',
        type: 'data',
        version: '1.0',
        effectiveDate: new Date(),
        owner: 'CISO',
        approvedBy: 'CTO',
        content: 'This policy establishes data classification standards...',
        relatedControls: []
      },
      {
        name: 'Incident Response Policy',
        type: 'incident',
        version: '1.0',
        effectiveDate: new Date(),
        owner: 'CISO',
        approvedBy: 'CEO',
        content: 'This policy defines incident response procedures...',
        relatedControls: []
      },
      {
        name: 'Change Management Policy',
        type: 'change',
        version: '1.0',
        effectiveDate: new Date(),
        owner: 'CTO',
        approvedBy: 'CEO',
        content: 'This policy establishes change management procedures...',
        relatedControls: []
      },
      {
        name: 'Backup and Recovery Policy',
        type: 'backup',
        version: '1.0',
        effectiveDate: new Date(),
        owner: 'CTO',
        approvedBy: 'CEO',
        content: 'This policy defines backup and recovery requirements...',
        relatedControls: []
      },
      {
        name: 'Privacy Policy',
        type: 'privacy',
        version: '1.0',
        effectiveDate: new Date(),
        owner: 'Legal Counsel',
        approvedBy: 'CEO',
        content: 'This policy describes how we collect, use, and protect personal data...',
        relatedControls: []
      }
    ];

    defaultPolicies.forEach(policy => {
      const soc2Policy: SOC2Policy = {
        ...policy,
        id: this.generateId(),
        lastReviewed: new Date(),
        nextReview: this.calculateNextReview('annually')
      };
      this.policies.set(soc2Policy.id, soc2Policy);
    });
  }

  /**
   * Calculate next review date based on frequency
   */
  private calculateNextReview(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        return now;
      case 'quarterly':
        now.setMonth(now.getMonth() + 3);
        return now;
      case 'annually':
        now.setFullYear(now.getFullYear() + 1);
        return now;
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Add control evidence
   */
  addControlEvidence(controlId: string, evidence: Omit<ControlEvidence, 'id' | 'collectedAt'>): ControlEvidence {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    const controlEvidence: ControlEvidence = {
      ...evidence,
      id: this.generateId(),
      collectedAt: new Date()
    };

    control.evidence.push(controlEvidence);
    this.controls.set(controlId, control);

    return controlEvidence;
  }

  /**
   * Log audit trail entry
   */
  logAuditTrail(entry: Omit<SOC2AuditTrail, 'id' | 'timestamp'>): SOC2AuditTrail {
    const auditTrail: SOC2AuditTrail = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date()
    };

    this.auditTrail.push(auditTrail);
    return auditTrail;
  }

  /**
   * Create incident
   */
  createIncident(incidentData: Omit<SOC2Incident, 'id' | 'status'>): SOC2Incident {
    const incident: SOC2Incident = {
      ...incidentData,
      id: this.generateId(),
      status: 'open'
    };

    this.incidents.push(incident);
    return incident;
  }

  /**
   * Update incident status
   */
  updateIncidentStatus(incidentId: string, status: SOC2Incident['status'], metadata?: {
    resolvedAt?: Date;
    rootCause?: string;
    impact?: string;
    remediation?: string;
    prevention?: string;
  }): SOC2Incident {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    incident.status = status;
    if (metadata) {
      Object.assign(incident, metadata);
    }

    return incident;
  }

  /**
   * Get controls by category
   */
  getControlsByCategory(category: SOC2Category): SOC2Control[] {
    return Array.from(this.controls.values()).filter(c => c.category === category);
  }

  /**
   * Get controls requiring review
   */
  getControlsRequiringReview(): SOC2Control[] {
    const now = new Date();
    return Array.from(this.controls.values()).filter(c => c.nextReview <= now);
  }

  /**
   * Get policies by type
   */
  getPoliciesByType(type: SOC2Policy['type']): SOC2Policy[] {
    return Array.from(this.policies.values()).filter(p => p.type === type);
  }

  /**
   * Get audit trail for user
   */
  getUserAuditTrail(userId: string, startDate: Date, endDate: Date): SOC2AuditTrail[] {
    return this.auditTrail.filter(
      a => a.userId === userId && a.timestamp >= startDate && a.timestamp <= endDate
    );
  }

  /**
   * Get incidents by status
   */
  getIncidentsByStatus(status: SOC2Incident['status']): SOC2Incident[] {
    return this.incidents.filter(i => i.status === status);
  }

  /**
   * Generate SOC2 compliance report
   */
  generateComplianceReport(): {
    reportDate: Date;
    period: { startDate: Date; endDate: Date };
    overallCompliance: number;
    categoryCompliance: { category: SOC2Category; compliance: number; controls: number; implemented: number }[];
    controlStatus: { implemented: number; partiallyImplemented: number; notImplemented: number };
    openIncidents: number;
    resolvedIncidents: number;
    criticalIncidents: number;
    recommendations: string[];
  } {
    const controls = Array.from(this.controls.values());
    const now = new Date();
    const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days

    // Calculate overall compliance
    const implementedControls = controls.filter(c => c.status === 'implemented').length;
    const overallCompliance = (implementedControls / controls.length) * 100;

    // Calculate category compliance
    const categories: SOC2Category[] = ['security', 'availability', 'processing_integrity', 'confidentiality', 'privacy'];
    const categoryCompliance = categories.map(category => {
      const categoryControls = controls.filter(c => c.category === category);
      const categoryImplemented = categoryControls.filter(c => c.status === 'implemented').length;
      return {
        category,
        compliance: (categoryImplemented / categoryControls.length) * 100,
        controls: categoryControls.length,
        implemented: categoryImplemented
      };
    });

    // Control status breakdown
    const controlStatus = {
      implemented: controls.filter(c => c.status === 'implemented').length,
      partiallyImplemented: controls.filter(c => c.status === 'partially_implemented').length,
      notImplemented: controls.filter(c => c.status === 'not_implemented').length
    };

    // Incident statistics
    const openIncidents = this.incidents.filter(i => i.status === 'open' || i.status === 'investigating').length;
    const resolvedIncidents = this.incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
    const criticalIncidents = this.incidents.filter(i => i.severity === 'critical').length;

    // Generate recommendations
    const recommendations: string[] = [];
    if (controlStatus.notImplemented > 0) {
      recommendations.push(`Implement ${controlStatus.notImplemented} not implemented controls`);
    }
    if (controlStatus.partiallyImplemented > 0) {
      recommendations.push(`Complete implementation of ${controlStatus.partiallyImplemented} partially implemented controls`);
    }
    if (criticalIncidents > 0) {
      recommendations.push('Address critical security incidents immediately');
    }
    if (openIncidents > 5) {
      recommendations.push('Reduce backlog of open incidents');
    }

    return {
      reportDate: now,
      period: { startDate, endDate: now },
      overallCompliance,
      categoryCompliance,
      controlStatus,
      openIncidents,
      resolvedIncidents,
      criticalIncidents,
      recommendations
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
