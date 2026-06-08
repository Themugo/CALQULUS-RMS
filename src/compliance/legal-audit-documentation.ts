/**
 * Legal Audit Documentation
 * 
 * Implements legal audit documentation and tracking:
 * - Legal requirement tracking
 * - Audit trail management
 * - Document retention for legal purposes
 * - Regulatory compliance documentation
 * - Third-party agreement management
 * - License and permit tracking
 * - Legal hold management
 * - Audit report generation
 */

export interface LegalRequirement {
  id: string;
  jurisdiction: string;
  regulation: string;
  requirement: string;
  description: string;
  category: 'data_protection' | 'financial' | 'employment' | 'property' | 'consumer_protection' | 'tax' | 'other';
  status: 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_applicable';
  lastReviewed: Date;
  nextReview: Date;
  owner: string;
  evidence: string[];
  relatedControls: string[];
  notes: string;
}

export interface AuditTrail {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  outcome: 'success' | 'failure';
  category: 'access' | 'modification' | 'deletion' | 'export' | 'admin' | 'other';
}

export interface LegalDocument {
  id: string;
  name: string;
  type: 'contract' | 'agreement' | 'license' | 'permit' | 'policy' | 'certificate' | 'other';
  category: string;
  jurisdiction: string;
  effectiveDate: Date;
  expiryDate?: Date;
  status: 'active' | 'expired' | 'expiring_soon' | 'terminated' | 'pending';
  counterparty?: string;
  value?: number;
  currency?: string;
  location: string;
  version: string;
  relatedRequirements: string[];
  reminders: DocumentReminder[];
  notes: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface DocumentReminder {
  id: string;
  type: 'expiry' | 'review' | 'renewal';
  dueDate: Date;
  sent: boolean;
  sentAt?: Date;
}

export interface ThirdPartyAgreement {
  id: string;
  name: string;
  type: 'vendor' | 'partner' | 'supplier' | 'service_provider' | 'other';
  counterparty: string;
  category: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'expired' | 'terminated' | 'pending';
  value?: number;
  currency?: string;
  paymentTerms: string;
  deliverables: string[];
  sla?: ServiceLevelAgreement;
  dataProcessing: DataProcessingAgreement;
  complianceRequirements: string[];
  riskLevel: 'low' | 'medium' | 'high';
  lastReviewed: Date;
  nextReview: Date;
  documents: string[];
  notes: string;
}

export interface ServiceLevelAgreement {
  uptime: number;
  responseTime: number;
  resolutionTime: number;
  penalties: string;
}

export interface DataProcessingAgreement {
  dataTypes: string[];
  processingActivities: string[];
  securityMeasures: string[];
  dataLocation: string;
  subprocessingAllowed: boolean;
  dataRetention: string;
  dataSubjectRights: string[];
}

export interface LegalHold {
  id: string;
  name: string;
  description: string;
  reason: string;
  caseReference?: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'released' | 'expired';
  authorizedBy: string;
  affectedDocuments: string[];
  affectedUsers: string[];
  notificationsSent: boolean;
}

export class LegalAuditDocumentation {
  private legalRequirements: Map<string, LegalRequirement>;
  private auditTrail: AuditTrail[];
  private legalDocuments: Map<string, LegalDocument>;
  private thirdPartyAgreements: Map<string, ThirdPartyAgreement>;
  private legalHolds: Map<string, LegalHold>;

  constructor() {
    this.legalRequirements = new Map();
    this.auditTrail = [];
    this.legalDocuments = new Map();
    this.thirdPartyAgreements = new Map();
    this.legalHolds = new Map();
    this.initializeDefaultRequirements();
  }

  /**
   * Initialize default legal requirements
   */
  private initializeDefaultRequirements(): void {
    const defaultRequirements: Omit<LegalRequirement, 'id' | 'lastReviewed' | 'nextReview' | 'evidence' | 'relatedControls'>[] = [
      {
        jurisdiction: 'EU',
        regulation: 'GDPR',
        requirement: 'Article 5(1)(a) - Lawfulness, fairness and transparency',
        description: 'Personal data shall be processed lawfully, fairly and in a transparent manner',
        category: 'data_protection',
        status: 'compliant',
        owner: 'DPO',
        notes: 'Implemented through consent management and privacy policy'
      },
      {
        jurisdiction: 'EU',
        regulation: 'GDPR',
        requirement: 'Article 5(1)(c) - Data minimization',
        description: 'Personal data shall be adequate, relevant and limited to what is necessary',
        category: 'data_protection',
        status: 'compliant',
        owner: 'DPO',
        notes: 'Data collection limited to essential information for services'
      },
      {
        jurisdiction: 'EU',
        regulation: 'GDPR',
        requirement: 'Article 5(1)(e) - Storage limitation',
        description: 'Personal data shall be kept in a form which permits identification for no longer than necessary',
        category: 'data_protection',
        status: 'compliant',
        owner: 'DPO',
        notes: 'Data retention policy implemented with automated disposal'
      },
      {
        jurisdiction: 'California',
        regulation: 'CCPA',
        requirement: 'Right to know',
        description: 'Consumers have the right to know what personal data is collected and how it is used',
        category: 'data_protection',
        status: 'compliant',
        owner: 'DPO',
        notes: 'Privacy policy and data subject request process implemented'
      },
      {
        jurisdiction: 'California',
        regulation: 'CCPA',
        requirement: 'Right to delete',
        description: 'Consumers have the right to request deletion of their personal data',
        category: 'data_protection',
        status: 'compliant',
        owner: 'DPO',
        notes: 'Data deletion request process implemented'
      },
      {
        jurisdiction: 'Kenya',
        regulation: 'Data Protection Act',
        requirement: 'Section 21 - Data subject rights',
        description: 'Data subjects have rights to access, correction, deletion of their data',
        category: 'data_protection',
        status: 'compliant',
        owner: 'DPO',
        notes: 'Data subject request process implemented'
      },
      {
        jurisdiction: 'Kenya',
        regulation: 'Income Tax Act',
        requirement: 'Record retention',
        description: 'Maintain financial records for 7 years',
        category: 'tax',
        status: 'compliant',
        owner: 'CFO',
        notes: 'Financial records retained for 7 years per policy'
      },
      {
        jurisdiction: 'Kenya',
        regulation: 'Employment Act',
        requirement: 'Employee records',
        description: 'Maintain employee records as required by law',
        category: 'employment',
        status: 'compliant',
        owner: 'HR',
        notes: 'Employee records maintained per HR policy'
      }
    ];

    defaultRequirements.forEach(requirement => {
      const legalRequirement: LegalRequirement = {
        ...requirement,
        id: this.generateId(),
        lastReviewed: new Date(),
        nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        evidence: [],
        relatedControls: []
      };
      this.legalRequirements.set(legalRequirement.id, legalRequirement);
    });
  }

  /**
   * Add legal requirement
   */
  addLegalRequirement(requirementData: Omit<LegalRequirement, 'id' | 'lastReviewed' | 'nextReview'>): LegalRequirement {
    const requirement: LegalRequirement = {
      ...requirementData,
      id: this.generateId(),
      lastReviewed: new Date(),
      nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };

    this.legalRequirements.set(requirement.id, requirement);
    return requirement;
  }

  /**
   * Log audit trail entry
   */
  logAuditTrail(entry: Omit<AuditTrail, 'id' | 'timestamp'>): AuditTrail {
    const auditEntry: AuditTrail = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date()
    };

    this.auditTrail.push(auditEntry);
    return auditEntry;
  }

  /**
   * Add legal document
   */
  addLegalDocument(documentData: Omit<LegalDocument, 'id' | 'status' | 'uploadedAt' | 'uploadedBy'>): LegalDocument {
    const status = this.determineDocumentStatus(documentData.effectiveDate, documentData.expiryDate);

    const document: LegalDocument = {
      ...documentData,
      id: this.generateId(),
      status,
      uploadedAt: new Date(),
      uploadedBy: 'System'
    };

    this.legalDocuments.set(document.id, document);
    return document;
  }

  /**
   * Determine document status
   */
  private determineDocumentStatus(effectiveDate: Date, expiryDate?: Date): LegalDocument['status'] {
    const now = new Date();

    if (effectiveDate > now) {
      return 'pending';
    }

    if (expiryDate && expiryDate < now) {
      return 'expired';
    }

    if (expiryDate && expiryDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
      return 'expiring_soon';
    }

    return 'active';
  }

  /**
   * Add third-party agreement
   */
  addThirdPartyAgreement(agreementData: Omit<ThirdPartyAgreement, 'id' | 'lastReviewed' | 'nextReview'>): ThirdPartyAgreement {
    const agreement: ThirdPartyAgreement = {
      ...agreementData,
      id: this.generateId(),
      lastReviewed: new Date(),
      nextReview: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
    };

    this.thirdPartyAgreements.set(agreement.id, agreement);
    return agreement;
  }

  /**
   * Create legal hold
   */
  createLegalHold(holdData: Omit<LegalHold, 'id' | 'status' | 'notificationsSent'>): LegalHold {
    const legalHold: LegalHold = {
      ...holdData,
      id: this.generateId(),
      status: 'active',
      notificationsSent: false
    };

    this.legalHolds.set(legalHold.id, legalHold);
    return legalHold;
  }

  /**
   * Release legal hold
   */
  releaseLegalHold(holdId: string): LegalHold {
    const legalHold = this.legalHolds.get(holdId);
    if (!legalHold) {
      throw new Error(`Legal hold ${holdId} not found`);
    }

    legalHold.status = 'released';
    legalHold.endDate = new Date();

    this.legalHolds.set(holdId, legalHold);
    return legalHold;
  }

  /**
   * Get requirements by jurisdiction
   */
  getRequirementsByJurisdiction(jurisdiction: string): LegalRequirement[] {
    return Array.from(this.legalRequirements.values())
      .filter(r => r.jurisdiction === jurisdiction)
      .sort((a, b) => a.regulation.localeCompare(b.regulation));
  }

  /**
   * Get requirements by status
   */
  getRequirementsByStatus(status: LegalRequirement['status']): LegalRequirement[] {
    return Array.from(this.legalRequirements.values())
      .filter(r => r.status === status);
  }

  /**
   * Get documents expiring soon
   */
  getDocumentsExpiringSoon(days: number): LegalDocument[] {
    const cutoffDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return Array.from(this.legalDocuments.values())
      .filter(d => d.expiryDate && d.expiryDate <= cutoffDate && d.status === 'active')
      .sort((a, b) => a.expiryDate!.getTime() - b.expiryDate!.getTime());
  }

  /**
   * Get audit trail for user
   */
  getUserAuditTrail(userId: string, startDate: Date, endDate: Date): AuditTrail[] {
    return this.auditTrail.filter(
      a => a.userId === userId && a.timestamp >= startDate && a.timestamp <= endDate
    );
  }

  /**
   * Get audit trail for resource
   */
  getResourceAuditTrail(resource: string, startDate: Date, endDate: Date): AuditTrail[] {
    return this.auditTrail.filter(
      a => a.resource === resource && a.timestamp >= startDate && a.timestamp <= endDate
    );
  }

  /**
   * Get active legal holds
   */
  getActiveLegalHolds(): LegalHold[] {
    return Array.from(this.legalHolds.values())
      .filter(h => h.status === 'active');
  }

  /**
   * Get third-party agreements by risk level
   */
  getAgreementsByRiskLevel(riskLevel: ThirdPartyAgreement['riskLevel']): ThirdPartyAgreement[] {
    return Array.from(this.thirdPartyAgreements.values())
      .filter(a => a.riskLevel === riskLevel);
  }

  /**
   * Generate legal compliance report
   */
  generateComplianceReport(): {
    reportDate: Date;
    period: { startDate: Date; endDate: Date };
    requirementCompliance: {
      total: number;
      compliant: number;
      nonCompliant: number;
      partiallyCompliant: number;
      byJurisdiction: { jurisdiction: string; compliant: number; total: number }[];
    };
    documentStatus: {
      total: number;
      active: number;
      expired: number;
      expiringSoon: number;
      pending: number;
    };
    agreementStatus: {
      total: number;
      active: number;
      expired: number;
      byRiskLevel: { riskLevel: string; count: number }[];
    };
    legalHolds: {
      total: number;
      active: number;
      released: number;
    };
    auditActivity: {
      totalEntries: number;
      byCategory: { category: string; count: number }[];
      byOutcome: { outcome: string; count: number }[];
    };
    complianceScore: number;
    recommendations: string[];
  } {
    const now = new Date();
    const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Requirement compliance
    const requirements = Array.from(this.legalRequirements.values());
    const compliant = requirements.filter(r => r.status === 'compliant').length;
    const nonCompliant = requirements.filter(r => r.status === 'non_compliant').length;
    const partiallyCompliant = requirements.filter(r => r.status === 'partially_compliant').length;

    const jurisdictionMap = new Map<string, { compliant: number; total: number }>();
    requirements.forEach(r => {
      const current = jurisdictionMap.get(r.jurisdiction) || { compliant: 0, total: 0 };
      if (r.status === 'compliant') current.compliant++;
      current.total++;
      jurisdictionMap.set(r.jurisdiction, current);
    });

    const byJurisdiction = Array.from(jurisdictionMap.entries())
      .map(([jurisdiction, data]) => ({ jurisdiction, ...data }));

    // Document status
    const documents = Array.from(this.legalDocuments.values());
    const active = documents.filter(d => d.status === 'active').length;
    const expired = documents.filter(d => d.status === 'expired').length;
    const expiringSoon = documents.filter(d => d.status === 'expiring_soon').length;
    const pending = documents.filter(d => d.status === 'pending').length;

    // Agreement status
    const agreements = Array.from(this.thirdPartyAgreements.values());
    const activeAgreements = agreements.filter(a => a.status === 'active').length;
    const expiredAgreements = agreements.filter(a => a.status === 'expired').length;

    const riskLevelMap = new Map<string, number>();
    agreements.forEach(a => {
      const current = riskLevelMap.get(a.riskLevel) || 0;
      riskLevelMap.set(a.riskLevel, current + 1);
    });

    const byRiskLevel = Array.from(riskLevelMap.entries())
      .map(([riskLevel, count]) => ({ riskLevel, count }));

    // Legal holds
    const legalHolds = Array.from(this.legalHolds.values());
    const activeHolds = legalHolds.filter(h => h.status === 'active').length;
    const releasedHolds = legalHolds.filter(h => h.status === 'released').length;

    // Audit activity
    const periodAuditTrail = this.auditTrail.filter(a => a.timestamp >= startDate && a.timestamp <= now);

    const categoryMap = new Map<string, number>();
    periodAuditTrail.forEach(a => {
      const current = categoryMap.get(a.category) || 0;
      categoryMap.set(a.category, current + 1);
    });

    const byCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }));

    const outcomeMap = new Map<string, number>();
    periodAuditTrail.forEach(a => {
      const current = outcomeMap.get(a.outcome) || 0;
      outcomeMap.set(a.outcome, current + 1);
    });

    const byOutcome = Array.from(outcomeMap.entries())
      .map(([outcome, count]) => ({ outcome, count }));

    // Calculate compliance score
    const requirementCompliance = requirements.length > 0 ? (compliant / requirements.length) * 100 : 100;
    const documentCompliance = documents.length > 0 ? ((active + pending) / documents.length) * 100 : 100;
    const complianceScore = (requirementCompliance + documentCompliance) / 2;

    // Generate recommendations
    const recommendations: string[] = [];
    if (nonCompliant > 0) {
      recommendations.push(`Address ${nonCompliant} non-compliant legal requirements`);
    }
    if (partiallyCompliant > 0) {
      recommendations.push(`Complete implementation of ${partiallyCompliant} partially compliant requirements`);
    }
    if (expiringSoon > 0) {
      recommendations.push(`Renew ${expiringSoon} documents expiring soon`);
    }
    if (activeHolds > 0) {
      recommendations.push('Review and release stale legal holds');
    }

    return {
      reportDate: now,
      period: { startDate, endDate: now },
      requirementCompliance: {
        total: requirements.length,
        compliant,
        nonCompliant,
        partiallyCompliant,
        byJurisdiction
      },
      documentStatus: {
        total: documents.length,
        active,
        expired,
        expiringSoon,
        pending
      },
      agreementStatus: {
        total: agreements.length,
        active: activeAgreements,
        expired: expiredAgreements,
        byRiskLevel
      },
      legalHolds: {
        total: legalHolds.length,
        active: activeHolds,
        released: releasedHolds
      },
      auditActivity: {
        totalEntries: periodAuditTrail.length,
        byCategory,
        byOutcome
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
