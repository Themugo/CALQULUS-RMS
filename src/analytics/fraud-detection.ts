/**
 * Fraud Detection Analytics
 * 
 * Detects and prevents fraudulent activities including:
 * - Payment fraud (fake payments, chargebacks)
 * - Identity fraud (fake tenant applications)
 * - Rental fraud (subletting, unauthorized occupants)
 * - Application fraud (fake documents, income misrepresentation)
 * - Maintenance fraud (fake claims, inflated costs)
 * - Data anomalies and suspicious patterns
 */

export interface FraudAlert {
  id: string;
  type: FraudType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  entityId: string;
  entityType: 'tenant' | 'property' | 'payment' | 'maintenance' | 'application';
  confidence: number;
  indicators: FraudIndicator[];
  recommendedActions: string[];
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
}

export type FraudType =
  | 'payment_fraud'
  | 'identity_fraud'
  | 'rental_fraud'
  | 'application_fraud'
  | 'maintenance_fraud'
  | 'data_anomaly'
  | 'suspicious_pattern';

export interface FraudIndicator {
  type: string;
  description: string;
  weight: number;
  detected: boolean;
  value: number | string | boolean;
}

export interface TenantProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  unitId: string;
  leaseStart: Date;
  leaseEnd: Date;
  monthlyRent: number;
  paymentHistory: PaymentRecord[];
  applicationData: ApplicationData;
  activityLog: ActivityLog[];
}

export interface PaymentRecord {
  id: string;
  date: Date;
  amount: number;
  method: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded' | 'chargeback';
  ipAddress?: string;
  deviceFingerprint?: string;
  location?: { lat: number; lng: number };
}

export interface ApplicationData {
  submittedAt: Date;
  income: number;
  employment: string;
  employer: string;
  creditScore?: number;
  references: Reference[];
  documents: Document[];
  ipAddress?: string;
  deviceFingerprint?: string;
}

export interface Reference {
  name: string;
  phone: string;
  relationship: string;
  contactDate?: Date;
}

export interface Document {
  type: string;
  uploadedAt: Date;
  verified: boolean;
  verificationScore?: number;
}

export interface ActivityLog {
  timestamp: Date;
  action: string;
  details: string;
  ipAddress?: string;
  location?: { lat: number; lng: number };
}

export interface FraudDetectionResult {
  alerts: FraudAlert[];
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    lowAlerts: number;
  };
  trends: FraudTrend[];
}

export interface FraudTrend {
  type: FraudType;
  count: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentageChange: number;
}

export class FraudDetectionAnalytics {
  private tenantProfiles: Map<string, TenantProfile>;
  private paymentRecords: PaymentRecord[];
  private historicalAlerts: FraudAlert[];
  private riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };

  constructor(
    tenantProfiles: TenantProfile[],
    paymentRecords: PaymentRecord[],
    historicalAlerts: FraudAlert[] = []
  ) {
    this.tenantProfiles = new Map(tenantProfiles.map(t => [t.id, t]));
    this.paymentRecords = paymentRecords;
    this.historicalAlerts = historicalAlerts;
    this.riskThresholds = {
      low: 25,
      medium: 50,
      high: 75,
      critical: 90
    };
  }

  /**
   * Run comprehensive fraud detection
   */
  runFraudDetection(): FraudDetectionResult {
    const alerts: FraudAlert[] = [];

    // Detect payment fraud
    alerts.push(...this.detectPaymentFraud());

    // Detect identity fraud
    alerts.push(...this.detectIdentityFraud());

    // Detect rental fraud
    alerts.push(...this.detectRentalFraud());

    // Detect application fraud
    alerts.push(...this.detectApplicationFraud());

    // Detect maintenance fraud
    alerts.push(...this.detectMaintenanceFraud());

    // Detect data anomalies
    alerts.push(...this.detectDataAnomalies());

    // Detect suspicious patterns
    alerts.push(...this.detectSuspiciousPatterns());

    // Calculate overall risk score
    const riskScore = this.calculateOverallRiskScore(alerts);
    const riskLevel = this.getRiskLevel(riskScore);

    // Generate summary
    const summary = this.generateAlertSummary(alerts);

    // Analyze trends
    const trends = this.analyzeFraudTrends(alerts);

    return {
      alerts,
      riskScore,
      riskLevel,
      summary,
      trends
    };
  }

  /**
   * Detect payment fraud
   */
  private detectPaymentFraud(): FraudAlert[] {
    const alerts: FraudAlert[] = [];

    // Group payments by tenant
    const paymentsByTenant = new Map<string, PaymentRecord[]>();
    this.paymentRecords.forEach(payment => {
      const tenantId = this.findTenantByPayment(payment);
      if (tenantId) {
        const current = paymentsByTenant.get(tenantId) || [];
        paymentsByTenant.set(tenantId, [...current, payment]);
      }
    });

    // Analyze each tenant's payment patterns
    paymentsByTenant.forEach((payments, tenantId) => {
      const indicators: FraudIndicator[] = [];

      // Check for rapid payments (potential money laundering)
      const rapidPayments = this.detectRapidPayments(payments);
      if (rapidPayments.detected) {
        indicators.push(rapidPayments);
      }

      // Check for unusual payment amounts
      const unusualAmounts = this.detectUnusualPaymentAmounts(payments);
      if (unusualAmounts.detected) {
        indicators.push(unusualAmounts);
      }

      // Check for payment method inconsistencies
      const methodInconsistency = this.detectPaymentMethodInconsistency(payments);
      if (methodInconsistency.detected) {
        indicators.push(methodInconsistency);
      }

      // Check for geographic inconsistencies
      const geographicInconsistency = this.detectGeographicInconsistency(payments);
      if (geographicInconsistency.detected) {
        indicators.push(geographicInconsistency);
      }

      // Check for chargebacks
      const chargebacks = payments.filter(p => p.status === 'chargeback');
      if (chargebacks.length > 0) {
        indicators.push({
          type: 'chargeback_detected',
          description: `${chargebacks.length} chargeback(s) detected`,
          weight: 40,
          detected: true,
          value: chargebacks.length
        });
      }

      // Create alert if indicators exceed threshold
      if (indicators.length >= 2 || indicators.reduce((sum, i) => sum + i.weight, 0) > 50) {
        alerts.push({
          id: `fraud-${Date.now()}-${tenantId}`,
          type: 'payment_fraud',
          severity: this.getAlertSeverity(indicators),
          description: 'Suspicious payment activity detected',
          detectedAt: new Date(),
          entityId: tenantId,
          entityType: 'tenant',
          confidence: this.calculateConfidence(indicators),
          indicators,
          recommendedActions: [
            'Review payment history with tenant',
            'Verify payment methods and sources',
            'Consider additional verification for future payments',
            'Monitor for additional suspicious activity'
          ],
          status: 'open'
        });
      }
    });

    return alerts;
  }

  /**
   * Detect identity fraud
   */
  private detectIdentityFraud(): FraudAlert[] {
    const alerts: FraudAlert[] = [];

    this.tenantProfiles.forEach((tenant, tenantId) => {
      const indicators: FraudIndicator[] = [];

      // Check for duplicate applications
      const duplicateApplications = this.detectDuplicateApplications(tenant);
      if (duplicateApplications.detected) {
        indicators.push(duplicateApplications);
      }

      // Check for inconsistent personal information
      const inconsistentInfo = this.detectInconsistentPersonalInfo(tenant);
      if (inconsistentInfo.detected) {
        indicators.push(inconsistentInfo);
      }

      // Check for suspicious document patterns
      const suspiciousDocuments = this.detectSuspiciousDocuments(tenant);
      if (suspiciousDocuments.detected) {
        indicators.push(suspiciousDocuments);
      }

      // Check for reference validation issues
      const referenceIssues = this.detectReferenceIssues(tenant);
      if (referenceIssues.detected) {
        indicators.push(referenceIssues);
      }

      // Create alert if indicators exceed threshold
      if (indicators.length >= 2 || indicators.reduce((sum, i) => sum + i.weight, 0) > 50) {
        alerts.push({
          id: `fraud-${Date.now()}-${tenantId}`,
          type: 'identity_fraud',
          severity: this.getAlertSeverity(indicators),
          description: 'Potential identity fraud detected',
          detectedAt: new Date(),
          entityId: tenantId,
          entityType: 'tenant',
          confidence: this.calculateConfidence(indicators),
          indicators,
          recommendedActions: [
            'Verify identity documents with issuing authorities',
            'Contact references directly',
            'Request additional verification',
            'Consider in-person verification'
          ],
          status: 'open'
        });
      }
    });

    return alerts;
  }

  /**
   * Detect rental fraud
   */
  private detectRentalFraud(): FraudAlert[] {
    const alerts: FraudAlert[] = [];

    this.tenantProfiles.forEach((tenant, tenantId) => {
      const indicators: FraudIndicator[] = [];

      // Check for unusual activity patterns
      const unusualActivity = this.detectUnusualActivity(tenant);
      if (unusualActivity.detected) {
        indicators.push(unusualActivity);
      }

      // Check for subletting indicators
      const sublettingIndicators = this.detectSublettingIndicators(tenant);
      if (sublettingIndicators.detected) {
        indicators.push(sublettingIndicators);
      }

      // Check for unauthorized occupancy
      const unauthorizedOccupancy = this.detectUnauthorizedOccupancy(tenant);
      if (unauthorizedOccupancy.detected) {
        indicators.push(unauthorizedOccupancy);
      }

      // Create alert if indicators exceed threshold
      if (indicators.length >= 2 || indicators.reduce((sum, i) => sum + i.weight, 0) > 50) {
        alerts.push({
          id: `fraud-${Date.now()}-${tenantId}`,
          type: 'rental_fraud',
          severity: this.getAlertSeverity(indicators),
          description: 'Potential rental fraud detected',
          detectedAt: new Date(),
          entityId: tenantId,
          entityType: 'tenant',
          confidence: this.calculateConfidence(indicators),
          indicators,
          recommendedActions: [
            'Conduct property inspection',
            'Verify occupancy with neighbors',
            'Review lease agreement compliance',
            'Consider legal action if confirmed'
          ],
          status: 'open'
        });
      }
    });

    return alerts;
  }

  /**
   * Detect application fraud
   */
  private detectApplicationFraud(): FraudAlert[] {
    const alerts: FraudAlert[] = [];

    this.tenantProfiles.forEach((tenant, tenantId) => {
      const indicators: FraudIndicator[] = [];

      // Check for income misrepresentation
      const incomeMisrepresentation = this.detectIncomeMisrepresentation(tenant);
      if (incomeMisrepresentation.detected) {
        indicators.push(incomeMisrepresentation);
      }

      // Check for employment verification issues
      const employmentIssues = this.detectEmploymentIssues(tenant);
      if (employmentIssues.detected) {
        indicators.push(employmentIssues);
      }

      // Check for fake references
      const fakeReferences = this.detectFakeReferences(tenant);
      if (fakeReferences.detected) {
        indicators.push(fakeReferences);
      }

      // Create alert if indicators exceed threshold
      if (indicators.length >= 2 || indicators.reduce((sum, i) => sum + i.weight, 0) > 50) {
        alerts.push({
          id: `fraud-${Date.now()}-${tenantId}`,
          type: 'application_fraud',
          severity: this.getAlertSeverity(indicators),
          description: 'Potential application fraud detected',
          detectedAt: new Date(),
          entityId: tenantId,
          entityType: 'tenant',
          confidence: this.calculateConfidence(indicators),
          indicators,
          recommendedActions: [
            'Verify income with employer directly',
            'Contact all references',
            'Request additional documentation',
            'Consider background check'
          ],
          status: 'open'
        });
      }
    });

    return alerts;
  }

  /**
   * Detect maintenance fraud
   */
  private detectMaintenanceFraud(): FraudAlert[] {
    const alerts: FraudAlert[] = [];

    // This would analyze maintenance requests and payments
    // For now, we'll create a placeholder implementation

    return alerts;
  }

  /**
   * Detect data anomalies
   */
  private detectDataAnomalies(): FraudAlert[] {
    const alerts: FraudAlert[] = [];

    // Check for statistical anomalies in payment amounts
    const paymentAnomalies = this.detectPaymentAmountAnomalies();
    alerts.push(...paymentAnomalies);

    // Check for timing anomalies
    const timingAnomalies = this.detectTimingAnomalies();
    alerts.push(...timingAnomalies);

    return alerts;
  }

  /**
   * Detect suspicious patterns
   */
  private detectSuspiciousPatterns(): FraudAlert[] {
    const alerts: FraudAlert[] = [];

    // Check for coordinated activity patterns
    const coordinatedPatterns = this.detectCoordinatedPatterns();
    alerts.push(...coordinatedPatterns);

    // Check for bot-like behavior
    const botPatterns = this.detectBotPatterns();
    alerts.push(...botPatterns);

    return alerts;
  }

  /**
   * Helper: Find tenant by payment
   */
  private findTenantByPayment(payment: PaymentRecord): string | null {
    for (const [tenantId, tenant] of this.tenantProfiles) {
      if (tenant.paymentHistory.some(p => p.id === payment.id)) {
        return tenantId;
      }
    }
    return null;
  }

  /**
   * Helper: Detect rapid payments
   */
  private detectRapidPayments(payments: PaymentRecord[]): FraudIndicator {
    const sortedPayments = [...payments].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    for (let i = 2; i < sortedPayments.length; i++) {
      const timeDiff1 = sortedPayments[i].date.getTime() - sortedPayments[i - 1].date.getTime();
      const timeDiff2 = sortedPayments[i - 1].date.getTime() - sortedPayments[i - 2].date.getTime();
      
      // Check if 3 payments within 1 hour
      if (timeDiff1 < 3600000 && timeDiff2 < 3600000) {
        return {
          type: 'rapid_payments',
          description: 'Multiple rapid payments detected (potential money laundering)',
          weight: 35,
          detected: true,
          value: 3
        };
      }
    }

    return {
      type: 'rapid_payments',
      description: 'No rapid payments detected',
      weight: 0,
      detected: false,
      value: 0
    };
  }

  /**
   * Helper: Detect unusual payment amounts
   */
  private detectUnusualPaymentAmounts(payments: PaymentRecord[]): FraudIndicator {
    const amounts = payments.map(p => p.amount);
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length);

    const unusualPayments = payments.filter(p => Math.abs(p.amount - avgAmount) > 2 * stdDev);

    if (unusualPayments.length > 0) {
      return {
        type: 'unusual_amounts',
        description: `${unusualPayments.length} payment(s) with unusual amounts detected`,
        weight: 25,
        detected: true,
        value: unusualPayments.length
      };
    }

    return {
      type: 'unusual_amounts',
      description: 'No unusual payment amounts detected',
      weight: 0,
      detected: false,
      value: 0
    };
  }

  /**
   * Helper: Detect payment method inconsistency
   */
  private detectPaymentMethodInconsistency(payments: PaymentRecord[]): FraudIndicator {
    const methods = new Set(payments.map(p => p.method));
    
    if (methods.size > 3) {
      return {
        type: 'method_inconsistency',
        description: `Unusual number of payment methods: ${methods.size}`,
        weight: 20,
        detected: true,
        value: methods.size
      };
    }

    return {
      type: 'method_inconsistency',
      description: 'Payment methods consistent',
      weight: 0,
      detected: false,
      value: methods.size
    };
  }

  /**
   * Helper: Detect geographic inconsistency
   */
  private detectGeographicInconsistency(payments: PaymentRecord[]): FraudIndicator {
    const locations = payments.filter(p => p.location).map(p => p.location!);
    
    if (locations.length < 2) {
      return {
        type: 'geographic_inconsistency',
        description: 'Insufficient location data',
        weight: 0,
        detected: false,
        value: 0
      };
    }

    // Calculate distances between consecutive payments
    let maxDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      const distance = this.calculateDistance(locations[i - 1], locations[i]);
      maxDistance = Math.max(maxDistance, distance);
    }

    // If max distance > 500km within short time, flag as suspicious
    if (maxDistance > 500) {
      return {
        type: 'geographic_inconsistency',
        description: `Suspicious geographic pattern: ${maxDistance.toFixed(0)}km between payments`,
        weight: 30,
        detected: true,
        value: maxDistance
      };
    }

    return {
      type: 'geographic_inconsistency',
      description: 'Geographic pattern normal',
      weight: 0,
      detected: false,
      value: maxDistance
    };
  }

  /**
   * Helper: Calculate distance between two points
   */
  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Helper: Detect duplicate applications
   */
  private detectDuplicateApplications(tenant: TenantProfile): FraudIndicator {
    // Check for similar profiles (same email, phone, etc.)
    const similarProfiles = Array.from(this.tenantProfiles.values()).filter(
      t => t.id !== tenant.id && 
           (t.email === tenant.email || t.phone === tenant.phone)
    );

    if (similarProfiles.length > 0) {
      return {
        type: 'duplicate_applications',
        description: `${similarProfiles.length} duplicate application(s) detected`,
        weight: 45,
        detected: true,
        value: similarProfiles.length
      };
    }

    return {
      type: 'duplicate_applications',
      description: 'No duplicate applications detected',
      weight: 0,
      detected: false,
      value: 0
    };
  }

  /**
   * Helper: Detect inconsistent personal information
   */
  private detectInconsistentPersonalInfo(tenant: TenantProfile): FraudIndicator {
    // Check for inconsistencies in activity log
    const inconsistencies = tenant.activityLog.filter(log => 
      log.action.includes('inconsistent') || log.action.includes('mismatch')
    );

    if (inconsistencies.length > 0) {
      return {
        type: 'inconsistent_info',
        description: `${inconsistencies.length} information inconsistency(ies) detected`,
        weight: 30,
        detected: true,
        value: inconsistencies.length
      };
    }

    return {
      type: 'inconsistent_info',
      description: 'Personal information consistent',
      weight: 0,
      detected: false,
      value: 0
    };
  }

  /**
   * Helper: Detect suspicious documents
   */
  private detectSuspiciousDocuments(tenant: TenantProfile): FraudIndicator {
    const unverifiedDocs = tenant.applicationData.documents.filter(d => !d.verified);
    const lowScoreDocs = tenant.applicationData.documents.filter(d => d.verificationScore && d.verificationScore < 70);

    if (unverifiedDocs.length > 2 || lowScoreDocs.length > 1) {
      return {
        type: 'suspicious_documents',
        description: `${unverifiedDocs.length} unverified, ${lowScoreDocs.length} low-score document(s)`,
        weight: 35,
        detected: true,
        value: unverifiedDocs.length + lowScoreDocs.length
      };
    }

    return {
      type: 'suspicious_documents',
      description: 'Documents appear legitimate',
      weight: 0,
      detected: false,
      value: 0
    };
  }

  /**
   * Helper: Detect reference issues
   */
  private detectReferenceIssues(tenant: TenantProfile): FraudIndicator {
    const uncontactedReferences = tenant.applicationData.references.filter(r => !r.contactDate);

    if (uncontactedReferences.length > 0) {
      return {
        type: 'reference_issues',
        description: `${uncontactedReferences.length} reference(s) not contacted`,
        weight: 20,
        detected: true,
        value: uncontactedReferences.length
      };
    }

    return {
      type: 'reference_issues',
      description: 'References verified',
      weight: 0,
      detected: false,
      value: 0
    };
  }

  /**
   * Helper: Detect unusual activity
   */
  private detectUnusualActivity(tenant: TenantProfile): FraudIndicator {
    // Check for unusual login patterns, access times, etc.
    const unusualActivity = tenant.activityLog.filter(log => 
      log.action.includes('unusual') || log.action.includes('suspicious')
    );

    if (unusualActivity.length > 0) {
      return {
        type: 'unusual_activity',
        description: `${unusualActivity.length} unusual activity event(s) detected`,
        weight: 25,
        detected: true,
        value: unusualActivity.length
      };
    }

    return {
      type: 'unusual_activity',
      description: 'Activity patterns normal',
      weight: 0,
      detected: false,
      value: 0
    };
  }

  /**
   * Helper: Detect subletting indicators
   */
  private detectSublettingIndicators(tenant: TenantProfile): FraudIndicator {
    // Check for signs of subletting (multiple payment sources, etc.)
    const paymentSources = new Set(tenant.paymentHistory.map(p => p.method));
    
    if (paymentSources.size > 2) {
      return {
        type: 'subletting_indicators',
        description: `Multiple payment sources detected (${paymentSources.size})`,
        weight: 30,
        detected: true,
        value: paymentSources.size
      };
    }

    return {
      type: 'subletting_indicators',
      description: 'No subletting indicators detected',
      weight: 0,
      detected: false,
      value: paymentSources.size
    };
  }

  /**
   * Helper: Detect unauthorized occupancy
   */
  private detectUnauthorizedOccupancy(tenant: TenantProfile): FraudIndicator {
    // This would check for signs of unauthorized occupants
    // For now, we'll return a placeholder
    return {
      type: 'unauthorized_occupancy',
      description: 'No unauthorized occupancy detected',
      weight: 0,
      detected: false,
      value: 0
    };
  }

  /**
   * Helper: Detect income misrepresentation
   */
  private detectIncomeMisrepresentation(tenant: TenantProfile): FraudIndicator {
    // Compare stated income with payment patterns
    const monthlyPayments = tenant.paymentHistory.filter(p => p.status === 'completed').length;
    const avgMonthlyPayment = tenant.paymentHistory
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0) / Math.max(monthlyPayments, 1);

    const incomeToRentRatio = tenant.applicationData.income / tenant.monthlyRent;

    if (incomeToRentRatio < 2.5) {
      return {
        type: 'income_misrepresentation',
        description: `Income-to-rent ratio low: ${incomeToRentRatio.toFixed(2)}`,
        weight: 25,
        detected: true,
        value: incomeToRentRatio
      };
    }

    return {
      type: 'income_misrepresentation',
      description: 'Income appears consistent with rent',
      weight: 0,
      detected: false,
      value: incomeToRentRatio
    };
  }

  /**
   * Helper: Detect employment issues
   */
  private detectEmploymentIssues(tenant: TenantProfile): FraudIndicator {
    // Check for employment verification issues
    const employmentVerification = tenant.activityLog.find(log => 
      log.action.includes('employment') && log.action.includes('failed')
    );

    if (employmentVerification) {
      return {
        type: 'employment_issues',
        description: 'Employment verification failed',
        weight: 35,
        detected: true,
        value: true
      };
    }

    return {
      type: 'employment_issues',
      description: 'Employment verified',
      weight: 0,
      detected: false,
      value: false
    };
  }

  /**
   * Helper: Detect fake references
   */
  private detectFakeReferences(tenant: TenantProfile): FraudIndicator {
    // Check for suspicious reference patterns
    const suspiciousReferences = tenant.applicationData.references.filter(ref => {
      // Check if reference phone number matches tenant phone
      return ref.phone === tenant.phone;
    });

    if (suspiciousReferences.length > 0) {
      return {
        type: 'fake_references',
        description: `${suspiciousReferences.length} suspicious reference(s) detected`,
        weight: 40,
        detected: true,
        value: suspiciousReferences.length
      };
    }

    return {
      type: 'fake_references',
      description: 'References appear legitimate',
      weight: 0,
      detected: false,
      value: 0
    };
  }

  /**
   * Helper: Detect payment amount anomalies
   */
  private detectPaymentAmountAnomalies(): FraudAlert[] {
    const alerts: FraudAlert[] = [];
    const amounts = this.paymentRecords.map(p => p.amount);
    
    if (amounts.length < 10) return alerts;

    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length);

    const anomalies = this.paymentRecords.filter(p => Math.abs(p.amount - avgAmount) > 3 * stdDev);

    anomalies.forEach(anomaly => {
      const tenantId = this.findTenantByPayment(anomaly);
      if (tenantId) {
        alerts.push({
          id: `fraud-${Date.now()}-${anomaly.id}`,
          type: 'data_anomaly',
          severity: 'medium',
          description: `Payment amount anomaly: ${anomaly.amount} (expected: ${avgAmount.toFixed(2)} ± ${(3 * stdDev).toFixed(2)})`,
          detectedAt: new Date(),
          entityId: anomaly.id,
          entityType: 'payment',
          confidence: 75,
          indicators: [
            {
              type: 'amount_anomaly',
              description: `Payment amount deviates by ${Math.abs(anomaly.amount - avgAmount).toFixed(2)} from mean`,
              weight: 50,
              detected: true,
              value: Math.abs(anomaly.amount - avgAmount)
            }
          ],
          recommendedActions: [
            'Verify payment with tenant',
            'Check for data entry errors',
            'Review payment documentation'
          ],
          status: 'open'
        });
      }
    });

    return alerts;
  }

  /**
   * Helper: Detect timing anomalies
   */
  private detectTimingAnomalies(): FraudAlert[] {
    const alerts: FraudAlert[] = [];
    // Implementation would analyze timing patterns
    return alerts;
  }

  /**
   * Helper: Detect coordinated patterns
   */
  private detectCoordinatedPatterns(): FraudAlert[] {
    const alerts: FraudAlert[] = [];
    // Implementation would detect coordinated fraud attempts
    return alerts;
  }

  /**
   * Helper: Detect bot patterns
   */
  private detectBotPatterns(): FraudAlert[] {
    const alerts: FraudAlert[] = [];
    // Implementation would detect automated/bot activity
    return alerts;
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRiskScore(alerts: FraudAlert[]): number {
    if (alerts.length === 0) return 0;

    const severityWeights = {
      low: 10,
      medium: 30,
      high: 60,
      critical: 90
    };

    const weightedSum = alerts.reduce((sum, alert) => {
      return sum + (severityWeights[alert.severity] * (alert.confidence / 100));
    }, 0);

    return Math.min(weightedSum / alerts.length, 100);
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < this.riskThresholds.low) return 'low';
    if (score < this.riskThresholds.medium) return 'medium';
    if (score < this.riskThresholds.high) return 'high';
    return 'critical';
  }

  /**
   * Get alert severity from indicators
   */
  private getAlertSeverity(indicators: FraudIndicator[]): 'low' | 'medium' | 'high' | 'critical' {
    const totalWeight = indicators.reduce((sum, i) => sum + i.weight, 0);
    
    if (totalWeight < 30) return 'low';
    if (totalWeight < 60) return 'medium';
    if (totalWeight < 90) return 'high';
    return 'critical';
  }

  /**
   * Calculate confidence from indicators
   */
  private calculateConfidence(indicators: FraudIndicator[]): number {
    if (indicators.length === 0) return 0;
    
    const avgWeight = indicators.reduce((sum, i) => sum + i.weight, 0) / indicators.length;
    return Math.min(avgWeight + (indicators.length * 5), 95);
  }

  /**
   * Generate alert summary
   */
  private generateAlertSummary(alerts: FraudAlert[]) {
    return {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      highAlerts: alerts.filter(a => a.severity === 'high').length,
      mediumAlerts: alerts.filter(a => a.severity === 'medium').length,
      lowAlerts: alerts.filter(a => a.severity === 'low').length
    };
  }

  /**
   * Analyze fraud trends
   */
  private analyzeFraudTrends(alerts: FraudAlert[]): FraudTrend[] {
    const typeCounts = new Map<FraudType, number>();
    
    alerts.forEach(alert => {
      const current = typeCounts.get(alert.type) || 0;
      typeCounts.set(alert.type, current + 1);
    });

    return Array.from(typeCounts.entries()).map(([type, count]) => {
      // Compare with historical data to determine trend
      const historicalCount = this.historicalAlerts.filter(a => a.type === type).length;
      const percentageChange = historicalCount > 0 
        ? ((count - historicalCount) / historicalCount) * 100 
        : 0;

      const trend = percentageChange > 10 ? 'increasing' : percentageChange < -10 ? 'decreasing' : 'stable';

      return {
        type,
        count,
        trend,
        percentageChange
      };
    });
  }

  /**
   * Update alert status
   */
  updateAlertStatus(alertId: string, status: FraudAlert['status']): void {
    const alert = this.historicalAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = status;
    }
  }

  /**
   * Get fraud statistics
   */
  getFraudStatistics(): {
    totalAlerts: number;
    resolvedAlerts: number;
    openAlerts: number;
    falsePositives: number;
    averageResolutionTime: number;
    fraudByType: Record<FraudType, number>;
  } {
    const totalAlerts = this.historicalAlerts.length;
    const resolvedAlerts = this.historicalAlerts.filter(a => a.status === 'resolved').length;
    const openAlerts = this.historicalAlerts.filter(a => a.status === 'open').length;
    const falsePositives = this.historicalAlerts.filter(a => a.status === 'false_positive').length;
    
    // Calculate average resolution time (simplified)
    const resolvedAlertsWithTime = this.historicalAlerts.filter(a => a.status === 'resolved');
    const averageResolutionTime = resolvedAlertsWithTime.length > 0 
      ? 72 // Placeholder: 72 hours average
      : 0;

    const fraudByType = this.historicalAlerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<FraudType, number>);

    return {
      totalAlerts,
      resolvedAlerts,
      openAlerts,
      falsePositives,
      averageResolutionTime,
      fraudByType
    };
  }
}
