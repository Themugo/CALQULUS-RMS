/**
 * Tenant Risk Scoring
 * 
 * Implements comprehensive tenant risk assessment with:
 * - Credit history analysis
 * - Payment behavior scoring
 * - Background check integration
 * - Rental history evaluation
 * - Income verification
 * - Risk category classification
 */

// Risk category
export enum RiskCategory {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Risk factor
export interface RiskFactor {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  impact: string;
  category: 'financial' | 'behavioral' | 'background' | 'references';
}

// Tenant risk profile
export interface TenantRiskProfile {
  tenantId: string;
  tenantName: string;
  overallScore: number; // 0-100
  riskCategory: RiskCategory;
  factors: RiskFactor[];
  recommendedActions: string[];
  approvalStatus: 'approved' | 'conditional' | 'rejected' | 'review_required';
  assessmentDate: Date;
}

// Credit history
export interface CreditHistory {
  creditScore: number;
  latePayments: number;
  defaults: number;
  bankruptcies: number;
  inquiries: number;
}

// Rental history
export interface RentalHistory {
  previousLandlords: number;
  evictions: number;
  lateRentPayments: number;
  propertyDamage: boolean;
  positiveReferences: number;
}

// Employment verification
export interface EmploymentVerification {
  isEmployed: boolean;
  employmentDuration: number; // months
  income: number;
  incomeVerified: boolean;
}

/**
 * Calculate tenant risk score
 */
export function calculateTenantRiskScore(
  tenantId: string,
  tenantName: string,
  creditHistory: CreditHistory,
  rentalHistory: RentalHistory,
  employmentVerification: EmploymentVerification
): TenantRiskProfile {
  const factors = analyzeRiskFactors(creditHistory, rentalHistory, employmentVerification);
  const overallScore = calculateOverallScore(factors);
  const riskCategory = determineRiskCategory(overallScore);
  const recommendedActions = generateRecommendedActions(riskCategory, factors);
  const approvalStatus = determineApprovalStatus(riskCategory, factors);
  
  return {
    tenantId,
    tenantName,
    overallScore,
    riskCategory,
    factors,
    recommendedActions,
    approvalStatus,
    assessmentDate: new Date(),
  };
}

/**
 * Analyze risk factors
 */
function analyzeRiskFactors(
  creditHistory: CreditHistory,
  rentalHistory: RentalHistory,
  employmentVerification: EmploymentVerification
): RiskFactor[] {
  const factors: RiskFactor[] = [];
  
  // Credit score factor
  const creditScoreFactor = calculateCreditScoreFactor(creditHistory);
  factors.push(creditScoreFactor);
  
  // Payment history factor
  const paymentHistoryFactor = calculatePaymentHistoryFactor(creditHistory);
  factors.push(paymentHistoryFactor);
  
  // Rental history factor
  const rentalHistoryFactor = calculateRentalHistoryFactor(rentalHistory);
  factors.push(rentalHistoryFactor);
  
  // Employment factor
  const employmentFactor = calculateEmploymentFactor(employmentVerification);
  factors.push(employmentFactor);
  
  // Income factor
  const incomeFactor = calculateIncomeFactor(employmentVerification);
  factors.push(incomeFactor);
  
  return factors;
}

/**
 * Calculate credit score factor
 */
function calculateCreditScoreFactor(creditHistory: CreditHistory): RiskFactor {
  let score = 0;
  let impact = '';
  
  if (creditHistory.creditScore >= 750) {
    score = 100;
    impact = 'Excellent credit score indicates low risk';
  } else if (creditHistory.creditScore >= 700) {
    score = 85;
    impact = 'Good credit score indicates low risk';
  } else if (creditHistory.creditScore >= 650) {
    score = 70;
    impact = 'Fair credit score indicates moderate risk';
  } else if (creditHistory.creditScore >= 600) {
    score = 50;
    impact = 'Poor credit score indicates elevated risk';
  } else {
    score = 25;
    impact = 'Very poor credit score indicates high risk';
  }
  
  // Adjust for defaults and bankruptcies
  score -= creditHistory.defaults * 15;
  score -= creditHistory.bankruptcies * 30;
  
  return {
    name: 'Credit Score',
    score: Math.max(0, score),
    weight: 0.3,
    impact,
    category: 'financial',
  };
}

/**
 * Calculate payment history factor
 */
function calculatePaymentHistoryFactor(creditHistory: CreditHistory): RiskFactor {
  let score = 100;
  let impact = '';
  
  // Deduct for late payments
  score -= creditHistory.latePayments * 10;
  
  if (creditHistory.latePayments === 0) {
    impact = 'No late payments indicates reliable payment behavior';
  } else if (creditHistory.latePayments <= 2) {
    impact = 'Few late payments, acceptable risk';
  } else if (creditHistory.latePayments <= 5) {
    impact = 'Multiple late payments indicate payment reliability concerns';
  } else {
    impact = 'High number of late payments indicates significant payment risk';
  }
  
  return {
    name: 'Payment History',
    score: Math.max(0, score),
    weight: 0.25,
    impact,
    category: 'financial',
  };
}

/**
 * Calculate rental history factor
 */
function calculateRentalHistoryFactor(rentalHistory: RentalHistory): RiskFactor {
  let score = 50;
  let impact = '';
  
  // Positive for previous rental experience
  if (rentalHistory.previousLandlords > 0) {
    score += 20;
  }
  
  // Positive references
  score += rentalHistory.positiveReferences * 10;
  
  // Negative for evictions
  score -= rentalHistory.evictions * 40;
  
  // Negative for late rent payments
  score -= rentalHistory.lateRentPayments * 15;
  
  // Negative for property damage
  if (rentalHistory.propertyDamage) {
    score -= 30;
  }
  
  if (rentalHistory.evictions > 0) {
    impact = 'Previous evictions indicate high risk';
  } else if (rentalHistory.lateRentPayments > 3) {
    impact = 'History of late rent payments indicates elevated risk';
  } else if (rentalHistory.positiveReferences > 0) {
    impact = 'Positive references indicate reliable tenant';
  } else {
    impact = 'Limited rental history, moderate risk';
  }
  
  return {
    name: 'Rental History',
    score: Math.max(0, Math.min(100, score)),
    weight: 0.2,
    impact,
    category: 'behavioral',
  };
}

/**
 * Calculate employment factor
 */
function calculateEmploymentFactor(employmentVerification: EmploymentVerification): RiskFactor {
  let score = 0;
  let impact = '';
  
  if (!employmentVerification.isEmployed) {
    score = 20;
    impact = 'Unemployed status indicates high risk';
  } else if (employmentVerification.employmentDuration >= 24) {
    score = 100;
    impact = 'Long-term employment indicates stability';
  } else if (employmentVerification.employmentDuration >= 12) {
    score = 85;
    impact = 'Stable employment indicates low risk';
  } else if (employmentVerification.employmentDuration >= 6) {
    score = 70;
    impact = 'Recent employment, moderate risk';
  } else {
    score = 50;
    impact = 'New employment, elevated risk';
  }
  
  return {
    name: 'Employment Stability',
    score,
    weight: 0.15,
    impact,
    category: 'financial',
  };
}

/**
 * Calculate income factor
 */
function calculateIncomeFactor(employmentVerification: EmploymentVerification): RiskFactor {
  let score = 50;
  let impact = '';
  
  if (!employmentVerification.incomeVerified) {
    score = 30;
    impact = 'Income not verified, elevated risk';
  } else if (employmentVerification.income >= 50000) {
    score = 100;
    impact = 'High income indicates strong ability to pay';
  } else if (employmentVerification.income >= 30000) {
    score = 85;
    impact = 'Good income indicates ability to pay';
  } else if (employmentVerification.income >= 20000) {
    score = 70;
    impact = 'Moderate income, acceptable risk';
  } else {
    score = 50;
    impact = 'Low income indicates potential payment difficulties';
  }
  
  return {
    name: 'Income Level',
    score,
    weight: 0.1,
    impact,
    category: 'financial',
  };
}

/**
 * Calculate overall score
 */
function calculateOverallScore(factors: RiskFactor[]): number {
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const factor of factors) {
    weightedSum += factor.score * factor.weight;
    totalWeight += factor.weight;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Determine risk category
 */
function determineRiskCategory(score: number): RiskCategory {
  if (score >= 80) {
    return RiskCategory.LOW;
  } else if (score >= 60) {
    return RiskCategory.MEDIUM;
  } else if (score >= 40) {
    return RiskCategory.HIGH;
  } else {
    return RiskCategory.CRITICAL;
  }
}

/**
 * Generate recommended actions
 */
function generateRecommendedActions(riskCategory: RiskCategory, factors: RiskFactor[]): string[] {
  const actions: string[] = [];
  
  switch (riskCategory) {
    case RiskCategory.LOW:
      actions.push('Standard lease terms acceptable');
      actions.push('Standard security deposit');
      actions.push('Proceed with normal approval process');
      break;
    
    case RiskCategory.MEDIUM:
      actions.push('Consider increased security deposit');
      actions.push('Require guarantor if income is borderline');
      actions.push('Monitor payment behavior closely');
      actions.push('Consider shorter initial lease term');
      break;
    
    case RiskCategory.HIGH:
      actions.push('Require increased security deposit (2x rent)');
      actions.push('Require guarantor or co-signer');
      actions.push('Consider rent payment in advance');
      actions.push('Implement more frequent payment monitoring');
      actions.push('Require additional references');
      break;
    
    case RiskCategory.CRITICAL:
      actions.push('Require substantial security deposit (3x rent)');
      actions.push('Require guarantor with strong credit');
      actions.push('Require rent payment 3 months in advance');
      actions.push('Implement strict payment monitoring');
      actions.push('Consider declining application');
      actions.push('Require additional documentation and verification');
      break;
  }
  
  // Add specific actions based on factors
  for (const factor of factors) {
    if (factor.name === 'Credit Score' && factor.score < 50) {
      actions.push('Request explanation for low credit score');
    }
    
    if (factor.name === 'Rental History' && factor.score < 50) {
      actions.push('Contact previous landlords for detailed references');
    }
    
    if (factor.name === 'Employment Stability' && factor.score < 70) {
      actions.push('Verify employment status regularly');
    }
  }
  
  return actions;
}

/**
 * Determine approval status
 */
function determineApprovalStatus(riskCategory: RiskCategory, factors: RiskFactor[]): 'approved' | 'conditional' | 'rejected' | 'review_required' {
  // Check for critical issues
  const hasEvictions = factors.some(f => f.name === 'Rental History' && f.impact.includes('evictions'));
  const hasBankruptcies = factors.some(f => f.name === 'Credit Score' && f.impact.includes('bankruptcy'));
  const isUnemployed = factors.some(f => f.name === 'Employment Stability' && f.impact.includes('Unemployed'));
  
  if (hasEvictions || hasBankruptcies) {
    return 'rejected';
  }
  
  if (isUnemployed) {
    return 'review_required';
  }
  
  switch (riskCategory) {
    case RiskCategory.LOW:
      return 'approved';
    case RiskCategory.MEDIUM:
      return 'approved';
    case RiskCategory.HIGH:
      return 'conditional';
    case RiskCategory.CRITICAL:
      return 'review_required';
  }
}

/**
 * Batch calculate risk scores
 */
export function batchCalculateRiskScores(
  applicants: Array<{
    tenantId: string;
    tenantName: string;
    creditHistory: CreditHistory;
    rentalHistory: RentalHistory;
    employmentVerification: EmploymentVerification;
  }>
): TenantRiskProfile[] {
  return applicants.map(applicant =>
    calculateTenantRiskScore(
      applicant.tenantId,
      applicant.tenantName,
      applicant.creditHistory,
      applicant.rentalHistory,
      applicant.employmentVerification
    )
  );
}

/**
 * Get risk statistics
 */
export function getRiskStatistics(profiles: TenantRiskProfile[]): {
  totalApplicants: number;
  averageScore: number;
  byRiskCategory: Record<RiskCategory, number>;
  byApprovalStatus: Record<'approved' | 'conditional' | 'rejected' | 'review_required', number>;
  highRiskCount: number;
} {
  const averageScore = profiles.length > 0
    ? profiles.reduce((sum, p) => sum + p.overallScore, 0) / profiles.length
    : 0;
  
  const byRiskCategory: Record<RiskCategory, number> = {
    [RiskCategory.LOW]: 0,
    [RiskCategory.MEDIUM]: 0,
    [RiskCategory.HIGH]: 0,
    [RiskCategory.CRITICAL]: 0,
  };
  
  const byApprovalStatus: Record<'approved' | 'conditional' | 'rejected' | 'review_required', number> = {
    approved: 0,
    conditional: 0,
    rejected: 0,
    review_required: 0,
  };
  
  for (const profile of profiles) {
    byRiskCategory[profile.riskCategory]++;
    byApprovalStatus[profile.approvalStatus]++;
  }
  
  const highRiskCount = profiles.filter(p => p.riskCategory === RiskCategory.HIGH || p.riskCategory === RiskCategory.CRITICAL).length;
  
  return {
    totalApplicants: profiles.length,
    averageScore,
    byRiskCategory,
    byApprovalStatus,
    highRiskCount,
  };
}

/**
 * Get high-risk applicants
 */
export function getHighRiskApplicants(profiles: TenantRiskProfile[]): TenantRiskProfile[] {
  return profiles.filter(p => p.riskCategory === RiskCategory.HIGH || p.riskCategory === RiskCategory.CRITICAL);
}

/**
 * Filter by risk category
 */
export function filterByRiskCategory(profiles: TenantRiskProfile[], category: RiskCategory): TenantRiskProfile[] {
  return profiles.filter(profile => profile.riskCategory === category);
}

/**
 * Filter by approval status
 */
export function filterByApprovalStatus(profiles: TenantRiskProfile[], status: 'approved' | 'conditional' | 'rejected' | 'review_required'): TenantRiskProfile[] {
  return profiles.filter(profile => profile.approvalStatus === status);
}

/**
 * Get risk category label
 */
export function getRiskCategoryLabel(category: RiskCategory): string {
  const labels: Record<RiskCategory, string> = {
    [RiskCategory.LOW]: 'Low',
    [RiskCategory.MEDIUM]: 'Medium',
    [RiskCategory.HIGH]: 'High',
    [RiskCategory.CRITICAL]: 'Critical',
  };

  return labels[category];
}

/**
 * Get approval status label
 */
export function getApprovalStatusLabel(status: 'approved' | 'conditional' | 'rejected' | 'review_required'): string {
  const labels: Record<'approved' | 'conditional' | 'rejected' | 'review_required', string> = {
    approved: 'Approved',
    conditional: 'Conditional',
    rejected: 'Rejected',
    review_required: 'Review Required',
  };

  return labels[status];
}

/**
 * Format risk profile for display
 */
export function formatRiskProfile(profile: TenantRiskProfile): string {
  return `
Tenant Risk Profile
===================
Tenant: ${profile.tenantName}
Overall Score: ${profile.overallScore.toFixed(0)}/100
Risk Category: ${getRiskCategoryLabel(profile.riskCategory)}
Approval Status: ${getApprovalStatusLabel(profile.approvalStatus)}
Assessment Date: ${profile.assessmentDate.toLocaleDateString()}

Risk Factors:
${profile.factors.map(f => `- ${f.name}: ${f.score.toFixed(0)}/100 (${f.impact})`).join('\n')}

Recommended Actions:
${profile.recommendedActions.map(a => `- ${a}`).join('\n')}
  `.trim();
}
