/**
 * Comprehensive Tax Engine
 * 
 * Implements ERP-grade tax engine with:
 * - Tax calculation
 * - Withholding tax
 * - VAT/GST calculation
 * - Tax reporting
 * - Tax compliance checks
 * - Tax payment scheduling
 * - Multi-jurisdiction support
 */

// Tax type
export enum TaxType {
  INCOME_TAX = 'income_tax',
  CORPORATE_TAX = 'corporate_tax',
  VAT = 'vat',
  GST = 'gst',
  WITHHOLDING_TAX = 'withholding_tax',
  PROPERTY_TAX = 'property_tax',
  SALES_TAX = 'sales_tax',
  CUSTOMS_DUTY = 'customs_duty',
}

// Tax jurisdiction
export interface TaxJurisdiction {
  id: string;
  name: string;
  countryCode: string;
  taxRates: Record<TaxType, number>;
  filingFrequency: 'monthly' | 'quarterly' | 'annually';
  dueDate: number; // day of month
}

// Tax calculation
export interface TaxCalculation {
  id: string;
  taxType: TaxType;
  jurisdictionId: string;
  periodId: string;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  dueDate: Date;
  status: 'pending' | 'calculated' | 'filed' | 'paid' | 'overdue';
  calculatedAt: Date;
  filedAt?: Date;
  paidAt?: Date;
}

// Withholding tax entry
export interface WithholdingTaxEntry {
  id: string;
  payerId: string;
  recipientId: string;
  amount: number;
  taxRate: number;
  taxAmount: number;
  paymentDate: Date;
  jurisdictionId: string;
  certificateNumber?: string;
  status: 'withheld' | 'remitted' | 'refunded';
  withheldAt: Date;
  remittedAt?: Date;
}

// VAT/GST transaction
export interface VatTransaction {
  id: string;
  transactionType: 'sale' | 'purchase' | 'import' | 'export';
  amount: number;
  vatRate: number;
  vatAmount: number;
  vatIncluded: boolean;
  transactionDate: Date;
  jurisdictionId: string;
  counterpartyId: string;
  invoiceNumber?: string;
}

// Tax return
export interface TaxReturn {
  id: string;
  taxType: TaxType;
  jurisdictionId: string;
  periodId: string;
  filingPeriod: {
    startDate: Date;
    endDate: Date;
  };
  totalTax: number;
  payments: number;
  balanceDue: number;
  status: 'draft' | 'filed' | 'accepted' | 'rejected' | 'amended';
  filedAt?: Date;
  acceptedAt?: Date;
  rejectionReason?: string;
}

/**
 * Tax Calculator
 */
export class TaxCalculator {
  private jurisdictions: Map<string, TaxJurisdiction>;
  private calculations: TaxCalculation[];
  private withholdingEntries: WithholdingTaxEntry[];
  private vatTransactions: VatTransaction[];

  constructor() {
    this.jurisdictions = new Map();
    this.calculations = [];
    this.withholdingEntries = [];
    this.vatTransactions = [];
  }

  /**
   * Add tax jurisdiction
   */
  addJurisdiction(jurisdiction: Omit<TaxJurisdiction, 'id'>): TaxJurisdiction {
    const taxJurisdiction: TaxJurisdiction = {
      id: `jurisdiction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...jurisdiction,
    };

    this.jurisdictions.set(taxJurisdiction.id, taxJurisdiction);
    return taxJurisdiction;
  }

  /**
   * Get jurisdiction
   */
  getJurisdiction(jurisdictionId: string): TaxJurisdiction | undefined {
    return this.jurisdictions.get(jurisdictionId);
  }

  /**
   * Calculate tax
   */
  calculateTax(
    taxType: TaxType,
    jurisdictionId: string,
    periodId: string,
    taxableAmount: number,
    dueDate: Date
  ): TaxCalculation {
    const jurisdiction = this.jurisdictions.get(jurisdictionId);
    if (!jurisdiction) {
      throw new Error('Jurisdiction not found');
    }

    const taxRate = jurisdiction.taxRates[taxType] || 0;
    const taxAmount = taxableAmount * (taxRate / 100);

    const calculation: TaxCalculation = {
      id: `tax_calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taxType,
      jurisdictionId,
      periodId,
      taxableAmount,
      taxRate,
      taxAmount,
      dueDate,
      status: 'calculated',
      calculatedAt: new Date(),
    };

    this.calculations.push(calculation);
    return calculation;
  }

  /**
   * Calculate withholding tax
   */
  calculateWithholdingTax(
    payerId: string,
    recipientId: string,
    amount: number,
    taxRate: number,
    paymentDate: Date,
    jurisdictionId: string
  ): WithholdingTaxEntry {
    const taxAmount = amount * (taxRate / 100);

    const entry: WithholdingTaxEntry = {
      id: `withholding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payerId,
      recipientId,
      amount,
      taxRate,
      taxAmount,
      paymentDate,
      jurisdictionId,
      status: 'withheld',
      withheldAt: new Date(),
    };

    this.withholdingEntries.push(entry);
    return entry;
  }

  /**
   * Calculate VAT/GST
   */
  calculateVat(
    transactionType: 'sale' | 'purchase' | 'import' | 'export',
    amount: number,
    vatRate: number,
    vatIncluded: boolean,
    transactionDate: Date,
    jurisdictionId: string,
    counterpartyId: string,
    invoiceNumber?: string
  ): VatTransaction {
    const vatAmount = vatIncluded
      ? amount - (amount / (1 + vatRate / 100))
      : amount * (vatRate / 100);

    const transaction: VatTransaction = {
      id: `vat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionType,
      amount,
      vatRate,
      vatAmount,
      vatIncluded,
      transactionDate,
      jurisdictionId,
      counterpartyId,
      invoiceNumber,
    };

    this.vatTransactions.push(transaction);
    return transaction;
  }

  /**
   * Get VAT liability
   */
  getVatLiability(jurisdictionId: string, _periodId: string): {
    outputVat: number;
    inputVat: number;
    netVat: number;
  } {
    const outputVat = this.vatTransactions
      .filter(t => t.jurisdictionId === jurisdictionId && t.transactionType === 'sale')
      .reduce((sum, t) => sum + t.vatAmount, 0);

    const inputVat = this.vatTransactions
      .filter(t => t.jurisdictionId === jurisdictionId && t.transactionType === 'purchase')
      .reduce((sum, t) => sum + t.vatAmount, 0);

    const netVat = outputVat - inputVat;

    return {
      outputVat,
      inputVat,
      netVat,
    };
  }

  /**
   * Get tax calculation
   */
  getTaxCalculation(calculationId: string): TaxCalculation | undefined {
    return this.calculations.find(c => c.id === calculationId);
  }

  /**
   * Get calculations by period
   */
  getCalculationsByPeriod(periodId: string): TaxCalculation[] {
    return this.calculations.filter(c => c.periodId === periodId);
  }

  /**
   * Get calculations by tax type
   */
  getCalculationsByTaxType(taxType: TaxType): TaxCalculation[] {
    return this.calculations.filter(c => c.taxType === taxType);
  }

  /**
   * Get withholding entries by recipient
   */
  getWithholdingEntriesByRecipient(recipientId: string): WithholdingTaxEntry[] {
    return this.withholdingEntries.filter(w => w.recipientId === recipientId);
  }

  /**
   * Remit withholding tax
   */
  remitWithholdingTax(entryId: string): WithholdingTaxEntry | null {
    const entry = this.withholdingEntries.find(w => w.id === entryId);
    if (entry && entry.status === 'withheld') {
      entry.status = 'remitted';
      entry.remittedAt = new Date();
      return entry;
    }
    return null;
  }

  /**
   * Get VAT transactions by period
   */
  getVatTransactionsByPeriod(jurisdictionId: string, startDate: Date, endDate: Date, _periodId?: string): VatTransaction[] {
    return this.vatTransactions.filter(
      t => t.jurisdictionId === jurisdictionId && t.transactionDate >= startDate && t.transactionDate <= endDate
    );
  }

  /**
   * Generate tax return
   */
  generateTaxReturn(
    taxType: TaxType,
    jurisdictionId: string,
    periodId: string,
    filingPeriod: {
      startDate: Date;
      endDate: Date;
    }
  ): TaxReturn {
    const calculations = this.calculations.filter(
      c => c.taxType === taxType && c.jurisdictionId === jurisdictionId && c.periodId === periodId
    );

    const totalTax = calculations.reduce((sum, c) => sum + c.taxAmount, 0);
    const payments = calculations
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.taxAmount, 0);
    const balanceDue = totalTax - payments;

    const taxReturn: TaxReturn = {
      id: `tax_return_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taxType,
      jurisdictionId,
      periodId,
      filingPeriod,
      totalTax,
      payments,
      balanceDue,
      status: 'draft',
    };

    return taxReturn;
  }

  /**
   * File tax return
   */
  fileTaxReturn(_taxReturnId: string): TaxReturn | null {
    // In production, this would submit the tax return to the tax authority
    // For now, we'll just mark it as filed
    const taxReturn = this.getTaxReturn(_taxReturnId);
    if (taxReturn && taxReturn.status === 'draft') {
      taxReturn.status = 'filed';
      taxReturn.filedAt = new Date();
      return taxReturn;
    }
    return null;
  }

  /**
   * Get tax return
   */
  getTaxReturn(_taxReturnId: string): TaxReturn | undefined {
    // In production, this would retrieve from a database
    // For now, we'll return undefined
    return undefined;
  }

  /**
   * Get tax summary
   */
  getTaxSummary(periodId: string): {
    totalTax: number;
    byTaxType: Record<TaxType, number>;
    byJurisdiction: Record<string, number>;
    paid: number;
    pending: number;
    overdue: number;
  } {
    const periodCalculations = this.calculations.filter(c => c.periodId === periodId);

    const totalTax = periodCalculations.reduce((sum, c) => sum + c.taxAmount, 0);

    const byTaxType: Record<TaxType, number> = {
      [TaxType.INCOME_TAX]: 0,
      [TaxType.CORPORATE_TAX]: 0,
      [TaxType.VAT]: 0,
      [TaxType.GST]: 0,
      [TaxType.WITHHOLDING_TAX]: 0,
      [TaxType.PROPERTY_TAX]: 0,
      [TaxType.SALES_TAX]: 0,
      [TaxType.CUSTOMS_DUTY]: 0,
    };

    for (const calculation of periodCalculations) {
      byTaxType[calculation.taxType] += calculation.taxAmount;
    }

    const byJurisdiction: Record<string, number> = {};
    for (const calculation of periodCalculations) {
      byJurisdiction[calculation.jurisdictionId] = (byJurisdiction[calculation.jurisdictionId] || 0) + calculation.taxAmount;
    }

    const paid = periodCalculations.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.taxAmount, 0);
    const pending = periodCalculations.filter(c => c.status === 'calculated').reduce((sum, c) => sum + c.taxAmount, 0);
    const overdue = periodCalculations.filter(c => c.status === 'calculated' && c.dueDate < new Date()).reduce((sum, c) => sum + c.taxAmount, 0);

    return {
      totalTax,
      byTaxType,
      byJurisdiction,
      paid,
      pending,
      overdue,
    };
  }

  /**
   * Get tax compliance status
   */
  getTaxComplianceStatus(asOfDate: Date): {
    isCompliant: boolean;
    overduePayments: number;
    upcomingPayments: number;
    recommendations: string[];
  } {
    const overdueCalculations = this.calculations.filter(c => c.status === 'calculated' && c.dueDate < asOfDate);
    const overduePayments = overdueCalculations.reduce((sum, c) => sum + c.taxAmount, 0);

    const upcomingCalculations = this.calculations.filter(
      c => c.status === 'calculated' && c.dueDate >= asOfDate && c.dueDate <= new Date(asOfDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    );
    const upcomingPayments = upcomingCalculations.reduce((sum, c) => sum + c.taxAmount, 0);

    const recommendations: string[] = [];
    let isCompliant = true;

    if (overduePayments > 0) {
      isCompliant = false;
      recommendations.push(`Overdue tax payments: ${overduePayments.toFixed(2)} - pay immediately to avoid penalties`);
    }

    if (upcomingPayments > 0) {
      recommendations.push(`Upcoming tax payments: ${upcomingPayments.toFixed(2)} - ensure sufficient funds are available`);
    }

    const pendingWithholding = this.withholdingEntries.filter(w => w.status === 'withheld');
    if (pendingWithholding.length > 0) {
      recommendations.push(`${pendingWithholding.length} withholding tax entries pending remittance`);
    }

    return {
      isCompliant,
      overduePayments,
      upcomingPayments,
      recommendations,
    };
  }

  /**
   * Calculate effective tax rate
   */
  calculateEffectiveTaxRate(
    taxType: TaxType,
    jurisdictionId: string,
    _taxableIncome: number
  ): number {
    const jurisdiction = this.jurisdictions.get(jurisdictionId);
    if (!jurisdiction) {
      return 0;
    }

    const statutoryRate = jurisdiction.taxRates[taxType] || 0;
    
    // In production, this would consider deductions, credits, and other factors
    // For now, we'll return the statutory rate
    return statutoryRate;
  }

  /**
   * Get tax calendar
   */
  getTaxCalendar(jurisdictionId: string, year: number): Array<{
    taxType: TaxType;
    dueDate: Date;
    period: string;
  }> {
    const jurisdiction = this.jurisdictions.get(jurisdictionId);
    if (!jurisdiction) {
      return [];
    }

    const calendar: Array<{
      taxType: TaxType;
      dueDate: Date;
      period: string;
    }> = [];

    const periods = jurisdiction.filingFrequency === 'monthly' ? 12 : jurisdiction.filingFrequency === 'quarterly' ? 4 : 1;

    for (let i = 0; i < periods; i++) {
      const dueDate = new Date(year, i * (12 / periods), jurisdiction.dueDate);
      const period = `${year}-Q${i + 1}`;

      calendar.push({
        taxType: TaxType.CORPORATE_TAX,
        dueDate,
        period,
      });
    }

    return calendar;
  }
}

/**
 * Tax Compliance Checker
 */
export class TaxComplianceChecker {
  /**
   * Check tax compliance
   */
  checkCompliance(
    taxCalculator: TaxCalculator,
    asOfDate: Date
  ): {
    overallCompliance: boolean;
    issues: Array<{
      area: string;
      description: string;
      severity: 'error' | 'warning' | 'info';
      recommendation: string;
    }>;
    score: number; // 0-100
  } {
    const status = taxCalculator.getTaxComplianceStatus(asOfDate);
    const issues: Array<{
      area: string;
      description: string;
      severity: 'error' | 'warning' | 'info';
      recommendation: string;
    }> = [];

    if (!status.isCompliant) {
      issues.push({
        area: 'Tax Payments',
        description: 'Overdue tax payments detected',
        severity: 'error',
        recommendation: 'Pay overdue taxes immediately to avoid penalties and interest',
      });
    }

    if (status.overduePayments > 0) {
      issues.push({
        area: 'Cash Flow',
        description: 'Tax payment arrears',
        severity: 'warning',
        recommendation: 'Improve cash flow management to ensure timely tax payments',
      });
    }

    const score = status.isCompliant ? 100 : Math.max(0, 100 - (status.overduePayments / 10000) * 100);

    return {
      overallCompliance: status.isCompliant,
      issues,
      score,
    };
  }

  /**
   * Generate tax compliance report
   */
  generateComplianceReport(
    taxCalculator: TaxCalculator,
    jurisdictionId: string,
    year: number
  ): {
    jurisdiction: string;
    year: number;
    taxCalendar: Array<{
      taxType: TaxType;
      dueDate: Date;
      period: string;
    }>;
    complianceStatus: {
      overallCompliance: boolean;
      issues: Array<{
        area: string;
        description: string;
        severity: 'error' | 'warning' | 'info';
        recommendation: string;
      }>;
      score: number;
    };
    recommendations: string[];
  } {
    const taxCalendar = taxCalculator.getTaxCalendar(jurisdictionId, year);
    const complianceStatus = this.checkCompliance(taxCalculator, new Date());

    return {
      jurisdiction: jurisdictionId,
      year,
      taxCalendar,
      complianceStatus,
      recommendations: complianceStatus.issues.map(i => i.recommendation),
    };
  }
}
