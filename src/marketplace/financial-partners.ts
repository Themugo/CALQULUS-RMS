/**
 * Financial Partners Integration
 * 
 * Manages financial ecosystem for property financing and services:
 * - Bank and lender partnerships
 * - Loan application and processing
 * - Mortgage management
 * - Credit facility management
 * - Payment processing integration
 * - Financial product marketplace
 */

export interface FinancialPartner {
  id: string;
  name: string;
  type: 'bank' | 'lender' | 'fintech' | 'credit_union' | 'microfinance';
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
  products: FinancialProduct[];
  serviceAreas: string[];
  rating: number;
  reviewCount: number;
  totalLoansIssued: number;
  totalLoanValue: number;
  averageInterestRate: number;
  approvalRate: number;
  processingTime: number; // in days
  minimumLoanAmount: number;
  maximumLoanAmount: number;
  integrationStatus: 'not_integrated' | 'pending' | 'integrated' | 'active';
  apiCredentials?: APICredentials;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinancialProduct {
  id: string;
  name: string;
  type: 'mortgage' | 'property_loan' | 'working_capital' | 'equipment_financing' | 'renovation_loan' | 'bridge_loan';
  description: string;
  interestRate: number;
  interestRateType: 'fixed' | 'variable' | 'floating';
  term: number; // in months
  minimumAmount: number;
  maximumAmount: number;
  repaymentSchedule: 'monthly' | 'quarterly' | 'bi_annual' | 'annual' | 'bullet';
  fees: {
    applicationFee: number;
    processingFee: number;
    originationFee: number;
    earlyRepaymentFee: number;
  };
  requirements: LoanRequirement[];
  eligibility: EligibilityCriteria;
  features: string[];
}

export interface LoanRequirement {
  type: string;
  description: string;
  required: boolean;
}

export interface EligibilityCriteria {
  minimumCreditScore: number;
  minimumIncome: number;
  minimumYearsInBusiness: number;
  maximumDebtToIncomeRatio: number;
  collateralRequired: boolean;
  documentationRequired: string[];
}

export interface APICredentials {
  apiKey: string;
  apiSecret: string;
  webhookUrl?: string;
  environment: 'sandbox' | 'production';
}

export interface LoanApplication {
  id: string;
  partnerId: string;
  partnerName: string;
  productId: string;
  productName: string;
  applicantId: string;
  applicantName: string;
  propertyId: string;
  propertyName: string;
  loanAmount: number;
  loanPurpose: string;
  term: number;
  interestRate: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'funded' | 'repaid' | 'defaulted';
  submittedAt: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  fundedAt?: Date;
  rejectionReason?: string;
  documents: LoanDocument[];
  collateral: CollateralInfo;
  repaymentSchedule: RepaymentSchedule[];
  payments: LoanPayment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  uploadedAt: Date;
  verifiedAt?: Date;
}

export interface CollateralInfo {
  type: 'property' | 'equipment' | 'inventory' | 'accounts_receivable' | 'other';
  description: string;
  value: number;
  location?: string;
  documents: string[];
}

export interface RepaymentSchedule {
  id: string;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  balance: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  paidAt?: Date;
}

export interface LoanPayment {
  id: string;
  scheduleId: string;
  amount: number;
  paidAt: Date;
  method: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed';
}

export class FinancialPartners {
  private partners: Map<string, FinancialPartner>;
  private loanApplications: Map<string, LoanApplication>;
  private paymentProcessors: Map<string, PaymentProcessor>;

  constructor() {
    this.partners = new Map();
    this.loanApplications = new Map();
    this.paymentProcessors = new Map();
  }

  /**
   * Register a financial partner
   */
  registerPartner(partnerData: Omit<FinancialPartner, 'id' | 'rating' | 'reviewCount' | 'totalLoansIssued' | 'totalLoanValue' | 'integrationStatus' | 'createdAt' | 'updatedAt'>): FinancialPartner {
    const partner: FinancialPartner = {
      ...partnerData,
      id: this.generateId(),
      rating: 0,
      reviewCount: 0,
      totalLoansIssued: 0,
      totalLoanValue: 0,
      integrationStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.partners.set(partner.id, partner);
    return partner;
  }

  /**
   * Integrate partner API
   */
  integratePartnerAPI(partnerId: string, apiCredentials: APICredentials): FinancialPartner {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner ${partnerId} not found`);
    }

    partner.apiCredentials = apiCredentials;
    partner.integrationStatus = 'integrated';
    partner.updatedAt = new Date();

    this.partners.set(partnerId, partner);
    return partner;
  }

  /**
   * Activate partner integration
   */
  activatePartner(partnerId: string): FinancialPartner {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner ${partnerId} not found`);
    }

    if (partner.integrationStatus !== 'integrated') {
      throw new Error('Partner must be integrated before activation');
    }

    partner.integrationStatus = 'active';
    partner.updatedAt = new Date();

    this.partners.set(partnerId, partner);
    return partner;
  }

  /**
   * Submit loan application
   */
  submitLoanApplication(applicationData: Omit<LoanApplication, 'id' | 'status' | 'submittedAt' | 'repaymentSchedule' | 'payments' | 'createdAt' | 'updatedAt'>): LoanApplication {
    const partner = this.partners.get(applicationData.partnerId);
    if (!partner) {
      throw new Error(`Partner ${applicationData.partnerId} not found`);
    }

    const product = partner.products.find(p => p.id === applicationData.productId);
    if (!product) {
      throw new Error(`Product ${applicationData.productId} not found`);
    }

    // Validate loan amount
    if (applicationData.loanAmount < product.minimumAmount || applicationData.loanAmount > product.maximumAmount) {
      throw new Error(`Loan amount must be between ${product.minimumAmount} and ${product.maximumAmount}`);
    }

    const application: LoanApplication = {
      ...applicationData,
      id: this.generateId(),
      status: 'submitted',
      submittedAt: new Date(),
      repaymentSchedule: this.generateRepaymentSchedule(applicationData.loanAmount, product.interestRate, applicationData.term, product.repaymentSchedule),
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.loanApplications.set(application.id, application);

    // Submit to partner API if integrated
    if (partner.integrationStatus === 'active' && partner.apiCredentials) {
      this.submitToPartnerAPI(application, partner);
    }

    return application;
  }

  /**
   * Generate repayment schedule
   */
  private generateRepaymentSchedule(principal: number, annualRate: number, termMonths: number, frequency: 'monthly' | 'quarterly' | 'bi_annual' | 'annual' | 'bullet'): RepaymentSchedule[] {
    const schedule: RepaymentSchedule[] = [];
    const monthlyRate = annualRate / 12 / 100;
    
    let periodsPerYear: number;
    switch (frequency) {
      case 'monthly': periodsPerYear = 12; break;
      case 'quarterly': periodsPerYear = 4; break;
      case 'bi_annual': periodsPerYear = 2; break;
      case 'annual': periodsPerYear = 1; break;
      case 'bullet': periodsPerYear = 1; break;
    }

    const totalPeriods = frequency === 'bullet' ? 1 : termMonths;
    const periodRate = annualRate / periodsPerYear / 100;
    const periodPayment = frequency === 'bullet' 
      ? principal * (1 + periodRate * (termMonths / 12))
      : (principal * periodRate * Math.pow(1 + periodRate, totalPeriods)) / (Math.pow(1 + periodRate, totalPeriods) - 1);

    let balance = principal;
    const startDate = new Date();

    for (let i = 0; i < totalPeriods; i++) {
      const interestAmount = balance * periodRate;
      const principalAmount = periodPayment - interestAmount;
      balance -= principalAmount;

      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + (frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : frequency === 'bi_annual' ? 6 : 12));

      schedule.push({
        id: this.generateId(),
        dueDate,
        principalAmount: Math.max(principalAmount, 0),
        interestAmount,
        totalAmount: periodPayment,
        balance: Math.max(balance, 0),
        status: 'pending'
      });
    }

    return schedule;
  }

  /**
   * Submit application to partner API
   */
  private submitToPartnerAPI(application: LoanApplication, partner: FinancialPartner): void {
    // In production, this would make an actual API call to the partner
    console.warn(`Submitting application ${application.id} to ${partner.name} API`);
  }

  /**
   * Update loan application status
   */
  updateApplicationStatus(applicationId: string, status: LoanApplication['status'], metadata?: {
    reviewedAt?: Date;
    approvedAt?: Date;
    fundedAt?: Date;
    rejectionReason?: string;
  }): LoanApplication {
    const application = this.loanApplications.get(applicationId);
    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    application.status = status;
    if (metadata) {
      Object.assign(application, metadata);
    }
    application.updatedAt = new Date();

    // Update partner stats if approved or funded
    if (status === 'approved' || status === 'funded') {
      const partner = this.partners.get(application.partnerId);
      if (partner) {
        partner.totalLoansIssued++;
        partner.totalLoanValue += application.loanAmount;
        partner.updatedAt = new Date();
        this.partners.set(application.partnerId, partner);
      }
    }

    this.loanApplications.set(applicationId, application);
    return application;
  }

  /**
   * Process loan payment
   */
  processPayment(applicationId: string, scheduleId: string, paymentData: {
    amount: number;
    method: string;
    reference: string;
  }): LoanPayment {
    const application = this.loanApplications.get(applicationId);
    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    const schedule = application.repaymentSchedule.find(s => s.id === scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    const payment: LoanPayment = {
      id: this.generateId(),
      scheduleId,
      amount: paymentData.amount,
      paidAt: new Date(),
      method: paymentData.method,
      reference: paymentData.reference,
      status: 'completed'
    };

    application.payments.push(payment);
    schedule.status = 'paid';
    schedule.paidAt = new Date();
    application.updatedAt = new Date();

    this.loanApplications.set(applicationId, application);
    return payment;
  }

  /**
   * Get financial partners by type
   */
  getPartners(filters?: {
    type?: FinancialPartner['type'];
    serviceAreas?: string[];
    minRating?: number;
    integrationStatus?: FinancialPartner['integrationStatus'];
    minLoanAmount?: number;
    maxLoanAmount?: number;
  }): FinancialPartner[] {
    let partners = Array.from(this.partners.values());

    if (filters) {
      if (filters.type) {
        partners = partners.filter(p => p.type === filters.type);
      }

      if (filters.serviceAreas && filters.serviceAreas.length > 0) {
        partners = partners.filter(p =>
          filters.serviceAreas!.some(area => p.serviceAreas.includes(area))
        );
      }

      if (filters.minRating) {
        partners = partners.filter(p => p.rating >= filters.minRating!);
      }

      if (filters.integrationStatus) {
        partners = partners.filter(p => p.integrationStatus === filters.integrationStatus);
      }

      if (filters.minLoanAmount) {
        partners = partners.filter(p => p.minimumLoanAmount <= filters.minLoanAmount!);
      }

      if (filters.maxLoanAmount) {
        partners = partners.filter(p => p.maximumLoanAmount >= filters.maxLoanAmount!);
      }
    }

    return partners.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get partner products
   */
  getPartnerProducts(partnerId: string): FinancialProduct[] {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner ${partnerId} not found`);
    }

    return partner.products;
  }

  /**
   * Get loan applications for applicant
   */
  getApplicantApplications(applicantId: string, status?: LoanApplication['status']): LoanApplication[] {
    let applications = Array.from(this.loanApplications.values()).filter(
      app => app.applicantId === applicantId
    );

    if (status) {
      applications = applications.filter(app => app.status === status);
    }

    return applications.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  /**
   * Get loan applications for property
   */
  getPropertyApplications(propertyId: string): LoanApplication[] {
    return Array.from(this.loanApplications.values())
      .filter(app => app.propertyId === propertyId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  /**
   * Compare loan offers
   */
  compareLoanOffers(loanAmount: number, term: number, filters?: {
    partnerIds?: string[];
    productTypes?: FinancialProduct['type'][];
    maxInterestRate?: number;
  }): {
    partnerId: string;
    partnerName: string;
    productId: string;
    productName: string;
    interestRate: number;
    monthlyPayment: number;
    totalPayment: number;
    totalInterest: number;
    fees: number;
    approvalRate: number;
    processingTime: number;
  }[] {
    const offers: any[] = [];

    let partners = Array.from(this.partners.values()).filter(p => p.integrationStatus === 'active');

    if (filters?.partnerIds) {
      partners = partners.filter(p => filters.partnerIds!.includes(p.id));
    }

    partners.forEach(partner => {
      partner.products.forEach(product => {
        if (filters?.productTypes && !filters.productTypes.includes(product.type)) {
          return;
        }

        if (filters?.maxInterestRate && product.interestRate > filters.maxInterestRate) {
          return;
        }

        if (loanAmount < product.minimumAmount || loanAmount > product.maximumAmount) {
          return;
        }

        const monthlyRate = product.interestRate / 12 / 100;
        const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
        const totalPayment = monthlyPayment * term;
        const totalInterest = totalPayment - loanAmount;
        const totalFees = product.fees.applicationFee + product.fees.processingFee + product.fees.originationFee;

        offers.push({
          partnerId: partner.id,
          partnerName: partner.name,
          productId: product.id,
          productName: product.name,
          interestRate: product.interestRate,
          monthlyPayment,
          totalPayment,
          totalInterest,
          fees: totalFees,
          approvalRate: partner.approvalRate,
          processingTime: partner.processingTime
        });
      });
    });

    return offers.sort((a, b) => a.totalPayment - b.totalPayment);
  }

  /**
   * Register payment processor
   */
  registerPaymentProcessor(processorData: {
    id: string;
    name: string;
    type: 'mpesa' | 'card' | 'bank_transfer' | 'mobile_money';
    apiKey: string;
    apiSecret: string;
    webhookUrl?: string;
  }): PaymentProcessor {
    const processor: PaymentProcessor = {
      ...processorData,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.paymentProcessors.set(processor.id, processor);
    return processor;
  }

  /**
   * Process payment through processor
   */
  processPaymentThroughProcessor(processorId: string, paymentData: {
    amount: number;
    currency: string;
    accountNumber: string;
    accountName: string;
    reference: string;
  }): {
    success: boolean;
    transactionId?: string;
    error?: string;
  } {
    const processor = this.paymentProcessors.get(processorId);
    if (!processor) {
      return { success: false, error: 'Payment processor not found' };
    }

    // In production, this would make an actual API call to the payment processor
    console.warn(`Processing payment of ${paymentData.amount} through ${processor.name}`);

    return {
      success: true,
      transactionId: this.generateId()
    };
  }

  /**
   * Get financial marketplace overview
   */
  getMarketplaceOverview(): {
    totalPartners: number;
    activePartners: number;
    totalApplications: number;
    approvedApplications: number;
    fundedApplications: number;
    totalLoanValue: number;
    averageInterestRate: number;
    averageApprovalRate: number;
    partnerDistribution: { type: string; count: number }[];
    productDistribution: { type: string; count: number }[];
  } {
    const partners = Array.from(this.partners.values());
    const applications = Array.from(this.loanApplications.values());

    const activePartners = partners.filter(p => p.integrationStatus === 'active').length;
    const approvedApplications = applications.filter(a => a.status === 'approved' || a.status === 'funded').length;
    const fundedApplications = applications.filter(a => a.status === 'funded').length;
    const totalLoanValue = applications.filter(a => a.status === 'funded').reduce((sum, a) => sum + a.loanAmount, 0);

    const averageInterestRate = partners.length > 0
      ? partners.reduce((sum, p) => sum + p.averageInterestRate, 0) / partners.length
      : 0;

    const averageApprovalRate = partners.length > 0
      ? partners.reduce((sum, p) => sum + p.approvalRate, 0) / partners.length
      : 0;

    // Partner distribution
    const partnerTypeMap = new Map<string, number>();
    partners.forEach(p => {
      const current = partnerTypeMap.get(p.type) || 0;
      partnerTypeMap.set(p.type, current + 1);
    });

    const partnerDistribution = Array.from(partnerTypeMap.entries())
      .map(([type, count]) => ({ type, count }));

    // Product distribution
    const productTypeMap = new Map<string, number>();
    partners.forEach(p => {
      p.products.forEach(prod => {
        const current = productTypeMap.get(prod.type) || 0;
        productTypeMap.set(prod.type, current + 1);
      });
    });

    const productDistribution = Array.from(productTypeMap.entries())
      .map(([type, count]) => ({ type, count }));

    return {
      totalPartners: partners.length,
      activePartners,
      totalApplications: applications.length,
      approvedApplications,
      fundedApplications,
      totalLoanValue,
      averageInterestRate,
      averageApprovalRate,
      partnerDistribution,
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

export interface PaymentProcessor {
  id: string;
  name: string;
  type: 'mpesa' | 'card' | 'bank_transfer' | 'mobile_money';
  apiKey: string;
  apiSecret: string;
  webhookUrl?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}
