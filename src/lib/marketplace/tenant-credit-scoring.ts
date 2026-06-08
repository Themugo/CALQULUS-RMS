/**
 * Tenant Credit Scoring
 * 
 * Implements tenant credit scoring integration with:
 * - Credit bureau integration
 * - Credit score retrieval
 * - Credit report generation
 * - Risk assessment
 * - Identity verification
 * - Background checks
 * - Score normalization
 */

// Credit bureau
export interface CreditBureau {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKey?: string;
  supportedCountries: string[];
  isActive: boolean;
}

// Credit score
export interface CreditScore {
  id: string;
  tenantId: string;
  bureauId: string;
  score: number; // 300-850
  scoreDate: Date;
  factors: CreditScoreFactor[];
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
}

// Credit score factor
export interface CreditScoreFactor {
  name: string;
  impact: number; // -100 to 100
  description: string;
}

// Credit report
export interface CreditReport {
  id: string;
  tenantId: string;
  bureauId: string;
  reportDate: Date;
  creditScore: number;
  paymentHistory: PaymentHistory;
  accounts: CreditAccount[];
  inquiries: CreditInquiry[];
  publicRecords: PublicRecord[];
  status: 'clean' | 'warning' | 'high_risk';
}

// Payment history
export interface PaymentHistory {
  onTimePayments: number;
  latePayments: number;
  missedPayments: number;
  late30Days: number;
  late60Days: number;
  late90Days: number;
  collections: number;
}

// Credit account
export interface CreditAccount {
  id: string;
  type: 'credit_card' | 'loan' | 'mortgage' | 'other';
  accountNumber: string;
  balance: number;
  creditLimit?: number;
  paymentStatus: 'current' | 'late' | 'default';
  openedDate: Date;
  closedDate?: Date;
}

// Credit inquiry
export interface CreditInquiry {
  id: string;
  type: 'hard' | 'soft';
  date: Date;
  creditor: string;
  purpose: string;
}

// Public record
export interface PublicRecord {
  id: string;
  type: 'bankruptcy' | 'foreclosure' | 'tax_lien' | 'judgment' | 'other';
  date: Date;
  amount?: number;
  status: 'active' | 'released' | 'satisfied';
}

// Identity verification
export interface IdentityVerification {
  id: string;
  tenantId: string;
  verificationDate: Date;
  status: 'verified' | 'pending' | 'failed';
  method: 'document' | 'biometric' | 'database';
  verifiedFields: string[];
  confidence: number; // 0-1
}

/**
 * Create credit score
 */
export function createCreditScore(
  tenantId: string,
  bureauId: string,
  score: number,
  factors: CreditScoreFactor[]
): CreditScore {
  const status = determineScoreStatus(score);
  
  return {
    id: `credit_score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    bureauId,
    score,
    scoreDate: new Date(),
    factors,
    status,
  };
}

/**
 * Determine score status
 */
function determineScoreStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor' {
  if (score >= 750) {
    return 'excellent';
  } else if (score >= 700) {
    return 'good';
  } else if (score >= 650) {
    return 'fair';
  } else if (score >= 600) {
    return 'poor';
  } else {
    return 'very_poor';
  }
}

/**
 * Fetch credit score from bureau
 */
export async function fetchCreditScore(
  _tenantId: string,
  _bureau: CreditBureau
): Promise<CreditScore | null> {
  // In production, this would call the credit bureau's API
  // For now, we'll simulate the fetch
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return null to indicate no score available (simulation)
    return null;
  } catch (error) {
    console.error('Failed to fetch credit score:', error);
    return null;
  }
}

/**
 * Generate credit report
 */
export function generateCreditReport(
  tenantId: string,
  bureauId: string,
  creditScore: CreditScore,
  paymentHistory: PaymentHistory,
  accounts: CreditAccount[],
  inquiries: CreditInquiry[],
  publicRecords: PublicRecord[]
): CreditReport {
  const status = determineReportStatus(paymentHistory, publicRecords);
  
  return {
    id: `credit_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    bureauId,
    reportDate: new Date(),
    creditScore: creditScore.score,
    paymentHistory,
    accounts,
    inquiries,
    publicRecords,
    status,
  };
}

/**
 * Determine report status
 */
function determineReportStatus(
  paymentHistory: PaymentHistory,
  publicRecords: PublicRecord[]
): 'clean' | 'warning' | 'high_risk' {
  // Check for severe issues
  if (publicRecords.some(r => r.type === 'bankruptcy' || r.type === 'foreclosure')) {
    return 'high_risk';
  }
  
  if (paymentHistory.collections > 0 || paymentHistory.missedPayments > 3) {
    return 'high_risk';
  }
  
  if (paymentHistory.late90Days > 0 || paymentHistory.late60Days > 2) {
    return 'warning';
  }
  
  return 'clean';
}

/**
 * Verify identity
 */
export async function verifyIdentity(
  tenantId: string,
  method: 'document' | 'biometric' | 'database',
  _documents?: string[]
): Promise<IdentityVerification> {
  // In production, this would call an identity verification service
  // For now, we'll simulate the verification
  
  try {
    // Simulate verification process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const verifiedFields = ['name', 'date_of_birth', 'national_id'];
    
    return {
      id: `identity_verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      verificationDate: new Date(),
      status: 'verified',
      method,
      verifiedFields,
      confidence: 0.95,
    };
  } catch (error) {
    console.error('Failed to verify identity:', error);
    
    return {
      id: `identity_verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      verificationDate: new Date(),
      status: 'failed',
      method,
      verifiedFields: [],
      confidence: 0,
    };
  }
}

/**
 * Perform background check
 */
export async function performBackgroundCheck(
  _tenantId: string,
  _checks: Array<'criminal' | 'eviction' | 'employment' | 'education'>
): Promise<{
  criminal: { status: 'clear' | 'flagged'; details?: string };
  eviction: { status: 'clear' | 'flagged'; details?: string };
  employment: { status: 'verified' | 'unverified'; details?: string };
  education: { status: 'verified' | 'unverified'; details?: string };
}> {
  // In production, this would call background check services
  // For now, we'll simulate the check
  
  try {
    // Simulate background check
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return {
      criminal: { status: 'clear' },
      eviction: { status: 'clear' },
      employment: { status: 'verified' },
      education: { status: 'verified' },
    };
  } catch (error) {
    console.error('Failed to perform background check:', error);
    
    return {
      criminal: { status: 'flagged', details: 'Background check failed' },
      eviction: { status: 'flagged', details: 'Background check failed' },
      employment: { status: 'unverified', details: 'Background check failed' },
      education: { status: 'unverified', details: 'Background check failed' },
    };
  }
}

/**
 * Normalize credit score
 */
export function normalizeCreditScore(
  score: number,
  sourceBureau: string,
  targetBureau: string
): number {
  // Different bureaus use different score ranges
  // This function normalizes scores between bureaus
  
  const sourceRanges: Record<string, { min: number; max: number }> = {
    transunion: { min: 300, max: 850 },
    equifax: { min: 280, max: 850 },
    experian: { min: 330, max: 830 },
    default: { min: 300, max: 850 },
  };
  
  const targetRanges: Record<string, { min: number; max: number }> = {
    transunion: { min: 300, max: 850 },
    equifax: { min: 280, max: 850 },
    experian: { min: 330, max: 830 },
    default: { min: 300, max: 850 },
  };
  
  const sourceRange = sourceRanges[sourceBureau] || sourceRanges.default;
  const targetRange = targetRanges[targetBureau] || targetRanges.default;
  
  // Normalize to 0-1 range
  const normalized = (score - sourceRange.min) / (sourceRange.max - sourceRange.min);
  
  // Convert to target range
  const targetScore = normalized * (targetRange.max - targetRange.min) + targetRange.min;
  
  return Math.round(targetScore);
}

/**
 * Calculate credit risk score
 */
export function calculateCreditRiskScore(
  creditScore: CreditScore,
  paymentHistory: PaymentHistory,
  publicRecords: PublicRecord[]
): {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  factors: string[];
} {
  let riskScore = 0;
  const factors: string[] = [];
  
  // Credit score impact
  if (creditScore.score < 600) {
    riskScore += 30;
    factors.push('Low credit score');
  } else if (creditScore.score < 650) {
    riskScore += 20;
    factors.push('Below average credit score');
  } else if (creditScore.score >= 750) {
    riskScore -= 20;
    factors.push('Excellent credit score');
  }
  
  // Payment history impact
  if (paymentHistory.missedPayments > 0) {
    riskScore += paymentHistory.missedPayments * 10;
    factors.push(`${paymentHistory.missedPayments} missed payments`);
  }
  
  if (paymentHistory.collections > 0) {
    riskScore += paymentHistory.collections * 15;
    factors.push(`${paymentHistory.collections} collections`);
  }
  
  // Public records impact
  for (const record of publicRecords) {
    if (record.type === 'bankruptcy') {
      riskScore += 40;
      factors.push('Bankruptcy on record');
    } else if (record.type === 'foreclosure') {
      riskScore += 35;
      factors.push('Foreclosure on record');
    } else if (record.type === 'tax_lien') {
      riskScore += 25;
      factors.push('Tax lien on record');
    }
  }
  
  // Ensure score is between 0 and 100
  riskScore = Math.max(0, Math.min(100, riskScore));
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  if (riskScore < 20) {
    riskLevel = 'low';
  } else if (riskScore < 40) {
    riskLevel = 'medium';
  } else if (riskScore < 60) {
    riskLevel = 'high';
  } else {
    riskLevel = 'very_high';
  }
  
  return {
    riskScore,
    riskLevel,
    factors,
  };
}

/**
 * Get credit score status label
 */
export function getCreditScoreStatusLabel(status: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor'): string {
  const labels: Record<'excellent' | 'good' | 'fair' | 'poor' | 'very_poor', string> = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
    very_poor: 'Very Poor',
  };

  return labels[status];
}

/**
 * Get credit report status label
 */
export function getCreditReportStatusLabel(status: 'clean' | 'warning' | 'high_risk'): string {
  const labels: Record<'clean' | 'warning' | 'high_risk', string> = {
    clean: 'Clean',
    warning: 'Warning',
    high_risk: 'High Risk',
  };

  return labels[status];
}

/**
 * Get credit statistics
 */
export function getCreditStatistics(
  creditScores: CreditScore[],
  creditReports: CreditReport[]
): {
  totalScores: number;
  averageScore: number;
  byStatus: Record<'excellent' | 'good' | 'fair' | 'poor' | 'very_poor', number>;
  byReportStatus: Record<'clean' | 'warning' | 'high_risk', number>;
  highRiskCount: number;
} {
  const averageScore = creditScores.length > 0
    ? creditScores.reduce((sum, s) => sum + s.score, 0) / creditScores.length
    : 0;
  
  const byStatus: Record<'excellent' | 'good' | 'fair' | 'poor' | 'very_poor', number> = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    very_poor: 0,
  };
  
  const byReportStatus: Record<'clean' | 'warning' | 'high_risk', number> = {
    clean: 0,
    warning: 0,
    high_risk: 0,
  };
  
  for (const score of creditScores) {
    byStatus[score.status]++;
  }
  
  for (const report of creditReports) {
    byReportStatus[report.status]++;
  }
  
  const highRiskCount = creditReports.filter(r => r.status === 'high_risk').length;
  
  return {
    totalScores: creditScores.length,
    averageScore,
    byStatus,
    byReportStatus,
    highRiskCount,
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount);
}
