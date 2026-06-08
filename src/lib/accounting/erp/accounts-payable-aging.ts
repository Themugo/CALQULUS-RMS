/**
 * Accounts Payable Aging
 * 
 * Implements ERP-grade accounts payable aging with:
 * - Aging buckets (0-30, 31-60, 61-90, 90+ days)
 * - Vendor management
 * - Payment tracking
 * - Aging reports
 * - Cash flow forecasting
 * - Discount tracking
 */

// Aging bucket
export enum AgingBucket {
  CURRENT = 'current',
  DAYS_1_30 = 'days_1_30',
  DAYS_31_60 = 'days_31_60',
  DAYS_61_90 = 'days_61_90',
  DAYS_OVER_90 = 'days_over_90',
}

// Accounts payable entry
export interface AccountsPayableEntry {
  id: string;
  vendorId: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  amount: number;
  balance: number;
  status: 'open' | 'partial' | 'paid' | 'disputed';
  discountAvailable: number;
  discountDueDate?: Date;
  paymentTerms: string;
  createdAt: Date;
  paidAt?: Date;
}

// Aging summary
export interface AgingSummary {
  vendorId: string;
  vendorName: string;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  daysOver90: number;
  total: number;
}

// Payment
export interface Payment {
  id: string;
  payableId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  reference: string;
  discountTaken: number;
  createdAt: Date;
}

/**
 * Accounts Payable Aging Calculator
 */
export class AccountsPayableAgingCalculator {
  private entries: AccountsPayableEntry[];
  private payments: Payment[];

  constructor() {
    this.entries = [];
    this.payments = [];
  }

  /**
   * Add accounts payable entry
   */
  addEntry(entry: Omit<AccountsPayableEntry, 'id' | 'createdAt'>): AccountsPayableEntry {
    const payable: AccountsPayableEntry = {
      id: `ap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...entry,
      createdAt: new Date(),
    };

    this.entries.push(payable);
    return payable;
  }

  /**
   * Calculate aging for entry
   */
  calculateAging(entry: AccountsPayableEntry, asOfDate: Date): AgingBucket {
    const daysOverdue = Math.floor((asOfDate.getTime() - entry.dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOverdue < 0) {
      return AgingBucket.CURRENT;
    } else if (daysOverdue <= 30) {
      return AgingBucket.DAYS_1_30;
    } else if (daysOverdue <= 60) {
      return AgingBucket.DAYS_31_60;
    } else if (daysOverdue <= 90) {
      return AgingBucket.DAYS_61_90;
    } else {
      return AgingBucket.DAYS_OVER_90;
    }
  }

  /**
   * Generate aging report
   */
  generateAgingReport(asOfDate: Date): AgingSummary[] {
    const vendorMap = new Map<string, AgingSummary>();

    for (const entry of this.entries) {
      if (entry.status === 'paid') continue;

      const aging = this.calculateAging(entry, asOfDate);

      if (!vendorMap.has(entry.vendorId)) {
        vendorMap.set(entry.vendorId, {
          vendorId: entry.vendorId,
          vendorName: entry.vendorName,
          current: 0,
          days1_30: 0,
          days31_60: 0,
          days61_90: 0,
          daysOver90: 0,
          total: 0,
        });
      }

      const summary = vendorMap.get(entry.vendorId)!;
      const amount = entry.balance;

      switch (aging) {
        case AgingBucket.CURRENT:
          summary.current += amount;
          break;
        case AgingBucket.DAYS_1_30:
          summary.days1_30 += amount;
          break;
        case AgingBucket.DAYS_31_60:
          summary.days31_60 += amount;
          break;
        case AgingBucket.DAYS_61_90:
          summary.days61_90 += amount;
          break;
        case AgingBucket.DAYS_OVER_90:
          summary.daysOver90 += amount;
          break;
      }

      summary.total += amount;
    }

    return Array.from(vendorMap.values());
  }

  /**
   * Get total aging summary
   */
  getTotalAgingSummary(asOfDate: Date): {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    daysOver90: number;
    total: number;
  } {
    const report = this.generateAgingReport(asOfDate);

    return {
      current: report.reduce((sum, s) => sum + s.current, 0),
      days1_30: report.reduce((sum, s) => sum + s.days1_30, 0),
      days31_60: report.reduce((sum, s) => sum + s.days31_60, 0),
      days61_90: report.reduce((sum, s) => sum + s.days61_90, 0),
      daysOver90: report.reduce((sum, s) => sum + s.daysOver90, 0),
      total: report.reduce((sum, s) => sum + s.total, 0),
    };
  }

  /**
   * Record payment
   */
  recordPayment(
    payableId: string,
    amount: number,
    paymentDate: Date,
    paymentMethod: string,
    reference: string,
    discountTaken: number = 0
  ): Payment {
    const payable = this.entries.find(e => e.id === payableId);
    if (!payable) {
      throw new Error('Accounts payable entry not found');
    }

    const payment: Payment = {
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payableId,
      amount,
      paymentDate,
      paymentMethod,
      reference,
      discountTaken,
      createdAt: new Date(),
    };

    this.payments.push(payment);

    // Update payable balance
    payable.balance -= amount;
    if (payable.balance <= 0) {
      payable.balance = 0;
      payable.status = 'paid';
      payable.paidAt = paymentDate;
    } else {
      payable.status = 'partial';
    }

    return payment;
  }

  /**
   * Get available discounts
   */
  getAvailableDiscounts(asOfDate: Date): Array<{
    payableId: string;
    vendorName: string;
    invoiceNumber: string;
    discountAmount: number;
    discountDueDate: Date;
    daysUntilDue: number;
  }> {
    const discounts: Array<{
      payableId: string;
      vendorName: string;
      invoiceNumber: string;
      discountAmount: number;
      discountDueDate: Date;
      daysUntilDue: number;
    }> = [];

    for (const entry of this.entries) {
      if (entry.status === 'paid' || !entry.discountAvailable || !entry.discountDueDate) {
        continue;
      }

      const daysUntilDue = Math.floor((entry.discountDueDate.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue >= 0) {
        discounts.push({
          payableId: entry.id,
          vendorName: entry.vendorName,
          invoiceNumber: entry.invoiceNumber,
          discountAmount: entry.discountAvailable,
          discountDueDate: entry.discountDueDate,
          daysUntilDue,
        });
      }
    }

    return discounts.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  /**
   * Get overdue payables
   */
  getOverduePayables(asOfDate: Date): AccountsPayableEntry[] {
    return this.entries.filter(
      entry => entry.status !== 'paid' && entry.dueDate < asOfDate
    );
  }

  /**
   * Get upcoming payments
   */
  getUpcomingPayments(asOfDate: Date, days: number = 30): AccountsPayableEntry[] {
    const cutoffDate = new Date(asOfDate);
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return this.entries.filter(
      entry => entry.status !== 'paid' && entry.dueDate >= asOfDate && entry.dueDate <= cutoffDate
    );
  }

  /**
   * Forecast cash outflows
   */
  forecastCashOutflows(asOfDate: Date, days: number = 90): Array<{
    date: Date;
    amount: number;
    payables: number;
  }> {
    const forecast: Array<{
      date: Date;
      amount: number;
      payables: number;
    }> = [];
    const cutoffDate = new Date(asOfDate);
    cutoffDate.setDate(cutoffDate.getDate() + days);

    const dateMap = new Map<string, { amount: number; payables: number }>();

    for (const entry of this.entries) {
      if (entry.status === 'paid' || entry.dueDate < asOfDate || entry.dueDate > cutoffDate) {
        continue;
      }

      const dateKey = entry.dueDate.toISOString().split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { amount: 0, payables: 0 });
      }

      const data = dateMap.get(dateKey)!;
      data.amount += entry.balance;
      data.payables += 1;
    }

    for (const [dateStr, data] of dateMap.entries()) {
      forecast.push({
        date: new Date(dateStr),
        amount: data.amount,
        payables: data.payables,
      });
    }

    return forecast.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get vendor summary
   */
  getVendorSummary(vendorId: string): {
    vendorId: string;
    vendorName: string;
    totalBalance: number;
    overdueAmount: number;
    availableDiscounts: number;
    openInvoices: number;
  } | null {
    const vendorEntries = this.entries.filter(e => e.vendorId === vendorId && e.status !== 'paid');
    
    if (vendorEntries.length === 0) {
      return null;
    }

    const totalBalance = vendorEntries.reduce((sum, e) => sum + e.balance, 0);
    const overdueAmount = vendorEntries
      .filter(e => e.dueDate < new Date())
      .reduce((sum, e) => sum + e.balance, 0);
    const availableDiscounts = vendorEntries
      .filter(e => e.discountAvailable && e.discountDueDate && e.discountDueDate > new Date())
      .reduce((sum, e) => sum + e.discountAvailable, 0);

    return {
      vendorId,
      vendorName: vendorEntries[0].vendorName,
      totalBalance,
      overdueAmount,
      availableDiscounts,
      openInvoices: vendorEntries.length,
    };
  }

  /**
   * Get payment history
   */
  getPaymentHistory(limit?: number): Payment[] {
    const sorted = [...this.payments].sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
    if (limit) {
      return sorted.slice(0, limit);
    }
    return sorted;
  }

  /**
   * Get aging analysis
   */
  getAgingAnalysis(asOfDate: Date): {
    totalPayables: number;
    overduePercentage: number;
    averageDaysOverdue: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  } {
    const openPayables = this.entries.filter(e => e.status !== 'paid');
    const overduePayables = this.getOverduePayables(asOfDate);
    
    const totalPayables = openPayables.reduce((sum, e) => sum + e.balance, 0);
    const overdueAmount = overduePayables.reduce((sum, e) => sum + e.balance, 0);
    const overduePercentage = totalPayables > 0 ? (overdueAmount / totalPayables) * 100 : 0;

    let totalDaysOverdue = 0;
    for (const payable of overduePayables) {
      const daysOverdue = Math.floor((asOfDate.getTime() - payable.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      totalDaysOverdue += daysOverdue;
    }
    const averageDaysOverdue = overduePayables.length > 0 ? totalDaysOverdue / overduePayables.length : 0;

    let riskLevel: 'low' | 'medium' | 'high';
    const recommendations: string[] = [];

    if (overduePercentage > 30 || averageDaysOverdue > 60) {
      riskLevel = 'high';
      recommendations.push('High overdue percentage - prioritize payment collection');
      recommendations.push('Review payment terms with vendors');
    } else if (overduePercentage > 15 || averageDaysOverdue > 30) {
      riskLevel = 'medium';
      recommendations.push('Moderate overdue percentage - monitor closely');
    } else {
      riskLevel = 'low';
    }

    const availableDiscounts = this.getAvailableDiscounts(asOfDate);
    if (availableDiscounts.length > 0) {
      const totalDiscounts = availableDiscounts.reduce((sum, d) => sum + d.discountAmount, 0);
      recommendations.push(`Take advantage of ${totalDiscounts.toFixed(2)} in available discounts`);
    }

    return {
      totalPayables,
      overduePercentage,
      averageDaysOverdue,
      riskLevel,
      recommendations,
    };
  }
}
