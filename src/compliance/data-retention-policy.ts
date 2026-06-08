/**
 * Data Retention Policy
 * 
 * Implements data retention and disposal policies for compliance:
 * - Data classification and retention periods
 * - Automated data lifecycle management
 * - Data disposal and secure deletion procedures
 * - Retention schedule enforcement
 * - Audit trail for data operations
 * - Legal hold management
 * - Data archiving and backup retention
 */

export interface DataRetentionPolicy {
  id: string;
  name: string;
  dataCategory: string;
  dataType: 'personal' | 'financial' | 'operational' | 'legal' | 'security' | 'marketing';
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPeriod: number; // in months
  retentionReason: string;
  disposalMethod: 'delete' | 'archive' | 'anonymize' | 'secure_delete';
  legalRequirements: string[];
  exceptions: RetentionException[];
  approvedBy: string;
  effectiveDate: Date;
  reviewDate: Date;
  status: 'active' | 'inactive' | 'superseded';
}

export interface DataRetentionPolicyInput {
  name: string;
  dataCategory: string;
  dataType: 'personal' | 'financial' | 'operational' | 'legal' | 'security' | 'marketing';
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPeriod: number;
  retentionReason: string;
  disposalMethod: 'delete' | 'archive' | 'anonymize' | 'secure_delete';
  legalRequirements: string[];
  exceptions: RetentionException[];
}

export interface RetentionException {
  type: 'legal_hold' | 'audit' | 'investigation' | 'business_requirement';
  description: string;
  authorizedBy: string;
  startDate: Date;
  endDate?: Date;
}

export interface DataRecord {
  id: string;
  dataCategory: string;
  dataType: string;
  classification: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'disposed' | 'archived' | 'on_hold';
  location: string;
  size: number;
  owner: string;
  legalHold: boolean;
  legalHoldId?: string;
  disposalDate?: Date;
  disposalMethod?: string;
  disposedBy?: string;
  disposedAt?: Date;
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
  affectedRecords: string[];
  notificationsSent: boolean;
}

export interface DisposalRecord {
  id: string;
  recordId: string;
  recordCategory: string;
  disposalMethod: string;
  disposalDate: Date;
  disposedBy: string;
  verificationMethod: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  certificate?: string;
}

export class DataRetentionPolicyManager {
  private policies: Map<string, DataRetentionPolicy>;
  private records: Map<string, DataRecord>;
  private legalHolds: Map<string, LegalHold>;
  private disposalRecords: Map<string, DisposalRecord>;

  constructor() {
    this.policies = new Map();
    this.records = new Map();
    this.legalHolds = new Map();
    this.disposalRecords = new Map();
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default data retention policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: DataRetentionPolicyInput[] = [
      {
        name: 'User Personal Data',
        dataCategory: 'user_personal_data',
        dataType: 'personal',
        classification: 'confidential',
        retentionPeriod: 36, // 3 years after account closure
        retentionReason: 'GDPR compliance - retain for legal and regulatory requirements',
        disposalMethod: 'secure_delete',
        legalRequirements: ['GDPR Article 5(1)(e)', 'Data Protection Act'],
        exceptions: []
      },
      {
        name: 'Financial Records',
        dataCategory: 'financial_records',
        dataType: 'financial',
        classification: 'confidential',
        retentionPeriod: 84, // 7 years for tax and audit purposes
        retentionReason: 'Tax and audit compliance requirements',
        disposalMethod: 'archive',
        legalRequirements: ['Tax Laws', 'Accounting Standards'],
        exceptions: []
      },
      {
        name: 'Transaction Data',
        dataCategory: 'transaction_data',
        dataType: 'financial',
        classification: 'confidential',
        retentionPeriod: 84, // 7 years
        retentionReason: 'Financial transaction audit trail',
        disposalMethod: 'archive',
        legalRequirements: ['Payment Card Industry Standards', 'Tax Laws'],
        exceptions: []
      },
      {
        name: 'Lease Agreements',
        dataCategory: 'lease_agreements',
        dataType: 'legal',
        classification: 'confidential',
        retentionPeriod: 120, // 10 years
        retentionReason: 'Legal document retention',
        disposalMethod: 'archive',
        legalRequirements: ['Property Laws', 'Contract Law'],
        exceptions: []
      },
      {
        name: 'Maintenance Records',
        dataCategory: 'maintenance_records',
        dataType: 'operational',
        classification: 'internal',
        retentionPeriod: 60, // 5 years
        retentionReason: 'Operational history and warranty tracking',
        disposalMethod: 'delete',
        legalRequirements: ['Consumer Protection Laws'],
        exceptions: []
      },
      {
        name: 'Security Logs',
        dataCategory: 'security_logs',
        dataType: 'security',
        classification: 'confidential',
        retentionPeriod: 24, // 2 years
        retentionReason: 'Security incident investigation and compliance',
        disposalMethod: 'secure_delete',
        legalRequirements: ['SOC2 Requirements', 'ISO 27001'],
        exceptions: []
      },
      {
        name: 'Audit Logs',
        dataCategory: 'audit_logs',
        dataType: 'security',
        classification: 'confidential',
        retentionPeriod: 36, // 3 years
        retentionReason: 'Audit trail for compliance and security',
        disposalMethod: 'secure_delete',
        legalRequirements: ['SOC2 Requirements', 'ISO 27001'],
        exceptions: []
      },
      {
        name: 'Communications',
        dataCategory: 'communications',
        dataType: 'operational',
        classification: 'internal',
        retentionPeriod: 24, // 2 years
        retentionReason: 'Business communication records',
        disposalMethod: 'delete',
        legalRequirements: ['Business Communication Laws'],
        exceptions: []
      },
      {
        name: 'Marketing Data',
        dataCategory: 'marketing_data',
        dataType: 'marketing',
        classification: 'internal',
        retentionPeriod: 24, // 2 years
        retentionReason: 'Marketing campaign tracking',
        disposalMethod: 'delete',
        legalRequirements: ['GDPR Article 6(1)(f)'],
        exceptions: []
      },
      {
        name: 'Backup Data',
        dataCategory: 'backup_data',
        dataType: 'operational',
        classification: 'confidential',
        retentionPeriod: 12, // 1 year
        retentionReason: 'Disaster recovery and business continuity',
        disposalMethod: 'secure_delete',
        legalRequirements: ['Business Continuity Standards'],
        exceptions: []
      }
    ];

    defaultPolicies.forEach(policy => {
      const retentionPolicy: DataRetentionPolicy = {
        id: this.generateId(),
        name: policy.name,
        dataCategory: policy.dataCategory,
        dataType: policy.dataType,
        classification: policy.classification,
        retentionPeriod: policy.retentionPeriod,
        retentionReason: policy.retentionReason,
        disposalMethod: policy.disposalMethod,
        legalRequirements: policy.legalRequirements,
        exceptions: policy.exceptions,
        approvedBy: 'CISO',
        effectiveDate: new Date(),
        reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'active'
      };
      this.policies.set(retentionPolicy.id, retentionPolicy);
    });
  }

  /**
   * Add data retention policy
   */
  addPolicy(policyData: DataRetentionPolicyInput): DataRetentionPolicy {
    const policy: DataRetentionPolicy = {
      id: this.generateId(),
      name: policyData.name,
      dataCategory: policyData.dataCategory,
      dataType: policyData.dataType,
      classification: policyData.classification,
      retentionPeriod: policyData.retentionPeriod,
      retentionReason: policyData.retentionReason,
      disposalMethod: policyData.disposalMethod,
      legalRequirements: policyData.legalRequirements,
      exceptions: policyData.exceptions,
      approvedBy: 'CISO',
      effectiveDate: new Date(),
      reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'active'
    };

    this.policies.set(policy.id, policy);
    return policy;
  }

  /**
   * Register data record
   */
  registerRecord(recordData: Omit<DataRecord, 'id' | 'expiresAt' | 'status'>): DataRecord {
    const policy = this.getPolicyForCategory(recordData.dataCategory);
    const expiresAt = policy ? new Date(recordData.createdAt.getTime() + policy.retentionPeriod * 30 * 24 * 60 * 60 * 1000) : new Date(recordData.createdAt.getTime() + 36 * 30 * 24 * 60 * 60 * 1000);

    const record: DataRecord = {
      ...recordData,
      id: this.generateId(),
      expiresAt,
      status: 'active'
    };

    this.records.set(record.id, record);
    return record;
  }

  /**
   * Get policy for data category
   */
  private getPolicyForCategory(category: string): DataRetentionPolicy | undefined {
    return Array.from(this.policies.values()).find(p => p.dataCategory === category && p.status === 'active');
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

    // Apply hold to affected records
    legalHold.affectedRecords.forEach(recordId => {
      const record = this.records.get(recordId);
      if (record) {
        record.legalHold = true;
        record.legalHoldId = legalHold.id;
        record.status = 'on_hold';
        this.records.set(recordId, record);
      }
    });

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

    // Release hold from affected records
    legalHold.affectedRecords.forEach(recordId => {
      const record = this.records.get(recordId);
      if (record) {
        record.legalHold = false;
        record.legalHoldId = undefined;
        record.status = this.determineRecordStatus(record);
        this.records.set(recordId, record);
      }
    });

    this.legalHolds.set(holdId, legalHold);
    return legalHold;
  }

  /**
   * Determine record status
   */
  private determineRecordStatus(record: DataRecord): 'active' | 'expired' | 'disposed' | 'archived' {
    if (record.disposedAt) return 'disposed';
    if (new Date() > record.expiresAt) return 'expired';
    return 'active';
  }

  /**
   * Dispose expired records
   */
  disposeExpiredRecords(): {
    disposed: DataRecord[];
    skipped: DataRecord[];
    errors: { recordId: string; error: string }[];
  } {
    const now = new Date();
    const expiredRecords = Array.from(this.records.values()).filter(
      r => r.status === 'expired' || (r.status === 'active' && r.expiresAt <= now)
    );

    const disposed: DataRecord[] = [];
    const skipped: DataRecord[] = [];
    const errors: { recordId: string; error: string }[] = [];

    expiredRecords.forEach(record => {
      if (record.legalHold) {
        skipped.push(record);
        return;
      }

      try {
        this.disposeRecord(record.id);
        disposed.push(record);
      } catch (error) {
        errors.push({
          recordId: record.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    return { disposed, skipped, errors };
  }

  /**
   * Dispose specific record
   */
  disposeRecord(recordId: string): DataRecord {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Record ${recordId} not found`);
    }

    if (record.legalHold) {
      throw new Error('Cannot dispose record with active legal hold');
    }

    const policy = this.getPolicyForCategory(record.dataCategory);
    const disposalMethod = policy?.disposalMethod || 'delete';

    // Perform disposal based on method
    this.performDisposal(record, disposalMethod);

    // Create disposal record
    const disposalRecord: DisposalRecord = {
      id: this.generateId(),
      recordId,
      recordCategory: record.dataCategory,
      disposalMethod,
      disposalDate: new Date(),
      disposedBy: 'System',
      verificationMethod: 'automated',
      verified: true
    };

    this.disposalRecords.set(disposalRecord.id, disposalRecord);

    // Update record status
    record.status = 'disposed';
    record.disposalDate = new Date();
    record.disposalMethod = disposalMethod;
    record.disposedBy = 'System';
    record.disposedAt = new Date();

    this.records.set(recordId, record);
    return record;
  }

  /**
   * Perform disposal based on method
   */
  private performDisposal(record: DataRecord, method: string): void {
    // In production, this would integrate with actual data storage systems
    switch (method) {
      case 'delete':
        // Standard deletion
        console.warn(`Deleting record ${record.id} from ${record.location}`);
        break;
      case 'secure_delete':
        // Secure deletion with overwriting
        console.warn(`Securely deleting record ${record.id} from ${record.location}`);
        break;
      case 'archive':
        // Move to long-term archive
        console.warn(`Archiving record ${record.id} to cold storage`);
        break;
      case 'anonymize':
        // Anonymize personal data
        console.warn(`Anonymizing record ${record.id}`);
        break;
    }
  }

  /**
   * Get records by status
   */
  getRecordsByStatus(status: DataRecord['status']): DataRecord[] {
    return Array.from(this.records.values()).filter(r => r.status === status);
  }

  /**
   * Get records expiring soon
   */
  getRecordsExpiringSoon(days: number): DataRecord[] {
    const cutoffDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return Array.from(this.records.values()).filter(
      r => r.status === 'active' && r.expiresAt <= cutoffDate && !r.legalHold
    );
  }

  /**
   * Get records on legal hold
   */
  getRecordsOnHold(): DataRecord[] {
    return Array.from(this.records.values()).filter(r => r.legalHold);
  }

  /**
   * Get retention statistics
   */
  getRetentionStatistics(): {
    totalRecords: number;
    activeRecords: number;
    expiredRecords: number;
    disposedRecords: number;
    onHoldRecords: number;
    byCategory: { category: string; count: number }[];
    byClassification: { classification: string; count: number }[];
    upcomingDisposals: number;
    legalHolds: number;
  } {
    const records = Array.from(this.records.values());

    const activeRecords = records.filter(r => r.status === 'active').length;
    const expiredRecords = records.filter(r => r.status === 'expired').length;
    const disposedRecords = records.filter(r => r.status === 'disposed').length;
    const onHoldRecords = records.filter(r => r.legalHold).length;
    const upcomingDisposals = this.getRecordsExpiringSoon(30).length;
    const legalHolds = this.legalHolds.size;

    // By category
    const categoryMap = new Map<string, number>();
    records.forEach(r => {
      const current = categoryMap.get(r.dataCategory) || 0;
      categoryMap.set(r.dataCategory, current + 1);
    });

    const byCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // By classification
    const classificationMap = new Map<string, number>();
    records.forEach(r => {
      const current = classificationMap.get(r.classification) || 0;
      classificationMap.set(r.classification, current + 1);
    });

    const byClassification = Array.from(classificationMap.entries())
      .map(([classification, count]) => ({ classification, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRecords: records.length,
      activeRecords,
      expiredRecords,
      disposedRecords,
      onHoldRecords,
      byCategory,
      byClassification,
      upcomingDisposals,
      legalHolds
    };
  }

  /**
   * Generate retention compliance report
   */
  generateComplianceReport(): {
    reportDate: Date;
    period: { startDate: Date; endDate: Date };
    policies: { total: number; active: number; byType: { type: string; count: number }[] };
    records: { total: number; byStatus: { status: string; count: number }[] };
    disposals: { total: number; byMethod: { method: string; count: number }[] };
    legalHolds: { total: number; active: number; released: number };
    complianceScore: number;
    recommendations: string[];
  } {
    const now = new Date();
    const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const policies = Array.from(this.policies.values());
    const activePolicies = policies.filter(p => p.status === 'active').length;

    const policyTypeMap = new Map<string, number>();
    policies.forEach(p => {
      const current = policyTypeMap.get(p.dataType) || 0;
      policyTypeMap.set(p.dataType, current + 1);
    });

    const byType = Array.from(policyTypeMap.entries())
      .map(([type, count]) => ({ type, count }));

    const records = Array.from(this.records.values());

    const statusMap = new Map<string, number>();
    records.forEach(r => {
      const current = statusMap.get(r.status) || 0;
      statusMap.set(r.status, current + 1);
    });

    const byStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }));

    const disposals = Array.from(this.disposalRecords.values());

    const disposalMethodMap = new Map<string, number>();
    disposals.forEach(d => {
      const current = disposalMethodMap.get(d.disposalMethod) || 0;
      disposalMethodMap.set(d.disposalMethod, current + 1);
    });

    const byMethod = Array.from(disposalMethodMap.entries())
      .map(([method, count]) => ({ method, count }));

    const legalHolds = Array.from(this.legalHolds.values());
    const activeLegalHolds = legalHolds.filter(h => h.status === 'active').length;
    const releasedLegalHolds = legalHolds.filter(h => h.status === 'released').length;

    // Calculate compliance score
    const expiredNotDisposed = records.filter(r => r.status === 'expired' && !r.legalHold).length;
    const totalRecords = records.length;
    const complianceScore = totalRecords > 0 ? ((totalRecords - expiredNotDisposed) / totalRecords) * 100 : 100;

    // Generate recommendations
    const recommendations: string[] = [];
    if (expiredNotDisposed > 0) {
      recommendations.push(`Dispose ${expiredNotDisposed} expired records to maintain compliance`);
    }
    if (activeLegalHolds > 5) {
      recommendations.push('Review and release stale legal holds');
    }
    if (complianceScore < 95) {
      recommendations.push('Improve data disposal processes to increase compliance score');
    }

    return {
      reportDate: now,
      period: { startDate, endDate: now },
      policies: {
        total: policies.length,
        active: activePolicies,
        byType
      },
      records: {
        total: records.length,
        byStatus
      },
      disposals: {
        total: disposals.length,
        byMethod
      },
      legalHolds: {
        total: legalHolds.length,
        active: activeLegalHolds,
        released: releasedLegalHolds
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
