/**
 * Landlord Financing
 * 
 * Implements landlord financing solutions with:
 * - Loan application processing
 * - Property valuation
 * - Loan approval workflow
 * - Repayment scheduling
 * - Interest calculation
 * - Lender integration
 * - Risk assessment
 */

// Loan type
export enum LoanType {
  PROPERTY_PURCHASE = 'property_purchase',
  RENOVATION = 'renovation',
  REFINANCE = 'refinance',
  BRIDGE_LOAN = 'bridge_loan',
  CONSTRUCTION = 'construction',
  WORKING_CAPITAL = 'working_capital',
}

// Loan status
export enum LoanStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FUNDED = 'funded',
  ACTIVE = 'active',
  PAID_OFF = 'paid_off',
  DEFAULTED = 'defaulted',
}

// Lender
export interface Lender {
  id: string;
  name: string;
  type: 'bank' | 'credit_union' | 'private_lender' | 'government';
  apiEndpoint: string;
  apiKey?: string;
  supportedLoanTypes: LoanType[];
  interestRateRange: { min: number; max: number };
  maxLoanAmount: number;
  minCreditScore: number;
  isActive: boolean;
}

// Loan application
export interface LoanApplication {
  id: string;
  landlordId: string;
  lenderId: string;
  loanType: LoanType;
  propertyId: string;
  requestedAmount: number;
  purpose: string;
  term: number; // months
  status: LoanStatus;
  creditScore: number;
  annualIncome: number;
  debtToIncomeRatio: number;
  propertyValue: number;
  loanToValueRatio: number;
  documents: string[];
  submittedAt: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  fundedAt?: Date;
  rejectionReason?: string;
}

// Loan offer
export interface LoanOffer {
  id: string;
  applicationId: string;
  lenderId: string;
  offeredAmount: number;
  interestRate: number;
  term: number; // months
  monthlyPayment: number;
  originationFee: number;
  closingCosts: number;
  apr: number;
  validUntil: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
}

// Loan
export interface Loan {
  id: string;
  applicationId: string;
  lenderId: string;
  landlordId: string;
  propertyId: string;
  loanType: LoanType;
  principalAmount: number;
  interestRate: number;
  term: number; // months
  monthlyPayment: number;
  startDate: Date;
  endDate: Date;
  status: LoanStatus;
  balance: number;
  paidAmount: number;
  nextPaymentDate: Date;
  createdAt: Date;
}

// Repayment schedule
export interface RepaymentSchedule {
  loanId: string;
  payments: RepaymentPayment[];
}

// Repayment payment
export interface RepaymentPayment {
  paymentNumber: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalPayment: number;
  remainingBalance: number;
  status: 'scheduled' | 'paid' | 'late' | 'missed';
  paidDate?: Date;
}

/**
 * Create loan application
 */
export function createLoanApplication(
  landlordId: string,
  lenderId: string,
  loanType: LoanType,
  propertyId: string,
  requestedAmount: number,
  purpose: string,
  term: number,
  creditScore: number,
  annualIncome: number,
  debtToIncomeRatio: number,
  propertyValue: number
): LoanApplication {
  const loanToValueRatio = requestedAmount / propertyValue;
  
  return {
    id: `loan_app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    landlordId,
    lenderId,
    loanType,
    propertyId,
    requestedAmount,
    purpose,
    term,
    status: LoanStatus.PENDING,
    creditScore,
    annualIncome,
    debtToIncomeRatio,
    propertyValue,
    loanToValueRatio,
    documents: [],
    submittedAt: new Date(),
  };
}

/**
 * Submit loan application
 */
export function submitLoanApplication(
  application: LoanApplication,
  documents: string[]
): LoanApplication {
  return {
    ...application,
    documents,
    status: LoanStatus.UNDER_REVIEW,
    submittedAt: new Date(),
  };
}

/**
 * Assess loan application
 */
export function assessLoanApplication(
  application: LoanApplication,
  lender: Lender
): {
  isEligible: boolean;
  riskScore: number; // 0-100
  factors: string[];
  recommendedAmount?: number;
  recommendedRate?: number;
} {
  const factors: string[] = [];
  let riskScore = 0;
  
  // Credit score check
  if (application.creditScore < lender.minCreditScore) {
    factors.push(`Credit score ${application.creditScore} below minimum ${lender.minCreditScore}`);
    riskScore += 30;
  } else if (application.creditScore >= 750) {
    factors.push('Excellent credit score');
    riskScore -= 10;
  }
  
  // Debt to income ratio check
  if (application.debtToIncomeRatio > 0.5) {
    factors.push(`High debt-to-income ratio: ${(application.debtToIncomeRatio * 100).toFixed(0)}%`);
    riskScore += 25;
  } else if (application.debtToIncomeRatio < 0.3) {
    factors.push('Low debt-to-income ratio');
    riskScore -= 10;
  }
  
  // Loan to value ratio check
  if (application.loanToValueRatio > 0.8) {
    factors.push(`High loan-to-value ratio: ${(application.loanToValueRatio * 100).toFixed(0)}%`);
    riskScore += 20;
  } else if (application.loanToValueRatio < 0.6) {
    factors.push('Conservative loan-to-value ratio');
    riskScore -= 10;
  }
  
  // Amount check
  if (application.requestedAmount > lender.maxLoanAmount) {
    factors.push(`Requested amount exceeds lender maximum`);
    riskScore += 20;
  }
  
  // Loan type check
  if (!lender.supportedLoanTypes.includes(application.loanType)) {
    factors.push(`Loan type not supported by lender`);
    riskScore += 15;
  }
  
  // Ensure risk score is between 0 and 100
  riskScore = Math.max(0, Math.min(100, riskScore));
  
  const isEligible = riskScore < 50;
  
  let recommendedAmount: number | undefined;
  let recommendedRate: number | undefined;
  
  if (isEligible) {
    recommendedAmount = Math.min(application.requestedAmount, lender.maxLoanAmount);
    recommendedRate = lender.interestRateRange.min + (riskScore / 100) * (lender.interestRateRange.max - lender.interestRateRange.min);
  }
  
  return {
    isEligible,
    riskScore,
    factors,
    recommendedAmount,
    recommendedRate,
  };
}

/**
 * Generate loan offer
 */
export function generateLoanOffer(
  application: LoanApplication,
  lender: Lender,
  assessment: ReturnType<typeof assessLoanApplication>
): LoanOffer | null {
  if (!assessment.isEligible || !assessment.recommendedAmount || !assessment.recommendedRate) {
    return null;
  }
  
  const monthlyPayment = calculateMonthlyPayment(
    assessment.recommendedAmount,
    assessment.recommendedRate,
    application.term
  );
  
  const originationFee = assessment.recommendedAmount * 0.01; // 1% origination fee
  const closingCosts = assessment.recommendedAmount * 0.02; // 2% closing costs
  const apr = calculateAPR(
    assessment.recommendedAmount,
    assessment.recommendedRate,
    application.term,
    originationFee + closingCosts
  );
  
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  
  return {
    id: `loan_offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    applicationId: application.id,
    lenderId: lender.id,
    offeredAmount: assessment.recommendedAmount,
    interestRate: assessment.recommendedRate,
    term: application.term,
    monthlyPayment,
    originationFee,
    closingCosts,
    apr,
    validUntil,
    status: 'pending',
    createdAt: new Date(),
  };
}

/**
 * Calculate monthly payment
 */
function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 12 / 100;
  
  if (monthlyRate === 0) {
    return principal / termMonths;
  }
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  return payment;
}

/**
 * Calculate APR
 */
function calculateAPR(principal: number, annualRate: number, termMonths: number, totalFees: number): number {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termMonths);
  const financedAmount = principal - totalFees;
  
  // Use iterative method to find APR
  let apr = annualRate;
  const tolerance = 0.0001;
  const maxIterations = 100;
  
  for (let i = 0; i < maxIterations; i++) {
    const monthlyRate = apr / 12 / 100;
    const calculatedPayment = financedAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    
    if (Math.abs(calculatedPayment - monthlyPayment) < tolerance) {
      break;
    }
    
    apr += (calculatedPayment < monthlyPayment ? 0.01 : -0.01);
  }
  
  return apr;
}

/**
 * Accept loan offer
 */
export function acceptLoanOffer(offer: LoanOffer): LoanOffer {
  return {
    ...offer,
    status: 'accepted',
  };
}

/**
 * Reject loan offer
 */
export function rejectLoanOffer(offer: LoanOffer): LoanOffer {
  return {
    ...offer,
    status: 'rejected',
  };
}

/**
 * Create loan from offer
 */
export function createLoanFromOffer(
  offer: LoanOffer,
  application: LoanApplication
): Loan {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + offer.term);
  
  const nextPaymentDate = new Date(startDate);
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
  
  return {
    id: `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    applicationId: application.id,
    lenderId: offer.lenderId,
    landlordId: application.landlordId,
    propertyId: application.propertyId,
    loanType: application.loanType,
    principalAmount: offer.offeredAmount,
    interestRate: offer.interestRate,
    term: offer.term,
    monthlyPayment: offer.monthlyPayment,
    startDate,
    endDate,
    status: LoanStatus.FUNDED,
    balance: offer.offeredAmount,
    paidAmount: 0,
    nextPaymentDate,
    createdAt: new Date(),
  };
}

/**
 * Generate repayment schedule
 */
export function generateRepaymentSchedule(loan: Loan): RepaymentSchedule {
  const payments: RepaymentPayment[] = [];
  const monthlyRate = loan.interestRate / 12 / 100;
  let remainingBalance = loan.principalAmount;
  
  for (let i = 1; i <= loan.term; i++) {
    const dueDate = new Date(loan.startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    
    const interestAmount = remainingBalance * monthlyRate;
    const principalAmount = loan.monthlyPayment - interestAmount;
    remainingBalance -= principalAmount;
    
    payments.push({
      paymentNumber: i,
      dueDate,
      principalAmount,
      interestAmount,
      totalPayment: loan.monthlyPayment,
      remainingBalance: Math.max(0, remainingBalance),
      status: 'scheduled',
    });
  }
  
  return {
    loanId: loan.id,
    payments,
  };
}

/**
 * Process payment
 */
export function processPayment(
  loan: Loan,
  paymentAmount: number,
  _paymentDate: Date
): Loan {
  const newBalance = loan.balance - paymentAmount;
  const newPaidAmount = loan.paidAmount + paymentAmount;
  
  // Calculate next payment date
  const nextPaymentDate = new Date(loan.nextPaymentDate);
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
  
  let newStatus = loan.status;
  if (newBalance <= 0) {
    newStatus = LoanStatus.PAID_OFF;
  }
  
  return {
    ...loan,
    balance: Math.max(0, newBalance),
    paidAmount: newPaidAmount,
    nextPaymentDate,
    status: newStatus,
  };
}

/**
 * Get loan type label
 */
export function getLoanTypeLabel(type: LoanType): string {
  const labels: Record<LoanType, string> = {
    [LoanType.PROPERTY_PURCHASE]: 'Property Purchase',
    [LoanType.RENOVATION]: 'Renovation',
    [LoanType.REFINANCE]: 'Refinance',
    [LoanType.BRIDGE_LOAN]: 'Bridge Loan',
    [LoanType.CONSTRUCTION]: 'Construction',
    [LoanType.WORKING_CAPITAL]: 'Working Capital',
  };

  return labels[type];
}

/**
 * Get loan status label
 */
export function getLoanStatusLabel(status: LoanStatus): string {
  const labels: Record<LoanStatus, string> = {
    [LoanStatus.PENDING]: 'Pending',
    [LoanStatus.UNDER_REVIEW]: 'Under Review',
    [LoanStatus.APPROVED]: 'Approved',
    [LoanStatus.REJECTED]: 'Rejected',
    [LoanStatus.FUNDED]: 'Funded',
    [LoanStatus.ACTIVE]: 'Active',
    [LoanStatus.PAID_OFF]: 'Paid Off',
    [LoanStatus.DEFAULTED]: 'Defaulted',
  };

  return labels[status];
}

/**
 * Get financing statistics
 */
export function getFinancingStatistics(
  applications: LoanApplication[],
  loans: Loan[]
): {
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  totalLoans: number;
  activeLoans: number;
  paidOffLoans: number;
  defaultedLoans: number;
  totalPrincipal: number;
  totalBalance: number;
  byLoanType: Record<LoanType, number>;
  byStatus: Record<LoanStatus, number>;
} {
  const approvedApplications = applications.filter(a => a.status === LoanStatus.APPROVED || a.status === LoanStatus.FUNDED).length;
  const rejectedApplications = applications.filter(a => a.status === LoanStatus.REJECTED).length;
  const pendingApplications = applications.filter(a => a.status === LoanStatus.PENDING || a.status === LoanStatus.UNDER_REVIEW).length;
  
  const activeLoans = loans.filter(l => l.status === LoanStatus.ACTIVE).length;
  const paidOffLoans = loans.filter(l => l.status === LoanStatus.PAID_OFF).length;
  const defaultedLoans = loans.filter(l => l.status === LoanStatus.DEFAULTED).length;
  
  const totalPrincipal = loans.reduce((sum, l) => sum + l.principalAmount, 0);
  const totalBalance = loans.reduce((sum, l) => sum + l.balance, 0);
  
  const byLoanType: Record<LoanType, number> = {
    [LoanType.PROPERTY_PURCHASE]: 0,
    [LoanType.RENOVATION]: 0,
    [LoanType.REFINANCE]: 0,
    [LoanType.BRIDGE_LOAN]: 0,
    [LoanType.CONSTRUCTION]: 0,
    [LoanType.WORKING_CAPITAL]: 0,
  };
  
  const byStatus: Record<LoanStatus, number> = {
    [LoanStatus.PENDING]: 0,
    [LoanStatus.UNDER_REVIEW]: 0,
    [LoanStatus.APPROVED]: 0,
    [LoanStatus.REJECTED]: 0,
    [LoanStatus.FUNDED]: 0,
    [LoanStatus.ACTIVE]: 0,
    [LoanStatus.PAID_OFF]: 0,
    [LoanStatus.DEFAULTED]: 0,
  };
  
  for (const application of applications) {
    byLoanType[application.loanType]++;
    byStatus[application.status]++;
  }
  
  for (const loan of loans) {
    byLoanType[loan.loanType]++;
    byStatus[loan.status]++;
  }
  
  return {
    totalApplications: applications.length,
    approvedApplications,
    rejectedApplications,
    pendingApplications,
    totalLoans: loans.length,
    activeLoans,
    paidOffLoans,
    defaultedLoans,
    totalPrincipal,
    totalBalance,
    byLoanType,
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
