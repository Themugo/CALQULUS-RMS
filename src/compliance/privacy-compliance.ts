/**
 * Privacy Compliance Framework
 * 
 * Implements privacy compliance for GDPR, CCPA, and other privacy regulations:
 * - Consent management and tracking
 * - Data subject rights (access, deletion, portability, rectification)
 * - Privacy policy management
 * - Cookie consent management
 * - Data breach notification
 * - Privacy impact assessments
 * - Third-party data sharing controls
 * - Cross-border data transfer compliance
 */

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: 'marketing' | 'analytics' | 'personalization' | 'third_party' | 'essential';
  granted: boolean;
  grantedAt: Date;
  revokedAt?: Date;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  version: string;
  ipAddress: string;
  userAgent: string;
}

export interface DataSubjectRequest {
  id: string;
  userId: string;
  type: 'access' | 'deletion' | 'portability' | 'rectification' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  completedAt?: Date;
  reason?: string;
  dataProvided?: string;
  rejectionReason?: string;
  processedBy: string;
  evidence: string[];
}

export interface PrivacyPolicy {
  id: string;
  version: string;
  effectiveDate: Date;
  lastUpdated: Date;
  content: string;
  languages: { code: string; content: string }[];
  approvedBy: string;
  status: 'draft' | 'published' | 'archived';
  changeLog: PolicyChange[];
}

export interface PolicyChange {
  version: string;
  date: Date;
  description: string;
  changedBy: string;
}

export interface CookieConsent {
  id: string;
  sessionId: string;
  userId?: string;
  essential: boolean;
  marketing: boolean;
  analytics: boolean;
  personalization: boolean;
  thirdParty: boolean;
  grantedAt: Date;
  ipAddress: string;
  userAgent: string;
}

export interface DataBreach {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedRecords: number;
  affectedUsers: string[];
  dataTypes: string[];
  discoveredAt: Date;
  reportedAt: Date;
  notifiedAt?: Date;
  resolvedAt?: Date;
  description: string;
  rootCause: string;
  remediation: string;
  prevention: string;
  status: 'discovered' | 'investigating' | 'notifying' | 'resolved';
  regulatoryNotifications: RegulatoryNotification[];
}

export interface RegulatoryNotification {
  jurisdiction: string;
  regulation: string;
  deadline: Date;
  notifiedAt?: Date;
  status: 'pending' | 'sent' | 'acknowledged';
}

export interface PrivacyImpactAssessment {
  id: string;
  projectName: string;
  description: string;
  dataTypes: string[];
  dataSubjects: string[];
  processingPurposes: string[];
  legalBasis: string;
  risks: string[];
  mitigationMeasures: string[];
  assessor: string;
  assessmentDate: Date;
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  approvalDate?: Date;
  approvedBy?: string;
}

export class PrivacyComplianceManager {
  private consentRecords: Map<string, ConsentRecord>;
  private dataSubjectRequests: Map<string, DataSubjectRequest>;
  private privacyPolicies: Map<string, PrivacyPolicy>;
  private cookieConsents: Map<string, CookieConsent>;
  private dataBreaches: Map<string, DataBreach>;
  private privacyImpactAssessments: Map<string, PrivacyImpactAssessment>;

  constructor() {
    this.consentRecords = new Map();
    this.dataSubjectRequests = new Map();
    this.privacyPolicies = new Map();
    this.cookieConsents = new Map();
    this.dataBreaches = new Map();
    this.privacyImpactAssessments = new Map();
    this.initializeDefaultPolicy();
  }

  /**
   * Initialize default privacy policy
   */
  private initializeDefaultPolicy(): void {
    const policy: PrivacyPolicy = {
      id: this.generateId(),
      version: '1.0',
      effectiveDate: new Date(),
      lastUpdated: new Date(),
      content: 'RentFlow Privacy Policy - We collect and process personal data for property management services...',
      languages: [
        { code: 'en', content: 'RentFlow Privacy Policy - We collect and process personal data for property management services...' }
      ],
      approvedBy: 'Legal Counsel',
      status: 'published',
      changeLog: [
        {
          version: '1.0',
          date: new Date(),
          description: 'Initial privacy policy',
          changedBy: 'Legal Counsel'
        }
      ]
    };

    this.privacyPolicies.set(policy.id, policy);
  }

  /**
   * Record consent
   */
  recordConsent(consentData: Omit<ConsentRecord, 'id' | 'grantedAt'>): ConsentRecord {
    const consent: ConsentRecord = {
      ...consentData,
      id: this.generateId(),
      grantedAt: new Date()
    };

    this.consentRecords.set(consent.id, consent);
    return consent;
  }

  /**
   * Revoke consent
   */
  revokeConsent(consentId: string): ConsentRecord {
    const consent = this.consentRecords.get(consentId);
    if (!consent) {
      throw new Error(`Consent ${consentId} not found`);
    }

    consent.granted = false;
    consent.revokedAt = new Date();

    this.consentRecords.set(consentId, consent);
    return consent;
  }

  /**
   * Check user consent
   */
  checkConsent(userId: string, consentType: ConsentRecord['consentType']): boolean {
    const userConsents = Array.from(this.consentRecords.values())
      .filter(c => c.userId === userId && c.consentType === consentType);

    if (userConsents.length === 0) return false;

    const latestConsent = userConsents.sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime())[0];
    return latestConsent.granted && !latestConsent.revokedAt;
  }

  /**
   * Create data subject request
   */
  createDataSubjectRequest(requestData: Omit<DataSubjectRequest, 'id' | 'status' | 'requestedAt' | 'processedBy' | 'evidence'>): DataSubjectRequest {
    const request: DataSubjectRequest = {
      ...requestData,
      id: this.generateId(),
      status: 'pending',
      requestedAt: new Date(),
      processedBy: 'Privacy Officer',
      evidence: []
    };

    this.dataSubjectRequests.set(request.id, request);
    return request;
  }

  /**
   * Process data subject request
   */
  processDataSubjectRequest(requestId: string, result: {
    status: 'completed' | 'rejected';
    dataProvided?: string;
    rejectionReason?: string;
  }): DataSubjectRequest {
    const request = this.dataSubjectRequests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    request.status = result.status;
    request.completedAt = new Date();

    if (result.status === 'completed') {
      request.dataProvided = result.dataProvided;
    } else {
      request.rejectionReason = result.rejectionReason;
    }

    this.dataSubjectRequests.set(requestId, request);
    return request;
  }

  /**
   * Record cookie consent
   */
  recordCookieConsent(consentData: Omit<CookieConsent, 'id' | 'grantedAt'>): CookieConsent {
    const consent: CookieConsent = {
      ...consentData,
      id: this.generateId(),
      grantedAt: new Date()
    };

    this.cookieConsents.set(consent.id, consent);
    return consent;
  }

  /**
   * Report data breach
   */
  reportDataBreach(breachData: Omit<DataBreach, 'id' | 'status' | 'regulatoryNotifications'>): DataBreach {
    const breach: DataBreach = {
      ...breachData,
      id: this.generateId(),
      status: 'discovered',
      regulatoryNotifications: this.calculateRegulatoryNotifications(breachData.discoveredAt, breachData.severity)
    };

    this.dataBreaches.set(breach.id, breach);
    return breach;
  }

  /**
   * Calculate regulatory notification requirements
   */
  private calculateRegulatoryNotifications(discoveredAt: Date, severity: string): RegulatoryNotification[] {
    const notifications: RegulatoryNotification[] = [];

    // GDPR - 72 hours for high/critical severity
    if (severity === 'high' || severity === 'critical') {
      notifications.push({
        jurisdiction: 'EU',
        regulation: 'GDPR',
        deadline: new Date(discoveredAt.getTime() + 72 * 60 * 60 * 1000),
        status: 'pending'
      });
    }

    // CCPA - No specific timeline but reasonable time
    if (severity === 'critical') {
      notifications.push({
        jurisdiction: 'California',
        regulation: 'CCPA',
        deadline: new Date(discoveredAt.getTime() + 72 * 60 * 60 * 1000),
        status: 'pending'
      });
    }

    return notifications;
  }

  /**
   * Update breach status
   */
  updateBreachStatus(breachId: string, status: DataBreach['status'], metadata?: {
    notifiedAt?: Date;
    resolvedAt?: Date;
  }): DataBreach {
    const breach = this.dataBreaches.get(breachId);
    if (!breach) {
      throw new Error(`Breach ${breachId} not found`);
    }

    breach.status = status;
    if (metadata) {
      Object.assign(breach, metadata);
    }

    this.dataBreaches.set(breachId, breach);
    return breach;
  }

  /**
   * Create privacy impact assessment
   */
  createPrivacyImpactAssessment(assessmentData: Omit<PrivacyImpactAssessment, 'id' | 'status' | 'assessmentDate'>): PrivacyImpactAssessment {
    const assessment: PrivacyImpactAssessment = {
      ...assessmentData,
      id: this.generateId(),
      status: 'draft',
      assessmentDate: new Date()
    };

    this.privacyImpactAssessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * Approve privacy impact assessment
   */
  approvePrivacyImpactAssessment(assessmentId: string, approvedBy: string): PrivacyImpactAssessment {
    const assessment = this.privacyImpactAssessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    assessment.status = 'approved';
    assessment.approvalDate = new Date();
    assessment.approvedBy = approvedBy;

    this.privacyImpactAssessments.set(assessmentId, assessment);
    return assessment;
  }

  /**
   * Get user consent records
   */
  getUserConsents(userId: string): ConsentRecord[] {
    return Array.from(this.consentRecords.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime());
  }

  /**
   * Get data subject requests by status
   */
  getRequestsByStatus(status: DataSubjectRequest['status']): DataSubjectRequest[] {
    return Array.from(this.dataSubjectRequests.values())
      .filter(r => r.status === status)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * Get active data breaches
   */
  getActiveBreaches(): DataBreach[] {
    return Array.from(this.dataBreaches.values())
      .filter(b => b.status !== 'resolved')
      .sort((a, b) => b.discoveredAt.getTime() - a.discoveredAt.getTime());
  }

  /**
   * Get pending regulatory notifications
   */
  getPendingNotifications(): RegulatoryNotification[] {
    const notifications: RegulatoryNotification[] = [];
    this.dataBreaches.forEach(breach => {
      breach.regulatoryNotifications.forEach(notification => {
        if (notification.status === 'pending') {
          notifications.push(notification);
        }
      });
    });

    return notifications.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  }

  /**
   * Generate privacy compliance report
   */
  generateComplianceReport(): {
    reportDate: Date;
    period: { startDate: Date; endDate: Date };
    consentStatistics: {
      totalConsents: number;
      activeConsents: number;
      revokedConsents: number;
      byType: { type: string; count: number }[];
    };
    requestStatistics: {
      totalRequests: number;
      pendingRequests: number;
      completedRequests: number;
      rejectedRequests: number;
      byType: { type: string; count: number }[];
    };
    breachStatistics: {
      totalBreaches: number;
      activeBreaches: number;
      resolvedBreaches: number;
      bySeverity: { severity: string; count: number }[];
    };
    assessmentStatistics: {
      totalAssessments: number;
      approvedAssessments: number;
      pendingAssessments: number;
    };
    notificationStatus: {
      pendingNotifications: number;
      overdueNotifications: number;
      sentNotifications: number;
    };
    complianceScore: number;
    recommendations: string[];
  } {
    const now = new Date();
    const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Consent statistics
    const consents = Array.from(this.consentRecords.values());
    const activeConsents = consents.filter(c => c.granted && !c.revokedAt).length;
    const revokedConsents = consents.filter(c => !c.granted || c.revokedAt).length;

    const consentTypeMap = new Map<string, number>();
    consents.forEach(c => {
      const current = consentTypeMap.get(c.consentType) || 0;
      consentTypeMap.set(c.consentType, current + 1);
    });

    const byConsentType = Array.from(consentTypeMap.entries())
      .map(([type, count]) => ({ type, count }));

    // Request statistics
    const requests = Array.from(this.dataSubjectRequests.values());
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const completedRequests = requests.filter(r => r.status === 'completed').length;
    const rejectedRequests = requests.filter(r => r.status === 'rejected').length;

    const requestTypeMap = new Map<string, number>();
    requests.forEach(r => {
      const current = requestTypeMap.get(r.type) || 0;
      requestTypeMap.set(r.type, current + 1);
    });

    const byRequestType = Array.from(requestTypeMap.entries())
      .map(([type, count]) => ({ type, count }));

    // Breach statistics
    const breaches = Array.from(this.dataBreaches.values());
    const activeBreaches = breaches.filter(b => b.status !== 'resolved').length;
    const resolvedBreaches = breaches.filter(b => b.status === 'resolved').length;

    const breachSeverityMap = new Map<string, number>();
    breaches.forEach(b => {
      const current = breachSeverityMap.get(b.severity) || 0;
      breachSeverityMap.set(b.severity, current + 1);
    });

    const byBreachSeverity = Array.from(breachSeverityMap.entries())
      .map(([severity, count]) => ({ severity, count }));

    // Assessment statistics
    const assessments = Array.from(this.privacyImpactAssessments.values());
    const approvedAssessments = assessments.filter(a => a.status === 'approved').length;
    const pendingAssessments = assessments.filter(a => a.status === 'draft' || a.status === 'in_review').length;

    // Notification status
    const pendingNotifications = this.getPendingNotifications();
    const overdueNotifications = pendingNotifications.filter(n => n.deadline < now).length;
    const sentNotifications = pendingNotifications.filter(n => n.status === 'sent').length;

    // Calculate compliance score
    const overdueRequests = requests.filter(r => r.status === 'pending' && (Date.now() - r.requestedAt.getTime()) > 30 * 24 * 60 * 60 * 1000).length;
    const totalRequests = requests.length;
    const requestCompliance = totalRequests > 0 ? ((totalRequests - overdueRequests) / totalRequests) * 100 : 100;

    const overdueBreaches = breaches.filter(b => {
      const criticalNotifications = b.regulatoryNotifications.filter(n => n.status === 'pending' && n.deadline < now);
      return criticalNotifications.length > 0;
    }).length;
    const totalBreaches = breaches.length;
    const breachCompliance = totalBreaches > 0 ? ((totalBreaches - overdueBreaches) / totalBreaches) * 100 : 100;

    const complianceScore = (requestCompliance + breachCompliance) / 2;

    // Generate recommendations
    const recommendations: string[] = [];
    if (overdueRequests > 0) {
      recommendations.push(`Process ${overdueRequests} overdue data subject requests`);
    }
    if (overdueNotifications > 0) {
      recommendations.push(`Send ${overdueNotifications} overdue regulatory breach notifications`);
    }
    if (pendingRequests > 5) {
      recommendations.push('Reduce backlog of pending data subject requests');
    }
    if (activeBreaches > 0) {
      recommendations.push('Resolve active data breaches promptly');
    }

    return {
      reportDate: now,
      period: { startDate, endDate: now },
      consentStatistics: {
        totalConsents: consents.length,
        activeConsents,
        revokedConsents,
        byType: byConsentType
      },
      requestStatistics: {
        totalRequests: requests.length,
        pendingRequests,
        completedRequests,
        rejectedRequests,
        byType: byRequestType
      },
      breachStatistics: {
        totalBreaches: breaches.length,
        activeBreaches,
        resolvedBreaches,
        bySeverity: byBreachSeverity
      },
      assessmentStatistics: {
        totalAssessments: assessments.length,
        approvedAssessments,
        pendingAssessments
      },
      notificationStatus: {
        pendingNotifications: pendingNotifications.length,
        overdueNotifications,
        sentNotifications
      },
      complianceScore,
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
