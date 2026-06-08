/**
 * Insurance Integration
 * 
 * Implements insurance provider integration with:
 * - Policy management
 * - Coverage verification
 * - Claims processing
 * - Premium calculation
 * - Provider integration
 * - Policy renewal
 * - Risk assessment
 */

// Insurance type
export enum InsuranceType {
  PROPERTY = 'property',
  LIABILITY = 'liability',
  RENT_GUARANTEE = 'rent_guarantee',
  CONTENTS = 'contents',
  LANDLORD = 'landlord',
  TENANT = 'tenant',
}

// Policy status
export enum PolicyStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  LAPSED = 'lapsed',
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

// Insurance provider
export interface InsuranceProvider {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKey?: string;
  supportedTypes: InsuranceType[];
  isActive: boolean;
  commissionRate: number;
}

// Insurance policy
export interface InsurancePolicy {
  id: string;
  providerId: string;
  policyNumber: string;
  type: InsuranceType;
  propertyId: string;
  tenantId?: string;
  coverageAmount: number;
  deductible: number;
  premium: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'annually';
  startDate: Date;
  endDate: Date;
  status: PolicyStatus;
  coverageDetails: CoverageDetails;
  beneficiaries: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Coverage details
export interface CoverageDetails {
  propertyDamage: boolean;
  liability: boolean;
  contents: boolean;
  lossOfRent: boolean;
  additionalCoverages: string[];
  exclusions: string[];
}

// Insurance claim
export interface InsuranceClaim {
  id: string;
  policyId: string;
  claimNumber: string;
  type: string;
  description: string;
  incidentDate: Date;
  claimedAmount: number;
  approvedAmount?: number;
  status: ClaimStatus;
  documents: string[];
  submittedAt: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  paidAt?: Date;
  notes: string;
}

// Premium quote
export interface PremiumQuote {
  id: string;
  providerId: string;
  type: InsuranceType;
  propertyId: string;
  coverageAmount: number;
  deductible: number;
  estimatedPremium: number;
  validityDays: number;
  factors: PremiumFactor[];
  createdAt: Date;
}

// Premium factor
export interface PremiumFactor {
  name: string;
  impact: number;
  description: string;
}

/**
 * Create insurance policy
 */
export function createInsurancePolicy(
  providerId: string,
  policyNumber: string,
  type: InsuranceType,
  propertyId: string,
  coverageAmount: number,
  deductible: number,
  premium: number,
  premiumFrequency: 'monthly' | 'quarterly' | 'annually',
  startDate: Date,
  endDate: Date,
  coverageDetails: CoverageDetails
): InsurancePolicy {
  return {
    id: `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    providerId,
    policyNumber,
    type,
    propertyId,
    coverageAmount,
    deductible,
    premium,
    premiumFrequency,
    startDate,
    endDate,
    status: PolicyStatus.ACTIVE,
    coverageDetails,
    beneficiaries: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Update insurance policy
 */
export function updateInsurancePolicy(
  policy: InsurancePolicy,
  updates: Partial<Omit<InsurancePolicy, 'id' | 'createdAt'>>
): InsurancePolicy {
  return {
    ...policy,
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * Renew policy
 */
export function renewPolicy(policy: InsurancePolicy, newEndDate: Date): InsurancePolicy {
  return {
    ...policy,
    endDate: newEndDate,
    status: PolicyStatus.ACTIVE,
    updatedAt: new Date(),
  };
}

/**
 * Cancel policy
 */
export function cancelPolicy(policy: InsurancePolicy, _reason: string): InsurancePolicy {
  return {
    ...policy,
    status: PolicyStatus.CANCELLED,
    updatedAt: new Date(),
  };
}

/**
 * Create insurance claim
 */
export function createInsuranceClaim(
  policyId: string,
  claimNumber: string,
  type: string,
  description: string,
  incidentDate: Date,
  claimedAmount: number,
  documents: string[]
): InsuranceClaim {
  return {
    id: `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    policyId,
    claimNumber,
    type,
    description,
    incidentDate,
    claimedAmount,
    status: ClaimStatus.SUBMITTED,
    documents,
    submittedAt: new Date(),
    notes: '',
  };
}

/**
 * Submit claim to provider
 */
export async function submitClaimToProvider(
  claim: InsuranceClaim,
  _provider: InsuranceProvider
): Promise<InsuranceClaim> {
  // In production, this would call the provider's API
  // For now, we'll simulate the submission
  
  return {
    ...claim,
    status: ClaimStatus.UNDER_REVIEW,
    reviewedAt: new Date(),
  };
}

/**
 * Approve claim
 */
export function approveClaim(claim: InsuranceClaim, approvedAmount: number): InsuranceClaim {
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
export function rejectClaim(claim: InsuranceClaim, _reason: string): InsuranceClaim {
  return {
    ...claim,
    status: ClaimStatus.REJECTED,
    notes: _reason,
  };
}

/**
 * Pay claim
 */
export function payClaim(claim: InsuranceClaim): InsuranceClaim {
  return {
    ...claim,
    status: ClaimStatus.PAID,
    paidAt: new Date(),
  };
}

/**
 * Close claim
 */
export function closeClaim(claim: InsuranceClaim): InsuranceClaim {
  return {
    ...claim,
    status: ClaimStatus.CLOSED,
  };
}

/**
 * Calculate premium
 */
export function calculatePremium(
  type: InsuranceType,
  coverageAmount: number,
  propertyValue: number,
  location: string,
  propertyAge: number,
  claimsHistory: number
): PremiumQuote {
  const factors = analyzePremiumFactors(type, coverageAmount, propertyValue, location, propertyAge, claimsHistory);
  const estimatedPremium = calculateEstimatedPremium(coverageAmount, factors);
  
  return {
    id: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    providerId: 'default',
    type,
    propertyId: '',
    coverageAmount,
    deductible: Math.round(coverageAmount * 0.05),
    estimatedPremium,
    validityDays: 30,
    factors,
    createdAt: new Date(),
  };
}

/**
 * Analyze premium factors
 */
function analyzePremiumFactors(
  type: InsuranceType,
  coverageAmount: number,
  propertyValue: number,
  location: string,
  propertyAge: number,
  claimsHistory: number
): PremiumFactor[] {
  const factors: PremiumFactor[] = [];
  
  // Coverage amount factor
  const coverageRatio = coverageAmount / propertyValue;
  factors.push({
    name: 'Coverage Ratio',
    impact: coverageRatio > 0.8 ? 0.2 : 0.1,
    description: `Coverage is ${(coverageRatio * 100).toFixed(0)}% of property value`,
  });
  
  // Location factor
  const locationRisk = assessLocationRisk(location);
  factors.push({
    name: 'Location Risk',
    impact: locationRisk,
    description: locationRisk > 0.5 ? 'High-risk location' : 'Standard location',
  });
  
  // Property age factor
  const ageFactor = Math.min(0.3, propertyAge / 100);
  factors.push({
    name: 'Property Age',
    impact: ageFactor,
    description: `Property is ${propertyAge} years old`,
  });
  
  // Claims history factor
  const claimsFactor = Math.min(0.4, claimsHistory * 0.1);
  factors.push({
    name: 'Claims History',
    impact: claimsFactor,
    description: `${claimsHistory} previous claims`,
  });
  
  // Insurance type factor
  const typeFactor = getTypeFactor(type);
  factors.push({
    name: 'Insurance Type',
    impact: typeFactor,
    description: `${type} insurance`,
  });
  
  return factors;
}

/**
 * Assess location risk
 */
function assessLocationRisk(location: string): number {
  // In production, this would use actual crime/weather data
  // For now, we'll use a simple heuristic
  const highRiskAreas = ['downtown', 'industrial', 'flood_zone'];
  const lowerLocation = location.toLowerCase();
  
  if (highRiskAreas.some(area => lowerLocation.includes(area))) {
    return 0.6;
  }
  
  return 0.3;
}

/**
 * Get type factor
 */
function getTypeFactor(type: InsuranceType): number {
  const factors: Record<InsuranceType, number> = {
    [InsuranceType.PROPERTY]: 0.3,
    [InsuranceType.LIABILITY]: 0.2,
    [InsuranceType.RENT_GUARANTEE]: 0.4,
    [InsuranceType.CONTENTS]: 0.15,
    [InsuranceType.LANDLORD]: 0.35,
    [InsuranceType.TENANT]: 0.25,
  };
  
  return factors[type];
}

/**
 * Calculate estimated premium
 */
function calculateEstimatedPremium(coverageAmount: number, factors: PremiumFactor[]): number {
  const baseRate = 0.01; // 1% of coverage amount as base
  let totalImpact = 0;
  
  for (const factor of factors) {
    totalImpact += factor.impact;
  }
  
  const adjustedRate = baseRate * (1 + totalImpact);
  return coverageAmount * adjustedRate;
}

/**
 * Verify coverage
 */
export function verifyCoverage(
  policy: InsurancePolicy,
  claimType: string,
  claimedAmount: number
): {
  isCovered: boolean;
  coverageAmount: number;
  deductible: number;
  reason?: string;
} {
  // Check if policy is active
  if (policy.status !== PolicyStatus.ACTIVE) {
    return {
      isCovered: false,
      coverageAmount: 0,
      deductible: policy.deductible,
      reason: 'Policy is not active',
    };
  }
  
  // Check if claim is within coverage
  if (claimedAmount > policy.coverageAmount) {
    return {
      isCovered: false,
      coverageAmount: policy.coverageAmount,
      deductible: policy.deductible,
      reason: 'Claim amount exceeds coverage limit',
    };
  }
  
  // Check specific coverage
  const isCovered = checkSpecificCoverage(policy.coverageDetails, claimType);
  
  return {
    isCovered,
    coverageAmount: policy.coverageAmount,
    deductible: policy.deductible,
    reason: isCovered ? undefined : 'Claim type not covered by policy',
  };
}

/**
 * Check specific coverage
 */
function checkSpecificCoverage(coverageDetails: CoverageDetails, claimType: string): boolean {
  const lowerClaimType = claimType.toLowerCase();
  
  if (lowerClaimType.includes('property') || lowerClaimType.includes('damage')) {
    return coverageDetails.propertyDamage;
  }
  
  if (lowerClaimType.includes('liability') || lowerClaimType.includes('injury')) {
    return coverageDetails.liability;
  }
  
  if (lowerClaimType.includes('content') || lowerClaimType.includes('personal')) {
    return coverageDetails.contents;
  }
  
  if (lowerClaimType.includes('rent') || lowerClaimType.includes('loss of income')) {
    return coverageDetails.lossOfRent;
  }
  
  return false;
}

/**
 * Get insurance type label
 */
export function getInsuranceTypeLabel(type: InsuranceType): string {
  const labels: Record<InsuranceType, string> = {
    [InsuranceType.PROPERTY]: 'Property',
    [InsuranceType.LIABILITY]: 'Liability',
    [InsuranceType.RENT_GUARANTEE]: 'Rent Guarantee',
    [InsuranceType.CONTENTS]: 'Contents',
    [InsuranceType.LANDLORD]: 'Landlord',
    [InsuranceType.TENANT]: 'Tenant',
  };

  return labels[type];
}

/**
 * Get policy status label
 */
export function getPolicyStatusLabel(status: PolicyStatus): string {
  const labels: Record<PolicyStatus, string> = {
    [PolicyStatus.ACTIVE]: 'Active',
    [PolicyStatus.PENDING]: 'Pending',
    [PolicyStatus.EXPIRED]: 'Expired',
    [PolicyStatus.CANCELLED]: 'Cancelled',
    [PolicyStatus.LAPSED]: 'Lapsed',
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
 * Filter policies by type
 */
export function filterPoliciesByType(policies: InsurancePolicy[], type: InsuranceType): InsurancePolicy[] {
  return policies.filter(policy => policy.type === type);
}

/**
 * Filter policies by status
 */
export function filterPoliciesByStatus(policies: InsurancePolicy[], status: PolicyStatus): InsurancePolicy[] {
  return policies.filter(policy => policy.status === status);
}

/**
 * Filter claims by status
 */
export function filterClaimsByStatus(claims: InsuranceClaim[], status: ClaimStatus): InsuranceClaim[] {
  return claims.filter(claim => claim.status === status);
}

/**
 * Get insurance statistics
 */
export function getInsuranceStatistics(
  policies: InsurancePolicy[],
  claims: InsuranceClaim[]
): {
  totalPolicies: number;
  activePolicies: number;
  expiredPolicies: number;
  totalPremium: number;
  totalCoverage: number;
  totalClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  paidClaims: number;
  totalClaimedAmount: number;
  totalPaidAmount: number;
  byType: Record<InsuranceType, number>;
  byStatus: Record<PolicyStatus, number>;
} {
  const activePolicies = policies.filter(p => p.status === PolicyStatus.ACTIVE).length;
  const expiredPolicies = policies.filter(p => p.status === PolicyStatus.EXPIRED).length;
  
  const totalPremium = policies.reduce((sum, p) => sum + p.premium, 0);
  const totalCoverage = policies.reduce((sum, p) => sum + p.coverageAmount, 0);
  
  const approvedClaims = claims.filter(c => c.status === ClaimStatus.APPROVED || c.status === ClaimStatus.PAID).length;
  const rejectedClaims = claims.filter(c => c.status === ClaimStatus.REJECTED).length;
  const paidClaims = claims.filter(c => c.status === ClaimStatus.PAID).length;
  
  const totalClaimedAmount = claims.reduce((sum, c) => sum + c.claimedAmount, 0);
  const totalPaidAmount = claims.reduce((sum, c) => sum + (c.approvedAmount || 0), 0);
  
  const byType: Record<InsuranceType, number> = {
    [InsuranceType.PROPERTY]: 0,
    [InsuranceType.LIABILITY]: 0,
    [InsuranceType.RENT_GUARANTEE]: 0,
    [InsuranceType.CONTENTS]: 0,
    [InsuranceType.LANDLORD]: 0,
    [InsuranceType.TENANT]: 0,
  };
  
  const byStatus: Record<PolicyStatus, number> = {
    [PolicyStatus.ACTIVE]: 0,
    [PolicyStatus.PENDING]: 0,
    [PolicyStatus.EXPIRED]: 0,
    [PolicyStatus.CANCELLED]: 0,
    [PolicyStatus.LAPSED]: 0,
  };
  
  for (const policy of policies) {
    byType[policy.type]++;
    byStatus[policy.status]++;
  }
  
  return {
    totalPolicies: policies.length,
    activePolicies,
    expiredPolicies,
    totalPremium,
    totalCoverage,
    totalClaims: claims.length,
    approvedClaims,
    rejectedClaims,
    paidClaims,
    totalClaimedAmount,
    totalPaidAmount,
    byType,
    byStatus,
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
