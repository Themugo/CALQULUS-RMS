/**
 * Insurers Integration
 * 
 * Manages insurance ecosystem for property coverage:
 * - Insurance provider partnerships
 * - Policy management and quotes
 * - Claims processing
 * - Premium payment processing
 * - Coverage verification
 * - Risk assessment integration
 */

export interface InsuranceProvider {
  id: string;
  name: string;
  type: 'property' | 'liability' | 'workers_comp' | 'rent_guarantee' | 'tenant_insurance';
  logo?: string;
  contact: {
    email: string;
    phone: string;
    website: string;
  };
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  products: InsuranceProduct[];
  serviceAreas: string[];
  rating: number;
  reviewCount: number;
  totalPoliciesIssued: number;
  totalPremiumValue: number;
  averageClaimsResponseTime: number; // in hours
  claimsApprovalRate: number;
  integrationStatus: 'not_integrated' | 'pending' | 'integrated' | 'active';
  apiCredentials?: APICredentials;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsuranceProduct {
  id: string;
  name: string;
  type: 'property' | 'liability' | 'workers_comp' | 'rent_guarantee' | 'tenant_insurance';
  description: string;
  coverage: CoverageDetails;
  deductible: number;
  premium: PremiumStructure;
  exclusions: string[];
  requirements: PolicyRequirement[];
  eligibility: EligibilityCriteria;
  features: string[];
}

export interface CoverageDetails {
  propertyDamage: number;
  liability: number;
  personalProperty: number;
  lossOfRent: number;
  medicalPayments: number;
  additionalCoverages: { type: string; amount: number }[];
}

export interface PremiumStructure {
  baseRate: number;
  ratePerUnit: number;
  ratePerThousand: number;
  paymentFrequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  discounts: Discount[];
  fees: {
    policyFee: number;
    administrativeFee: number;
  };
}

export interface Discount {
  type: string;
  description: string;
  percentage: number;
  conditions: string[];
}

export interface PolicyRequirement {
  type: string;
  description: string;
  required: boolean;
}

export interface EligibilityCriteria {
  minimumPropertyAge?: number;
  maximumPropertyAge?: number;
  minimumPropertyValue?: number;
  requiredSafetyFeatures?: string[];
  prohibitedPropertyTypes?: string[];
  documentationRequired: string[];
}

export interface APICredentials {
  apiKey: string;
  apiSecret: string;
  webhookUrl?: string;
  environment: 'sandbox' | 'production';
}

export interface InsurancePolicy {
  id: string;
  providerId: string;
  providerName: string;
  productId: string;
  productName: string;
  policyNumber: string;
  propertyId: string;
  propertyName: string;
  policyholderId: string;
  policyholderName: string;
  coverage: CoverageDetails;
  premium: PremiumStructure;
  deductible: number;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'expired' | 'cancelled' | 'lapsed' | 'pending_renewal';
  premiumAmount: number;
  nextPremiumDue: Date;
  payments: PremiumPayment[];
  claims: Claim[];
  documents: PolicyDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PremiumPayment {
  id: string;
  policyId: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  method: string;
  reference: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial' | 'failed';
}

export interface Claim {
  id: string;
  policyId: string;
  policyNumber: string;
  propertyId: string;
  propertyName: string;
  claimNumber: string;
  type: string;
  description: string;
  incidentDate: Date;
  reportedDate: Date;
  estimatedAmount: number;
  approvedAmount?: number;
  status: 'reported' | 'under_review' | 'approved' | 'rejected' | 'in_progress' | 'paid' | 'closed';
  assignedAdjuster?: string;
  documents: ClaimDocument[];
  notes: ClaimNote[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClaimDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  uploadedAt: Date;
}

export interface ClaimNote {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}

export interface PolicyDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: Date;
  verifiedAt?: Date;
}

export interface InsuranceQuote {
  id: string;
  providerId: string;
  providerName: string;
  productId: string;
  productName: string;
  propertyId: string;
  propertyName: string;
  coverage: CoverageDetails;
  premium: PremiumStructure;
  estimatedAnnualPremium: number;
  deductible: number;
  validUntil: Date;
  terms: string[];
  createdAt: Date;
}

export class Insurers {
  private providers: Map<string, InsuranceProvider>;
  private policies: Map<string, InsurancePolicy>;
  private claims: Map<string, Claim>;
  private quotes: Map<string, InsuranceQuote>;

  constructor() {
    this.providers = new Map();
    this.policies = new Map();
    this.claims = new Map();
    this.quotes = new Map();
  }

  /**
   * Register an insurance provider
   */
  registerProvider(providerData: Omit<InsuranceProvider, 'id' | 'rating' | 'reviewCount' | 'totalPoliciesIssued' | 'totalPremiumValue' | 'integrationStatus' | 'createdAt' | 'updatedAt'>): InsuranceProvider {
    const provider: InsuranceProvider = {
      ...providerData,
      id: this.generateId(),
      rating: 0,
      reviewCount: 0,
      totalPoliciesIssued: 0,
      totalPremiumValue: 0,
      integrationStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.providers.set(provider.id, provider);
    return provider;
  }

  /**
   * Integrate provider API
   */
  integrateProviderAPI(providerId: string, apiCredentials: APICredentials): InsuranceProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    provider.apiCredentials = apiCredentials;
    provider.integrationStatus = 'integrated';
    provider.updatedAt = new Date();

    this.providers.set(providerId, provider);
    return provider;
  }

  /**
   * Activate provider integration
   */
  activateProvider(providerId: string): InsuranceProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    if (provider.integrationStatus !== 'integrated') {
      throw new Error('Provider must be integrated before activation');
    }

    provider.integrationStatus = 'active';
    provider.updatedAt = new Date();

    this.providers.set(providerId, provider);
    return provider;
  }

  /**
   * Request insurance quote
   */
  requestQuote(quoteData: Omit<InsuranceQuote, 'id' | 'estimatedAnnualPremium' | 'validUntil' | 'createdAt'>): InsuranceQuote {
    const provider = this.providers.get(quoteData.providerId);
    if (!provider) {
      throw new Error(`Provider ${quoteData.providerId} not found`);
    }

    const product = provider.products.find(p => p.id === quoteData.productId);
    if (!product) {
      throw new Error(`Product ${quoteData.productId} not found`);
    }

    // Calculate estimated annual premium
    const estimatedAnnualPremium = this.calculatePremium(quoteData.coverage, product.premium);

    const quote: InsuranceQuote = {
      ...quoteData,
      id: this.generateId(),
      estimatedAnnualPremium,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date()
    };

    this.quotes.set(quote.id, quote);
    return quote;
  }

  /**
   * Calculate premium
   */
  private calculatePremium(coverage: CoverageDetails, premiumStructure: PremiumStructure): number {
    const basePremium = premiumStructure.baseRate;
    const propertyValuePremium = (coverage.propertyDamage / 1000) * premiumStructure.ratePerThousand;
    const liabilityPremium = coverage.liability * 0.001;
    const totalPremium = basePremium + propertyValuePremium + liabilityPremium;

    // Apply discounts
    let discountedPremium = totalPremium;
    premiumStructure.discounts.forEach(discount => {
      discountedPremium *= (1 - discount.percentage / 100);
    });

    // Add fees
    const fees = premiumStructure.fees.policyFee + premiumStructure.fees.administrativeFee;
    const finalPremium = discountedPremium + fees;

    return Math.round(finalPremium * 100) / 100;
  }

  /**
   * Accept quote and create policy
   */
  acceptQuote(quoteId: string, policyholderData: {
    policyholderId: string;
    policyholderName: string;
    startDate: Date;
  }): InsurancePolicy {
    const quote = this.quotes.get(quoteId);
    if (!quote) {
      throw new Error(`Quote ${quoteId} not found`);
    }

    if (quote.validUntil < new Date()) {
      throw new Error('Quote has expired');
    }

    const provider = this.providers.get(quote.providerId);
    if (!provider) {
      throw new Error(`Provider ${quote.providerId} not found`);
    }

    const endDate = new Date(policyholderData.startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const policy: InsurancePolicy = {
      id: this.generateId(),
      providerId: quote.providerId,
      providerName: quote.providerName,
      productId: quote.productId,
      productName: quote.productName,
      policyNumber: this.generatePolicyNumber(),
      propertyId: quote.propertyId,
      propertyName: quote.propertyName,
      policyholderId: policyholderData.policyholderId,
      policyholderName: policyholderData.policyholderName,
      coverage: quote.coverage,
      premium: quote.premium,
      deductible: quote.deductible,
      startDate: policyholderData.startDate,
      endDate,
      status: 'active',
      premiumAmount: quote.estimatedAnnualPremium,
      nextPremiumDue: this.calculateNextPremiumDue(policyholderData.startDate, quote.premium.paymentFrequency),
      payments: [],
      claims: [],
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.policies.set(policy.id, policy);

    // Update provider stats
    provider.totalPoliciesIssued++;
    provider.totalPremiumValue += policy.premiumAmount;
    provider.updatedAt = new Date();
    this.providers.set(quote.providerId, provider);

    return policy;
  }

  /**
   * Generate policy number
   */
  private generatePolicyNumber(): string {
    return `POL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  /**
   * Calculate next premium due date
   */
  private calculateNextPremiumDue(startDate: Date, frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'): Date {
    const nextDue = new Date(startDate);
    
    switch (frequency) {
      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + 1);
        break;
      case 'quarterly':
        nextDue.setMonth(nextDue.getMonth() + 3);
        break;
      case 'semi_annual':
        nextDue.setMonth(nextDue.getMonth() + 6);
        break;
      case 'annual':
        nextDue.setFullYear(nextDue.getFullYear() + 1);
        break;
    }

    return nextDue;
  }

  /**
   * Submit insurance claim
   */
  submitClaim(claimData: Omit<Claim, 'id' | 'claimNumber' | 'status' | 'createdAt' | 'updatedAt'>): Claim {
    const policy = this.policies.get(claimData.policyId);
    if (!policy) {
      throw new Error(`Policy ${claimData.policyId} not found`);
    }

    if (policy.status !== 'active') {
      throw new Error('Policy must be active to submit claims');
    }

    const claim: Claim = {
      ...claimData,
      id: this.generateId(),
      claimNumber: this.generateClaimNumber(),
      status: 'reported',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.claims.set(claim.id, claim);
    policy.claims.push(claim);
    policy.updatedAt = new Date();

    this.policies.set(claim.policyId, policy);

    // Submit to provider API if integrated
    const provider = this.providers.get(policy.providerId);
    if (provider && provider.integrationStatus === 'active' && provider.apiCredentials) {
      this.submitClaimToProviderAPI(claim, provider);
    }

    return claim;
  }

  /**
   * Generate claim number
   */
  private generateClaimNumber(): string {
    return `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  /**
   * Submit claim to provider API
   */
  private submitClaimToProviderAPI(claim: Claim, provider: InsuranceProvider): void {
    // In production, this would make an actual API call to the provider
    console.warn(`Submitting claim ${claim.claimNumber} to ${provider.name} API`);
  }

  /**
   * Update claim status
   */
  updateClaimStatus(claimId: string, status: Claim['status'], metadata?: {
    approvedAmount?: number;
    assignedAdjuster?: string;
  }): Claim {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    claim.status = status;
    if (metadata) {
      Object.assign(claim, metadata);
    }
    claim.updatedAt = new Date();

    // Update policy
    const policy = this.policies.get(claim.policyId);
    if (policy) {
      const claimIndex = policy.claims.findIndex(c => c.id === claimId);
      if (claimIndex !== -1) {
        policy.claims[claimIndex] = claim;
        policy.updatedAt = new Date();
        this.policies.set(claim.policyId, policy);
      }
    }

    this.claims.set(claimId, claim);
    return claim;
  }

  /**
   * Process premium payment
   */
  processPremiumPayment(policyId: string, paymentData: {
    amount: number;
    method: string;
    reference: string;
  }): PremiumPayment {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const payment: PremiumPayment = {
      id: this.generateId(),
      policyId,
      amount: paymentData.amount,
      dueDate: policy.nextPremiumDue,
      paidDate: new Date(),
      method: paymentData.method,
      reference: paymentData.reference,
      status: 'paid'
    };

    policy.payments.push(payment);
    policy.nextPremiumDue = this.calculateNextPremiumDue(policy.nextPremiumDue, policy.premium.paymentFrequency);
    policy.updatedAt = new Date();

    this.policies.set(policyId, policy);
    return payment;
  }

  /**
   * Get insurance providers by type
   */
  getProviders(filters?: {
    type?: InsuranceProvider['type'];
    serviceAreas?: string[];
    minRating?: number;
    integrationStatus?: InsuranceProvider['integrationStatus'];
  }): InsuranceProvider[] {
    let providers = Array.from(this.providers.values());

    if (filters) {
      if (filters.type) {
        providers = providers.filter(p => p.type === filters.type);
      }

      if (filters.serviceAreas && filters.serviceAreas.length > 0) {
        providers = providers.filter(p =>
          filters.serviceAreas!.some(area => p.serviceAreas.includes(area))
        );
      }

      if (filters.minRating) {
        providers = providers.filter(p => p.rating >= filters.minRating!);
      }

      if (filters.integrationStatus) {
        providers = providers.filter(p => p.integrationStatus === filters.integrationStatus);
      }
    }

    return providers.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get provider products
   */
  getProviderProducts(providerId: string): InsuranceProduct[] {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    return provider.products;
  }

  /**
   * Get policies for property
   */
  getPropertyPolicies(propertyId: string, status?: InsurancePolicy['status']): InsurancePolicy[] {
    let policies = Array.from(this.policies.values()).filter(p => p.propertyId === propertyId);

    if (status) {
      policies = policies.filter(p => p.status === status);
    }

    return policies.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get policies for policyholder
   */
  getPolicyholderPolicies(policyholderId: string, status?: InsurancePolicy['status']): InsurancePolicy[] {
    let policies = Array.from(this.policies.values()).filter(p => p.policyholderId === policyholderId);

    if (status) {
      policies = policies.filter(p => p.status === status);
    }

    return policies.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get claims for policy
   */
  getPolicyClaims(policyId: string, status?: Claim['status']): Claim[] {
    let claims = Array.from(this.claims.values()).filter(c => c.policyId === policyId);

    if (status) {
      claims = claims.filter(c => c.status === status);
    }

    return claims.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Compare insurance quotes
   */
  compareQuotes(propertyId: string, coverage: CoverageDetails, filters?: {
    providerIds?: string[];
    productTypes?: InsuranceProduct['type'][];
    maxPremium?: number;
  }): InsuranceQuote[] {
    const quotes: InsuranceQuote[] = [];

    let providers = Array.from(this.providers.values()).filter(p => p.integrationStatus === 'active');

    if (filters?.providerIds) {
      providers = providers.filter(p => filters.providerIds!.includes(p.id));
    }

    providers.forEach(provider => {
      provider.products.forEach(product => {
        if (filters?.productTypes && !filters.productTypes.includes(product.type)) {
          return;
        }

        const estimatedPremium = this.calculatePremium(coverage, product.premium);

        if (filters?.maxPremium && estimatedPremium > filters.maxPremium) {
          return;
        }

        const quote: InsuranceQuote = {
          id: this.generateId(),
          providerId: provider.id,
          providerName: provider.name,
          productId: product.id,
          productName: product.name,
          propertyId,
          propertyName: 'Property', // Would be fetched from property data
          coverage,
          premium: product.premium,
          estimatedAnnualPremium: estimatedPremium,
          deductible: product.deductible,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          terms: product.exclusions,
          createdAt: new Date()
        };

        quotes.push(quote);
      });
    });

    return quotes.sort((a, b) => a.estimatedAnnualPremium - b.estimatedAnnualPremium);
  }

  /**
   * Verify coverage
   */
  verifyCoverage(propertyId: string, coverageType: string): {
    covered: boolean;
    policyId?: string;
    policyNumber?: string;
    providerName?: string;
    coverageAmount?: number;
    expiryDate?: Date;
  } {
    const policies = this.getPropertyPolicies(propertyId, 'active');

    for (const policy of policies) {
      if (coverageType === 'property' && policy.coverage.propertyDamage > 0) {
        return {
          covered: true,
          policyId: policy.id,
          policyNumber: policy.policyNumber,
          providerName: policy.providerName,
          coverageAmount: policy.coverage.propertyDamage,
          expiryDate: policy.endDate
        };
      }

      if (coverageType === 'liability' && policy.coverage.liability > 0) {
        return {
          covered: true,
          policyId: policy.id,
          policyNumber: policy.policyNumber,
          providerName: policy.providerName,
          coverageAmount: policy.coverage.liability,
          expiryDate: policy.endDate
        };
      }
    }

    return { covered: false };
  }

  /**
   * Get insurance marketplace overview
   */
  getMarketplaceOverview(): {
    totalProviders: number;
    activeProviders: number;
    totalPolicies: number;
    activePolicies: number;
    totalClaims: number;
    openClaims: number;
    totalPremiumValue: number;
    averageClaimsResponseTime: number;
    averageClaimsApprovalRate: number;
    providerDistribution: { type: string; count: number }[];
    productDistribution: { type: string; count: number }[];
  } {
    const providers = Array.from(this.providers.values());
    const policies = Array.from(this.policies.values());
    const claims = Array.from(this.claims.values());

    const activeProviders = providers.filter(p => p.integrationStatus === 'active').length;
    const activePolicies = policies.filter(p => p.status === 'active').length;
    const openClaims = claims.filter(c => ['reported', 'under_review', 'in_progress'].includes(c.status)).length;
    const totalPremiumValue = policies.filter(p => p.status === 'active').reduce((sum, p) => sum + p.premiumAmount, 0);

    const averageClaimsResponseTime = providers.length > 0
      ? providers.reduce((sum, p) => sum + p.averageClaimsResponseTime, 0) / providers.length
      : 0;

    const averageClaimsApprovalRate = providers.length > 0
      ? providers.reduce((sum, p) => sum + p.claimsApprovalRate, 0) / providers.length
      : 0;

    // Provider distribution
    const providerTypeMap = new Map<string, number>();
    providers.forEach(p => {
      const current = providerTypeMap.get(p.type) || 0;
      providerTypeMap.set(p.type, current + 1);
    });

    const providerDistribution = Array.from(providerTypeMap.entries())
      .map(([type, count]) => ({ type, count }));

    // Product distribution
    const productTypeMap = new Map<string, number>();
    providers.forEach(p => {
      p.products.forEach(prod => {
        const current = productTypeMap.get(prod.type) || 0;
        productTypeMap.set(prod.type, current + 1);
      });
    });

    const productDistribution = Array.from(productTypeMap.entries())
      .map(([type, count]) => ({ type, count }));

    return {
      totalProviders: providers.length,
      activeProviders,
      totalPolicies: policies.length,
      activePolicies,
      totalClaims: claims.length,
      openClaims,
      totalPremiumValue,
      averageClaimsResponseTime,
      averageClaimsApprovalRate,
      providerDistribution,
      productDistribution
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
