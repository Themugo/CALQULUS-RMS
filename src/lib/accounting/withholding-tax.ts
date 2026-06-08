/**
 * Withholding Tax System
 * 
 * Handles withholding tax calculation and management:
 * - Withholding tax calculation
 * - Withholding tax certificates
 * - Payment tracking
 * - Compliance reporting
 * - KRA integration (Kenya Revenue Authority)
 */

import { JournalEntry, TransactionStatus } from './journal-system';
import { TaxType, TaxRate, calculateTax } from './tax-reporting';

// Withholding tax category
export enum WithholdingTaxCategory {
  PROFESSIONAL_SERVICES = 'professional_services',
  CONSULTING = 'consulting',
  MANAGEMENT = 'management',
  TRAINING = 'training',
  SUPPLY = 'supply',
  CONSTRUCTION = 'construction',
  RENT = 'rent',
  INTEREST = 'interest',
  ROYALTIES = 'royalties',
  DIVIDENDS = 'dividends',
}

// Withholding tax certificate
export interface WithholdingTaxCertificate {
  id: string;
  certificateNumber: string;
  payerId: string;
  payerName: string;
  payerTaxId: string;
  recipientId: string;
  recipientName: string;
  recipientTaxId: string;
  category: WithholdingTaxCategory;
  paymentAmount: number;
  withholdingRate: number;
  withholdingAmount: number;
  paymentDate: Date;
  certificateDate: Date;
  period: string; // e.g., "2024-Q1"
  status: 'draft' | 'issued' | 'submitted' | 'acknowledged';
  submittedToKRA?: Date;
  kraAcknowledgmentNumber?: string;
  kraAcknowledgmentDate?: Date;
  createdAt: Date;
  createdBy: string;
}

// Withholding tax payment
export interface WithholdingTaxPayment {
  id: string;
  certificateId: string;
  paymentDate: Date;
  amount: number;
  paymentMethod: 'bank_transfer' | 'mpesa' | 'cheque' | 'cash';
  referenceNumber?: string;
  bankName?: string;
  accountNumber?: string;
  createdAt: Date;
  createdBy: string;
}

// Withholding tax configuration
export interface WithholdingTaxConfig {
  category: WithholdingTaxCategory;
  rate: number;
  threshold: number; // Minimum amount before withholding applies
  description: string;
  kraTaxCode?: string;
}

// Default withholding tax rates for Kenya
const DEFAULT_WITHHOLDING_TAX_CONFIGS: WithholdingTaxConfig[] = [
  {
    category: WithholdingTaxCategory.PROFESSIONAL_SERVICES,
    rate: 5,
    threshold: 24000,
    description: 'Professional services',
    kraTaxCode: 'WHT-001',
  },
  {
    category: WithholdingTaxCategory.CONSULTING,
    rate: 10,
    threshold: 24000,
    description: 'Consulting services',
    kraTaxCode: 'WHT-002',
  },
  {
    category: WithholdingTaxCategory.MANAGEMENT,
    rate: 10,
    threshold: 24000,
    description: 'Management fees',
    kraTaxCode: 'WHT-003',
  },
  {
    category: WithholdingTaxCategory.TRAINING,
    rate: 5,
    threshold: 24000,
    description: 'Training services',
    kraTaxCode: 'WHT-004',
  },
  {
    category: WithholdingTaxCategory.SUPPLY,
    rate: 5,
    threshold: 24000,
    description: 'Supply of goods',
    kraTaxCode: 'WHT-005',
  },
  {
    category: WithholdingTaxCategory.CONSTRUCTION,
    rate: 5,
    threshold: 24000,
    description: 'Construction contracts',
    kraTaxCode: 'WHT-006',
  },
  {
    category: WithholdingTaxCategory.RENT,
    rate: 10,
    threshold: 24000,
    description: 'Rent payments',
    kraTaxCode: 'WHT-007',
  },
  {
    category: WithholdingTaxCategory.INTEREST,
    rate: 15,
    threshold: 0,
    description: 'Interest payments',
    kraTaxCode: 'WHT-008',
  },
  {
    category: WithholdingTaxCategory.ROYALTIES,
    rate: 5,
    threshold: 0,
    description: 'Royalty payments',
    kraTaxCode: 'WHT-009',
  },
  {
    category: WithholdingTaxCategory.DIVIDENDS,
    rate: 5,
    threshold: 0,
    description: 'Dividend payments',
    kraTaxCode: 'WHT-010',
  },
];

/**
 * Calculate withholding tax
 */
export function calculateWithholdingTax(
  paymentAmount: number,
  category: WithholdingTaxCategory,
  configs: WithholdingTaxConfig[] = DEFAULT_WITHHOLDING_TAX_CONFIGS
): { amount: number; rate: number; applies: boolean } {
  const config = configs.find(c => c.category === category);
  
  if (!config) {
    return { amount: 0, rate: 0, applies: false };
  }
  
  // Check if threshold is met
  if (paymentAmount < config.threshold) {
    return { amount: 0, rate: config.rate, applies: false };
  }
  
  const withholdingAmount = (paymentAmount * config.rate) / 100;
  
  return {
    amount: withholdingAmount,
    rate: config.rate,
    applies: true,
  };
}

/**
 * Create withholding tax certificate
 */
export function createWithholdingTaxCertificate(
  payerId: string,
  payerName: string,
  payerTaxId: string,
  recipientId: string,
  recipientName: string,
  recipientTaxId: string,
  category: WithholdingTaxCategory,
  paymentAmount: number,
  paymentDate: Date,
  period: string,
  userId: string
): WithholdingTaxCertificate {
  const calculation = calculateWithholdingTax(paymentAmount, category);
  
  return {
    id: `wht_cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    certificateNumber: generateCertificateNumber(period),
    payerId,
    payerName,
    payerTaxId,
    recipientId,
    recipientName,
    recipientTaxId,
    category,
    paymentAmount,
    withholdingRate: calculation.rate,
    withholdingAmount: calculation.amount,
    paymentDate,
    certificateDate: new Date(),
    period,
    status: 'draft',
    createdAt: new Date(),
    createdBy: userId,
  };
}

/**
 * Generate certificate number
 */
export function generateCertificateNumber(period: string): string {
  const year = period.split('-')[0] || new Date().getFullYear();
  const sequence = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `WHT-${year}-${sequence}`;
}

/**
 * Issue withholding tax certificate
 */
export function issueWithholdingTaxCertificate(
  certificate: WithholdingTaxCertificate
): WithholdingTaxCertificate {
  if (certificate.status !== 'draft') {
    throw new Error('Only draft certificates can be issued');
  }
  
  return {
    ...certificate,
    status: 'issued',
  };
}

/**
 * Submit certificate to KRA
 */
export function submitCertificateToKRA(
  certificate: WithholdingTaxCertificate,
  submittedBy: string
): WithholdingTaxCertificate {
  if (certificate.status !== 'issued') {
    throw new Error('Only issued certificates can be submitted to KRA');
  }
  
  return {
    ...certificate,
    status: 'submitted',
    submittedToKRA: new Date(),
  };
}

/**
 * Acknowledge KRA submission
 */
export function acknowledgeKRASubmission(
  certificate: WithholdingTaxCertificate,
  acknowledgmentNumber: string,
  acknowledgmentDate: Date
): WithholdingTaxCertificate {
  if (certificate.status !== 'submitted') {
    throw new Error('Only submitted certificates can be acknowledged');
  }
  
  return {
    ...certificate,
    status: 'acknowledged',
    kraAcknowledgmentNumber: acknowledgmentNumber,
    kraAcknowledgmentDate: acknowledgmentDate,
  };
}

/**
 * Create withholding tax payment
 */
export function createWithholdingTaxPayment(
  certificateId: string,
  amount: number,
  paymentDate: Date,
  paymentMethod: 'bank_transfer' | 'mpesa' | 'cheque' | 'cash',
  userId: string,
  referenceNumber?: string,
  bankName?: string,
  accountNumber?: string
): WithholdingTaxPayment {
  return {
    id: `wht_pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    certificateId,
    paymentDate,
    amount,
    paymentMethod,
    referenceNumber,
    bankName,
    accountNumber,
    createdAt: new Date(),
    createdBy: userId,
  };
}

/**
 * Get withholding tax category label
 */
export function getWithholdingTaxCategoryLabel(category: WithholdingTaxCategory): string {
  const labels: Record<WithholdingTaxCategory, string> = {
    [WithholdingTaxCategory.PROFESSIONAL_SERVICES]: 'Professional Services',
    [WithholdingTaxCategory.CONSULTING]: 'Consulting',
    [WithholdingTaxCategory.MANAGEMENT]: 'Management',
    [WithholdingTaxCategory.TRAINING]: 'Training',
    [WithholdingTaxCategory.SUPPLY]: 'Supply of Goods',
    [WithholdingTaxCategory.CONSTRUCTION]: 'Construction',
    [WithholdingTaxCategory.RENT]: 'Rent',
    [WithholdingTaxCategory.INTEREST]: 'Interest',
    [WithholdingTaxCategory.ROYALTIES]: 'Royalties',
    [WithholdingTaxCategory.DIVIDENDS]: 'Dividends',
  };

  return labels[category];
}

/**
 * Get withholding tax configuration
 */
export function getWithholdingTaxConfig(
  category: WithholdingTaxCategory,
  configs: WithholdingTaxConfig[] = DEFAULT_WITHHOLDING_TAX_CONFIGS
): WithholdingTaxConfig | undefined {
  return configs.find(c => c.category === category);
}

/**
 * Get all withholding tax configurations
 */
export function getAllWithholdingTaxConfigs(): WithholdingTaxConfig[] {
  return DEFAULT_WITHHOLDING_TAX_CONFIGS;
}

/**
 * Filter certificates by status
 */
export function filterCertificatesByStatus(
  certificates: WithholdingTaxCertificate[],
  status: 'draft' | 'issued' | 'submitted' | 'acknowledged'
): WithholdingTaxCertificate[] {
  return certificates.filter(c => c.status === status);
}

/**
 * Filter certificates by period
 */
export function filterCertificatesByPeriod(
  certificates: WithholdingTaxCertificate[],
  period: string
): WithholdingTaxCertificate[] {
  return certificates.filter(c => c.period === period);
}

/**
 * Filter certificates by recipient
 */
export function filterCertificatesByRecipient(
  certificates: WithholdingTaxCertificate[],
  recipientId: string
): WithholdingTaxCertificate[] {
  return certificates.filter(c => c.recipientId === recipientId);
}

/**
 * Get withholding tax summary by period
 */
export function getWithholdingTaxSummaryByPeriod(
  certificates: WithholdingTaxCertificate[]
): Record<string, {
  totalPayments: number;
  totalWithholding: number;
  certificateCount: number;
  submittedCount: number;
  acknowledgedCount: number;
}> {
  const summary: Record<string, {
    totalPayments: number;
    totalWithholding: number;
    certificateCount: number;
    submittedCount: number;
    acknowledgedCount: number;
  }> = {};
  
  for (const certificate of certificates) {
    if (!summary[certificate.period]) {
      summary[certificate.period] = {
        totalPayments: 0,
        totalWithholding: 0,
        certificateCount: 0,
        submittedCount: 0,
        acknowledgedCount: 0,
      };
    }
    
    const periodSummary = summary[certificate.period];
    periodSummary.totalPayments += certificate.paymentAmount;
    periodSummary.totalWithholding += certificate.withholdingAmount;
    periodSummary.certificateCount++;
    
    if (certificate.status === 'submitted' || certificate.status === 'acknowledged') {
      periodSummary.submittedCount++;
    }
    
    if (certificate.status === 'acknowledged') {
      periodSummary.acknowledgedCount++;
    }
  }
  
  return summary;
}

/**
 * Generate withholding tax report for KRA
 */
export function generateWithholdingTaxReportForKRA(
  certificates: WithholdingTaxCertificate[],
  period: string
): string {
  const periodCertificates = filterCertificatesByPeriod(certificates, period);
  
  const reportData = {
    reportType: 'WITHHOLDING_TAX',
    period,
    generatedAt: new Date(),
    summary: {
      totalCertificates: periodCertificates.length,
      totalPayments: periodCertificates.reduce((sum, c) => sum + c.paymentAmount, 0),
      totalWithholding: periodCertificates.reduce((sum, c) => sum + c.withholdingAmount, 0),
    },
    certificates: periodCertificates.map(c => ({
      certificateNumber: c.certificateNumber,
      payerName: c.payerName,
      payerTaxId: c.payerTaxId,
      recipientName: c.recipientName,
      recipientTaxId: c.recipientTaxId,
      category: c.category,
      paymentAmount: c.paymentAmount,
      withholdingRate: c.withholdingRate,
      withholdingAmount: c.withholdingAmount,
      paymentDate: c.paymentDate,
      kraAcknowledgmentNumber: c.kraAcknowledgmentNumber,
    })),
  };
  
  return JSON.stringify(reportData, null, 2);
}

/**
 * Check if withholding applies
 */
export function doesWithholdingApply(
  paymentAmount: number,
  category: WithholdingTaxCategory,
  configs: WithholdingTaxConfig[] = DEFAULT_WITHHOLDING_TAX_CONFIGS
): boolean {
  const calculation = calculateWithholdingTax(paymentAmount, category, configs);
  return calculation.applies;
}

/**
 * Get certificate status label
 */
export function getCertificateStatusLabel(status: 'draft' | 'issued' | 'submitted' | 'acknowledged'): string {
  const labels: Record<typeof status, string> = {
    draft: 'Draft',
    issued: 'Issued',
    submitted: 'Submitted to KRA',
    acknowledged: 'Acknowledged by KRA',
  };

  return labels[status];
}
