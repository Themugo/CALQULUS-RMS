/**
 * Rent Guarantee Services
 * 
 * Implements rent guarantee services with:
 * - Guarantee application processing
 * - Tenant screening integration
 * - Premium calculation
 * - Claim processing
 * - Coverage management
 * - Provider integration
 * - Risk assessment
 */

// Guarantee type
export enum GuaranteeType {
  FULL_COVERAGE = 'full_coverage',
  PARTIAL_COVERAGE = 'partial_coverage',
  EXCESS_COVERAGE = 'excess_coverage',
}

// Guarantee status
export enum GuaranteeStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  CLAIMED = 'claimed',
}

// Claim status
export enum ClaimStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
  CLOSED = 'closed',
}

// Guarantee provider
export interface GuaranteeProvider {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKey?: string;
  supportedTypes: GuaranteeType[];
  coveragePercentage: number; // e.g., 90% of rent
  maxCoverageAmount: number;
  premiumRate: number; // percentage of annual rent
  isActive: boolean;
}

// Rent guarantee
export interface RentGuarantee {
  id: string;
  providerId: string;
  landlordId: string;
  tenantId: string;
  propertyId: string;
  leaseId: string;
  type: GuaranteeType;
  monthlyRent: number;
  coverageAmount: number;
  premium: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'annually';
  startDate: Date;
  endDate: Date;
  status: GuaranteeStatus;
  tenantScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  conditions: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Guarantee claim
export interface GuaranteeClaim {
  id: string;
  guaranteeId: string;
  claimNumber: string;
  claimDate: Date;
  incidentDate: Date;
  claimedAmount: number;
  description: string;
  status: ClaimStatus;
  documents: string[];
  approvedAmount?: number;
  reviewedAt?: Date;
  approvedAt?: Date;
  paidAt?: Date;
  rejectionReason?: string;
  notes: string;
}

// Tenant screening result
export interface TenantScreeningResult {
  tenantId: string;
  creditScore: number;
  incomeVerification: boolean;
  employmentStatus: 'employed' | 'self_employed' | 'unemployed';
  rentalHistory: {
    previousEvictions: number;
    latePayments: number;
    positiveReferences: number;
  };
  riskScore: number; // 0-100
  recommendation: 'approved' | 'conditional' | 'rejected';
}

/**
 * Create rent guarantee
 */
export function createRentGuarantee(
  providerId: string,
  landlordId: string,
  tenantId: string,
  propertyId: string,
  leaseId: string,
  type: GuaranteeType,
  monthlyRent: number,
  coveragePercentage: number,
  premiumRate: number,
  startDate: Date,
  endDate: Date,
  tenantScore: number,
  riskLevel: 'low' | 'medium' | 'high'
): RentGuarantee {
  const coverageAmount = monthlyRent * coveragePercentage;
  const annualPremium = monthlyRent * 12 * (premiumRate / 100);
  const premium = annualPremium / 12; // Monthly premium
  
  return {
    id: `guarantee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    providerId,
    landlordId,
    tenantId,
    propertyId,
    leaseId,
    type,
    monthlyRent,
    coverageAmount,
    premium,
    premiumFrequency: 'monthly',
    startDate,
    endDate,
    status: GuaranteeStatus.PENDING,
    tenantScore,
    riskLevel,
    conditions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Activate guarantee
 */
export function activateGuarantee(guarantee: RentGuarantee): RentGuarantee {
  return {
    ...guarantee,
    status: GuaranteeStatus.ACTIVE,
    updatedAt: new Date(),
  };
}

/**
 * Cancel guarantee
 */
export function cancelGuarantee(guarantee: RentGuarantee, reason: string): RentGuarantee {
  return {
    ...guarantee,
    status: GuaranteeStatus.CANCELLED,
    conditions: [...guarantee.conditions, `Cancelled: ${reason}`],
    updatedAt: new Date(),
  };
}

/**
 * Renew guarantee
 */
export function renewGuarantee(guarantee: RentGuarantee, newEndDate: Date): RentGuarantee {
  return {
    ...guarantee,
    endDate: newEndDate,
    status: GuaranteeStatus.ACTIVE,
    updatedAt: new Date(),
  };
}

/**
 * Screen tenant for guarantee eligibility
 */
export function screenTenantForGuarantee(
  tenantId: string,
  creditScore: number,
  incomeVerification: boolean,
  employmentStatus: 'employed' | 'self_employed' | 'unemployed',
  rentalHistory: {
    previousEvictions: number;
    latePayments: number;
    positiveReferences: number;
  }
): TenantScreeningResult {
  let riskScore = 0;
  
  // Credit score impact
  if (creditScore >= 750) {
    riskScore -= 20;
  } else if (creditScore >= 650) {
    riskScore -= 10;
  } else if (creditScore >= 600) {
    riskScore += 10;
  } else {
    riskScore += 30;
  }
  
  // Income verification impact
  if (!incomeVerification) {
    riskScore += 25;
  }
  
  // Employment status impact
  if (employmentStatus === 'unemployed') {
    riskScore += 40;
  } else if (employmentStatus === 'self_employed') {
    riskScore += 10;
  }
  
  // Rental history impact
  riskScore += rentalHistory.previousEvictions * 30;
  riskScore += rentalHistory.latePayments * 5;
  riskScore -= rentalHistory.positiveReferences * 5;
  
  // Ensure risk score is between 0 and 100
  riskScore = Math.max(0, Math.min(100, riskScore));
  
  // Determine recommendation
  let recommendation: 'approved' | 'conditional' | 'rejected';
  if (riskScore < 30) {
    recommendation = 'approved';
  } else if (riskScore < 50) {
    recommendation = 'conditional';
  } else {
    recommendation = 'rejected';
  }
  
  return {
    tenantId,
    creditScore,
    incomeVerification,
    employmentStatus,
    rentalHistory,
    riskScore,
    recommendation,
  };
}

/**
 * Calculate premium
 */
export function calculatePremium(
  monthlyRent: number,
  coveragePercentage: number,
  premiumRate: number,
  riskLevel: 'low' | 'medium' | 'high'
): {
  monthlyPremium: number;
  annualPremium: number;
  totalPremium: number;
} {
  const annualRent = monthlyRent * 12;
  const coverageAmount = annualRent * (coveragePercentage / 100);
  
  // Adjust premium rate based on risk level
  const riskMultiplier: Record<'low' | 'medium' | 'high', number> = {
    low: 1.0,
    medium: 1.5,
    high: 2.0,
  };
  
  const adjustedRate = premiumRate * riskMultiplier[riskLevel];
  const annualPremium = coverageAmount * (adjustedRate / 100);
  const monthlyPremium = annualPremium / 12;
  
  return {
    monthlyPremium,
    annualPremium,
    totalPremium: annualPremium,
  };
}

/**
 * Create guarantee claim
 */
export function createGuaranteeClaim(
  guaranteeId: string,
  claimNumber: string,
  incidentDate: Date,
  claimedAmount: number,
  description: string,
  documents: string[]
): GuaranteeClaim {
  return {
    id: `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    guaranteeId,
    claimNumber,
    claimDate: new Date(),
    incidentDate,
    claimedAmount,
    description,
    status: ClaimStatus.SUBMITTED,
    documents,
    notes: '',
  };
}

/**
 * Submit claim to provider
 */
export async function submitClaimToProvider(
  claim: GuaranteeClaim,
  _provider: GuaranteeProvider
): Promise<GuaranteeClaim> {
  // In production, this would call the provider's API
  // For now, we'll simulate the submission
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      ...claim,
      status: ClaimStatus.UNDER_REVIEW,
      reviewedAt: new Date(),
    };
  } catch (error) {
    console.error('Failed to submit claim to provider:', error);
    return claim;
  }
}

/**
 * Approve claim
 */
export function approveClaim(claim: GuaranteeClaim, approvedAmount: number): GuaranteeClaim {
  return {
    ...claim,
    approvedAmount,
    status: ClaimStatus.APPROVED,
    approvedAt: new Date(),
  };
}

/**
 * Reject claim
 */
export function rejectClaim(claim: GuaranteeClaim, reason: string): GuaranteeClaim {
  return {
    ...claim,
    status: ClaimStatus.REJECTED,
    rejectionReason: reason,
  };
}

/**
 * Pay claim
 */
export function payClaim(claim: GuaranteeClaim): GuaranteeClaim {
  return {
    ...claim,
    status: ClaimStatus.PAID,
    paidAt: new Date(),
  };
}

/**
 * Close claim
 */
export function closeClaim(claim: GuaranteeClaim): GuaranteeClaim {
  return {
    ...claim,
    status: ClaimStatus.CLOSED,
  };
}

/**
 * Get guarantee type label
 */
export function getGuaranteeTypeLabel(type: GuaranteeType): string {
  const labels: Record<GuaranteeType, string> = {
    [GuaranteeType.FULL_COVERAGE]: 'Full Coverage',
    [GuaranteeType.PARTIAL_COVERAGE]: 'Partial Coverage',
    [GuaranteeType.EXCESS_COVERAGE]: 'Excess Coverage',
  };

  return labels[type];
}

/**
 * Get guarantee status label
 */
export function getGuaranteeStatusLabel(status: GuaranteeStatus): string {
  const labels: Record<GuaranteeStatus, string> = {
    [GuaranteeStatus.PENDING]: 'Pending',
    [GuaranteeStatus.ACTIVE]: 'Active',
    [GuaranteeStatus.EXPIRED]: 'Expired',
    [GuaranteeStatus.CANCELLED]: 'Cancelled',
    [GuaranteeStatus.CLAIMED]: 'Claimed',
  };

  return labels[status];
}

/**
 * Get claim status label
 */
export function getClaimStatusLabel(status: ClaimStatus): string {
  const labels: Record<ClaimStatus, string> = {
    [ClaimStatus.SUBMITTED]: 'Submitted',
    [ClaimStatus.UNDER_REVIEW]: 'Under Review',
    [ClaimStatus.APPROVED]: 'Approved',
    [ClaimStatus.REJECTED]: 'Rejected',
    [ClaimStatus.PAID]: 'Paid',
    [ClaimStatus.CLOSED]: 'Closed',
  };

  return labels[status];
}

/**
 * Filter guarantees by status
 */
export function filterGuaranteesByStatus(guarantees: RentGuarantee[], status: GuaranteeStatus): RentGuarantee[] {
  return guarantees.filter(guarantee => guarantee.status === status);
}

/**
 * Filter guarantees by risk level
 */
export function filterGuaranteesByRiskLevel(guarantees: RentGuarantee[], riskLevel: 'low' | 'medium' | 'high'): RentGuarantee[] {
  return guarantees.filter(guarantee => guarantee.riskLevel === riskLevel);
}

/**
 * Filter claims by status
 */
export function filterClaimsByStatus(claims: GuaranteeClaim[], status: ClaimStatus): GuaranteeClaim[] {
  return claims.filter(claim => claim.status === status);
}

/**
 * Get guarantee statistics
 */
export function getGuaranteeStatistics(
  guarantees: RentGuarantee[],
  claims: GuaranteeClaim[]
): {
  totalGuarantees: number;
  activeGuarantees: number;
  expiredGuarantees: number;
  cancelledGuarantees: number;
  totalCoverage: number;
  totalPremium: number;
  byRiskLevel: Record<'low' | 'medium' | 'high', number>;
  byStatus: Record<GuaranteeStatus, number>;
  totalClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  paidClaims: number;
  totalClaimedAmount: number;
  totalPaidAmount: number;
} {
  const activeGuarantees = guarantees.filter(g => g.status === GuaranteeStatus.ACTIVE).length;
  const expiredGuarantees = guarantees.filter(g => g.status === GuaranteeStatus.EXPIRED).length;
  const cancelledGuarantees = guarantees.filter(g => g.status === GuaranteeStatus.CANCELLED).length;
  
  const totalCoverage = guarantees.reduce((sum, g) => sum + g.coverageAmount, 0);
  const totalPremium = guarantees.reduce((sum, g) => sum + g.premium, 0);
  
  const byRiskLevel: Record<'low' | 'medium' | 'high', number> = {
    low: 0,
    medium: 0,
    high: 0,
  };
  
  const byStatus: Record<GuaranteeStatus, number> = {
    [GuaranteeStatus.PENDING]: 0,
    [GuaranteeStatus.ACTIVE]: 0,
    [GuaranteeStatus.EXPIRED]: 0,
    [GuaranteeStatus.CANCELLED]: 0,
    [GuaranteeStatus.CLAIMED]: 0,
  };
  
  for (const guarantee of guarantees) {
    byRiskLevel[guarantee.riskLevel]++;
    byStatus[guarantee.status]++;
  }
  
  const approvedClaims = claims.filter(c => c.status === ClaimStatus.APPROVED || c.status === ClaimStatus.PAID).length;
  const rejectedClaims = claims.filter(c => c.status === ClaimStatus.REJECTED).length;
  const paidClaims = claims.filter(c => c.status === ClaimStatus.PAID).length;
  
  const totalClaimedAmount = claims.reduce((sum, c) => sum + c.claimedAmount, 0);
  const totalPaidAmount = claims.reduce((sum, c) => sum + (c.approvedAmount || 0), 0);
  
  return {
    totalGuarantees: guarantees.length,
    activeGuarantees,
    expiredGuarantees,
    cancelledGuarantees,
    totalCoverage,
    totalPremium,
    byRiskLevel,
    byStatus,
    totalClaims: claims.length,
    approvedClaims,
    rejectedClaims,
    paidClaims,
    totalClaimedAmount,
    totalPaidAmount,
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
