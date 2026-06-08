/**
 * Tax Reporting Engine
 * 
 * Implements tax reporting with:
 * - Configurable tax rates
 * - Tax calculation
 * - Tax liability tracking
 * - Tax report generation
 * - Compliance reporting
 */

import { JournalEntry, TransactionStatus } from './journal-system';
import { AccountingPeriod } from './accounting-periods';

// Tax type
export enum TaxType {
  VAT = 'vat',
  SALES_TAX = 'sales_tax',
  INCOME_TAX = 'income_tax',
  PROPERTY_TAX = 'property_tax',
  WITHHOLDING_TAX = 'withholding_tax',
  EXCISE_TAX = 'excise_tax',
  SERVICE_TAX = 'service_tax',
}

// Tax rate
export interface TaxRate {
  id: string;
  taxType: TaxType;
  name: string;
  rate: number; // Percentage
  effectiveDate: Date;
  expiryDate?: Date;
  jurisdiction: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Tax liability
export interface TaxLiability {
  id: string;
  taxType: TaxType;
  taxRateId: string;
  periodId: string;
  baseAmount: number;
  taxAmount: number;
  dueDate: Date;
  paidAmount: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
}

// Tax report
export interface TaxReport {
  id: string;
  reportType: TaxType;
  periodId: string;
  startDate: Date;
  endDate: Date;
  totalBaseAmount: number;
  totalTaxAmount: number;
  totalPaidAmount: number;
  totalBalance: number;
  liabilities: TaxLiability[];
  generatedAt: Date;
  generatedBy: string;
}

// Tax calculation result
export interface TaxCalculation {
  baseAmount: number;
  taxRate: number;
  taxAmount: number;
  taxType: TaxType;
  jurisdiction: string;
}

// Default tax rates for Kenya
const DEFAULT_TAX_RATES: Omit<TaxRate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    taxType: TaxType.VAT,
    name: 'Standard VAT',
    rate: 16,
    effectiveDate: new Date('2021-01-01'),
    jurisdiction: 'KE',
    description: 'Standard Value Added Tax rate in Kenya',
    isActive: true,
  },
  {
    taxType: TaxType.WITHHOLDING_TAX,
    name: 'Withholding Tax - Professional Services',
    rate: 5,
    effectiveDate: new Date('2021-01-01'),
    jurisdiction: 'KE',
    description: 'Withholding tax on professional services',
    isActive: true,
  },
  {
    taxType: TaxType.WITHHOLDING_TAX,
    name: 'Withholding Tax - Consulting',
    rate: 10,
    effectiveDate: new Date('2021-01-01'),
    jurisdiction: 'KE',
    description: 'Withholding tax on consulting services',
    isActive: true,
  },
  {
    taxType: TaxType.INCOME_TAX,
    name: 'Corporate Income Tax',
    rate: 30,
    effectiveDate: new Date('2021-01-01'),
    jurisdiction: 'KE',
    description: 'Corporate income tax rate',
    isActive: true,
  },
  {
    taxType: TaxType.PROPERTY_TAX,
    name: 'Property Tax - Residential',
    rate: 0.25,
    effectiveDate: new Date('2021-01-01'),
    jurisdiction: 'KE',
    description: 'Annual property tax rate for residential properties',
    isActive: true,
  },
];

/**
 * Calculate tax
 */
export function calculateTax(
  baseAmount: number,
  taxRate: TaxRate
): TaxCalculation {
  const taxAmount = (baseAmount * taxRate.rate) / 100;
  
  return {
    baseAmount,
    taxRate: taxRate.rate,
    taxAmount,
    taxType: taxRate.taxType,
    jurisdiction: taxRate.jurisdiction,
  };
}

/**
 * Get applicable tax rate
 */
export function getApplicableTaxRate(
  taxType: TaxType,
  date: Date,
  jurisdiction: string = 'KE',
  taxRates: TaxRate[] = []
): TaxRate | null {
  const allRates = taxRates.length > 0 ? taxRates : DEFAULT_TAX_RATES.map(rate => ({
    ...rate,
    id: `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  
  const applicableRates = allRates.filter(rate => 
    rate.taxType === taxType &&
    rate.jurisdiction === jurisdiction &&
    rate.isActive &&
    new Date(rate.effectiveDate) <= date &&
    (!rate.expiryDate || new Date(rate.expiryDate) >= date)
  );
  
  // Return the most recent rate
  return applicableRates.sort((a, b) => 
    new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  )[0] || null;
}

/**
 * Create tax liability
 */
export function createTaxLiability(
  taxType: TaxType,
  taxRateId: string,
  periodId: string,
  baseAmount: number,
  taxAmount: number,
  dueDate: Date
): TaxLiability {
  return {
    id: `liability_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    taxType,
    taxRateId,
    periodId,
    baseAmount,
    taxAmount,
    dueDate,
    paidAmount: 0,
    balance: taxAmount,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Calculate tax liability from journal entries
 */
export function calculateTaxLiabilityFromEntries(
  entries: JournalEntry[],
  period: AccountingPeriod,
  taxType: TaxType,
  jurisdiction: string = 'KE',
  taxRates: TaxRate[] = []
): TaxLiability[] {
  const liabilities: TaxLiability[] = [];
  const applicableRate = getApplicableTaxRate(taxType, period.endDate, jurisdiction, taxRates);
  
  if (!applicableRate) {
    return liabilities;
  }
  
  // Calculate taxable amount from entries
  let taxableAmount = 0;
  
  for (const entry of entries) {
    if (entry.status !== TransactionStatus.POSTED) continue;
    
    const entryDate = new Date(entry.transactionDate);
    if (entryDate < period.startDate || entryDate > period.endDate) continue;
    
    // Sum up revenue entries for VAT/sales tax
    if (taxType === TaxType.VAT || taxType === TaxType.SALES_TAX) {
      taxableAmount += entry.totalCredit; // Revenue accounts are credit
    }
  }
  
  if (taxableAmount > 0) {
    const calculation = calculateTax(taxableAmount, applicableRate);
    const liability = createTaxLiability(
      taxType,
      applicableRate.id,
      period.id,
      calculation.baseAmount,
      calculation.taxAmount,
      new Date(period.endDate.getTime() + 30 * 24 * 60 * 60 * 1000) // Due 30 days after period end
    );
    
    liabilities.push(liability);
  }
  
  return liabilities;
}

/**
 * Generate tax report
 */
export function generateTaxReport(
  taxType: TaxType,
  period: AccountingPeriod,
  entries: JournalEntry[],
  liabilities: TaxLiability[],
  generatedBy: string
): TaxReport {
  const periodLiabilities = liabilities.filter(l => l.periodId === period.id && l.taxType === taxType);
  
  const totalBaseAmount = periodLiabilities.reduce((sum, l) => sum + l.baseAmount, 0);
  const totalTaxAmount = periodLiabilities.reduce((sum, l) => sum + l.taxAmount, 0);
  const totalPaidAmount = periodLiabilities.reduce((sum, l) => sum + l.paidAmount, 0);
  const totalBalance = periodLiabilities.reduce((sum, l) => sum + l.balance, 0);
  
  return {
    id: `tax_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    reportType: taxType,
    periodId: period.id,
    startDate: period.startDate,
    endDate: period.endDate,
    totalBaseAmount,
    totalTaxAmount,
    totalPaidAmount,
    totalBalance,
    liabilities: periodLiabilities,
    generatedAt: new Date(),
    generatedBy,
  };
}

/**
 * Record tax payment
 */
export function recordTaxPayment(
  liabilityId: string,
  paymentAmount: number,
  paymentDate: Date
): TaxLiability {
  // In a real implementation, this would update the liability in storage
  // For now, we'll return an updated liability object
  return {
    id: liabilityId,
    taxType: TaxType.VAT,
    taxRateId: '',
    periodId: '',
    baseAmount: 0,
    taxAmount: 0,
    dueDate: new Date(),
    paidAmount: paymentAmount,
    balance: 0,
    status: 'paid',
    createdAt: new Date(),
    updatedAt: paymentDate,
  };
}

/**
 * Get tax liability status
 */
export function getTaxLiabilityStatus(liability: TaxLiability): 'pending' | 'partial' | 'paid' | 'overdue' {
  if (liability.paidAmount >= liability.taxAmount) {
    return 'paid';
  }
  
  if (liability.paidAmount > 0) {
    return 'partial';
  }
  
  if (new Date() > liability.dueDate) {
    return 'overdue';
  }
  
  return 'pending';
}

/**
 * Update tax liability status
 */
export function updateTaxLiabilityStatus(liability: TaxLiability): TaxLiability {
  const status = getTaxLiabilityStatus(liability);
  
  return {
    ...liability,
    status,
    balance: liability.taxAmount - liability.paidAmount,
    updatedAt: new Date(),
  };
}

/**
 * Get overdue tax liabilities
 */
export function getOverdueTaxLiabilities(liabilities: TaxLiability[]): TaxLiability[] {
  const now = new Date();
  
  return liabilities.filter(liability => 
    liability.balance > 0 && new Date(liability.dueDate) < now
  );
}

/**
 * Get tax summary by type
 */
export function getTaxSummaryByType(liabilities: TaxLiability[]): Record<TaxType, {
  totalLiability: number;
  totalPaid: number;
  totalBalance: number;
  count: number;
}> {
  const summary: Record<TaxType, {
    totalLiability: number;
    totalPaid: number;
    totalBalance: number;
    count: number;
  }> = {
    [TaxType.VAT]: { totalLiability: 0, totalPaid: 0, totalBalance: 0, count: 0 },
    [TaxType.SALES_TAX]: { totalLiability: 0, totalPaid: 0, totalBalance: 0, count: 0 },
    [TaxType.INCOME_TAX]: { totalLiability: 0, totalPaid: 0, totalBalance: 0, count: 0 },
    [TaxType.PROPERTY_TAX]: { totalLiability: 0, totalPaid: 0, totalBalance: 0, count: 0 },
    [TaxType.WITHHOLDING_TAX]: { totalLiability: 0, totalPaid: 0, totalBalance: 0, count: 0 },
    [TaxType.EXCISE_TAX]: { totalLiability: 0, totalPaid: 0, totalBalance: 0, count: 0 },
    [TaxType.SERVICE_TAX]: { totalLiability: 0, totalPaid: 0, totalBalance: 0, count: 0 },
  };
  
  for (const liability of liabilities) {
    const typeSummary = summary[liability.taxType];
    typeSummary.totalLiability += liability.taxAmount;
    typeSummary.totalPaid += liability.paidAmount;
    typeSummary.totalBalance += liability.balance;
    typeSummary.count++;
  }
  
  return summary;
}

/**
 * Get default tax rates
 */
export function getDefaultTaxRates(): Omit<TaxRate, 'id' | 'createdAt' | 'updatedAt'>[] {
  return DEFAULT_TAX_RATES;
}

/**
 * Create custom tax rate
 */
export function createTaxRate(
  taxType: TaxType,
  name: string,
  rate: number,
  effectiveDate: Date,
  jurisdiction: string,
  description?: string,
  expiryDate?: Date
): Omit<TaxRate, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    taxType,
    name,
    rate,
    effectiveDate,
    jurisdiction,
    description,
    expiryDate,
    isActive: true,
  };
}

/**
 * Validate tax rate
 */
export function validateTaxRate(taxRate: Omit<TaxRate, 'id' | 'createdAt' | 'updatedAt'>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (taxRate.rate < 0 || taxRate.rate > 100) {
    errors.push('Tax rate must be between 0 and 100');
  }
  
  if (taxRate.effectiveDate > new Date()) {
    errors.push('Effective date cannot be in the future');
  }
  
  if (taxRate.expiryDate && taxRate.expiryDate <= taxRate.effectiveDate) {
    errors.push('Expiry date must be after effective date');
  }
  
  if (!taxRate.jurisdiction || taxRate.jurisdiction.trim() === '') {
    errors.push('Jurisdiction is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Export tax report for filing
 */
export function exportTaxReportForFiling(report: TaxReport): string {
  const exportData = {
    reportId: report.id,
    reportType: report.reportType,
    period: {
      startDate: report.startDate,
      endDate: report.endDate,
    },
    summary: {
      totalBaseAmount: report.totalBaseAmount,
      totalTaxAmount: report.totalTaxAmount,
      totalPaidAmount: report.totalPaidAmount,
      totalBalance: report.totalBalance,
    },
    liabilities: report.liabilities.map(liability => ({
      taxType: liability.taxType,
      baseAmount: liability.baseAmount,
      taxAmount: liability.taxAmount,
      paidAmount: liability.paidAmount,
      balance: liability.balance,
      dueDate: liability.dueDate,
      status: liability.status,
    })),
    generatedAt: report.generatedAt,
    generatedBy: report.generatedBy,
  };
  
  return JSON.stringify(exportData, null, 2);
}
