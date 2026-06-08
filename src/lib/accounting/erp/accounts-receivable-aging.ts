/**
 * Accounts Receivable Aging
 * 
 * Implements ERP-grade accounts receivable aging with:
 * - Aging buckets (0-30, 31-60, 61-90, 90+ days)
 * - Customer management
 * - Collection tracking
 * - Aging reports
 * - Cash flow forecasting
 * - Credit limit management
 */

// Aging bucket
export enum AgingBucket {
  CURRENT = 'current',
  DAYS_1_30 = 'days_1_30',
  DAYS_31_60 = 'days_31_60',
  DAYS_61_90 = 'days_61_90',
  DAYS_OVER_90 = 'days_over_90',
}

// Accounts receivable entry
export interface AccountsReceivableEntry {
  id: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  amount: number;
  balance: number;
  status: 'open' | 'partial' | 'paid' | 'written_off';
  creditLimit: number;
  paymentTerms: string;
  createdAt: Date;
  paidAt?: Date;
}

// Aging summary
export interface AgingSummary {
  customerId: string;
  customerName: string;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  daysOver90: number;
  total: number;
  creditUtilization: number;
}

// Collection payment
export interface CollectionPayment {
  id: string;
  receivableId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  reference: string;
  createdAt: Date;
}

// Collection note
export interface CollectionNote {
  id: string;
  receivableId: string;
  note: string;
  createdBy: string;
  createdAt: Date;
}

/**
 * Accounts Receivable Aging Calculator
 */
export class AccountsReceivableAgingCalculator {
  private entries: AccountsReceivableEntry[];
  private payments: CollectionPayment[];
  private notes: CollectionNote[];

  constructor() {
    this.entries = [];
    this.payments = [];
    this.notes = [];
  }

  /**
   * Add accounts receivable entry
   */
  addEntry(entry: Omit<AccountsReceivableEntry, 'id' | 'createdAt'>): AccountsReceivableEntry {
    const receivable: AccountsReceivableEntry = {
      id: `ar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...entry,
      createdAt: new Date(),
    };

    this.entries.push(receivable);
    return receivable;
  }

  /**
   * Calculate aging for entry
   */
  calculateAging(entry: AccountsReceivableEntry, asOfDate: Date): AgingBucket {
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
    const customerMap = new Map<string, AgingSummary>();

    for (const entry of this.entries) {
      if (entry.status === 'paid' || entry.status === 'written_off') continue;

      const aging = this.calculateAging(entry, asOfDate);

      if (!customerMap.has(entry.customerId)) {
        customerMap.set(entry.customerId, {
          customerId: entry.customerId,
          customerName: entry.customerName,
          current: 0,
          days1_30: 0,
          days31_60: 0,
          days61_90: 0,
          daysOver90: 0,
          total: 0,
          creditUtilization: 0,
        });
      }

      const summary = customerMap.get(entry.customerId)!;
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
      summary.creditUtilization = entry.creditLimit > 0 ? (summary.total / entry.creditLimit) * 100 : 0;
    }

    return Array.from(customerMap.values());
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
    receivableId: string,
    amount: number,
    paymentDate: Date,
    paymentMethod: string,
    reference: string
  ): CollectionPayment {
    const receivable = this.entries.find(e => e.id === receivableId);
    if (!receivable) {
      throw new Error('Accounts receivable entry not found');
    }

    const payment: CollectionPayment = {
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      receivableId,
      amount,
      paymentDate,
      paymentMethod,
      reference,
      createdAt: new Date(),
    };

    this.payments.push(payment);

    // Update receivable balance
    receivable.balance -= amount;
    if (receivable.balance <= 0) {
      receivable.balance = 0;
      receivable.status = 'paid';
      receivable.paidAt = paymentDate;
    } else {
      receivable.status = 'partial';
    }

    return payment;
  }

  /**
   * Write off receivable
   */
  writeOffReceivable(receivableId: string, reason: string): AccountsReceivableEntry | null {
    const receivable = this.entries.find(e => e.id === receivableId);
    if (!receivable) {
      return null;
    }

    receivable.status = 'written_off';
    receivable.balance = 0;

    // Add collection note
    this.addNote(receivableId, `Written off: ${reason}`, 'system');

    return receivable;
  }

  /**
   * Add collection note
   */
  addNote(receivableId: string, note: string, createdBy: string): CollectionNote {
    const collectionNote: CollectionNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      receivableId,
      note,
      createdBy,
      createdAt: new Date(),
    };

    this.notes.push(collectionNote);
    return collectionNote;
  }

  /**
   * Get overdue receivables
   */
  getOverdueReceivables(asOfDate: Date): AccountsReceivableEntry[] {
    return this.entries.filter(
      entry => entry.status !== 'paid' && entry.status !== 'written_off' && entry.dueDate < asOfDate
    );
  }

  /**
   * Get upcoming collections
   */
  getUpcomingCollections(asOfDate: Date, days: number = 30): AccountsReceivableEntry[] {
    const cutoffDate = new Date(asOfDate);
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return this.entries.filter(
      entry => entry.status !== 'paid' && entry.status !== 'written_off' && entry.dueDate >= asOfDate && entry.dueDate <= cutoffDate
    );
  }

  /**
   * Forecast cash inflows
   */
  forecastCashInflows(asOfDate: Date, days: number = 90): Array<{
    date: Date;
    amount: number;
    receivables: number;
  }> {
    const forecast: Array<{
      date: Date;
      amount: number;
      receivables: number;
    }> = [];
    const cutoffDate = new Date(asOfDate);
    cutoffDate.setDate(cutoffDate.getDate() + days);

    const dateMap = new Map<string, { amount: number; receivables: number }>();

    for (const entry of this.entries) {
      if (entry.status === 'paid' || entry.status === 'written_off' || entry.dueDate < asOfDate || entry.dueDate > cutoffDate) {
        continue;
      }

      const dateKey = entry.dueDate.toISOString().split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { amount: 0, receivables: 0 });
      }

      const data = dateMap.get(dateKey)!;
      data.amount += entry.balance;
      data.receivables += 1;
    }

    for (const [dateStr, data] of dateMap.entries()) {
      forecast.push({
        date: new Date(dateStr),
        amount: data.amount,
        receivables: data.receivables,
      });
    }

    return forecast.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get customer summary
   */
  getCustomerSummary(customerId: string): {
    customerId: string;
    customerName: string;
    totalBalance: number;
    overdueAmount: number;
    creditLimit: number;
    creditUtilization: number;
    openInvoices: number;
    paymentHistory: CollectionPayment[];
  } | null {
    const customerEntries = this.entries.filter(e => e.customerId === customerId && e.status !== 'paid' && e.status !== 'written_off');
    
    if (customerEntries.length === 0) {
      return null;
    }

    const totalBalance = customerEntries.reduce((sum, e) => sum + e.balance, 0);
    const overdueAmount = customerEntries
      .filter(e => e.dueDate < new Date())
      .reduce((sum, e) => sum + e.balance, 0);
    const creditLimit = customerEntries[0].creditLimit;
    const creditUtilization = creditLimit > 0 ? (totalBalance / creditLimit) * 100 : 0;
    const paymentHistory = this.payments.filter(p => {
      const receivable = this.entries.find(e => e.id === p.receivableId);
      return receivable?.customerId === customerId;
    });

    return {
      customerId,
      customerName: customerEntries[0].customerName,
      totalBalance,
      overdueAmount,
      creditLimit,
      creditUtilization,
      openInvoices: customerEntries.length,
      paymentHistory,
    };
  }

  /**
   * Get collection notes
   */
  getCollectionNotes(receivableId: string): CollectionNote[] {
    return this.notes.filter(n => n.receivableId === receivableId);
  }

  /**
   * Get payment history
   */
  getPaymentHistory(limit?: number): CollectionPayment[] {
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
    totalReceivables: number;
    overduePercentage: number;
    averageDaysOverdue: number;
    writeOffRate: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  } {
    const openReceivables = this.entries.filter(e => e.status !== 'paid' && e.status !== 'written_off');
    const overdueReceivables = this.getOverdueReceivables(asOfDate);
    const writtenOffReceivables = this.entries.filter(e => e.status === 'written_off');
    
    const totalReceivables = openReceivables.reduce((sum, e) => sum + e.balance, 0);
    const overdueAmount = overdueReceivables.reduce((sum, e) => sum + e.balance, 0);
    const overduePercentage = totalReceivables > 0 ? (overdueAmount / totalReceivables) * 100 : 0;
    const writeOffRate = this.entries.length > 0 ? (writtenOffReceivables.length / this.entries.length) * 100 : 0;

    let totalDaysOverdue = 0;
    for (const receivable of overdueReceivables) {
      const daysOverdue = Math.floor((asOfDate.getTime() - receivable.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      totalDaysOverdue += daysOverdue;
    }
    const averageDaysOverdue = overdueReceivables.length > 0 ? totalDaysOverdue / overdueReceivables.length : 0;

    let riskLevel: 'low' | 'medium' | 'high';
    const recommendations: string[] = [];

    if (overduePercentage > 30 || averageDaysOverdue > 60 || writeOffRate > 10) {
      riskLevel = 'high';
      recommendations.push('High overdue percentage - escalate collection efforts');
      recommendations.push('Review credit limits for high-risk customers');
      if (writeOffRate > 10) {
        recommendations.push('High write-off rate - review credit policies');
      }
    } else if (overduePercentage > 15 || averageDaysOverdue > 30) {
      riskLevel = 'medium';
      recommendations.push('Moderate overdue percentage - increase collection activity');
    } else {
      riskLevel = 'low';
    }

    // Check credit utilization
    const agingReport = this.generateAgingReport(asOfDate);
    const highUtilizationCustomers = agingReport.filter(s => s.creditUtilization > 80);
    if (highUtilizationCustomers.length > 0) {
      recommendations.push(`${highUtilizationCustomers.length} customers exceed 80% credit utilization`);
    }

    return {
      totalReceivables,
      overduePercentage,
      averageDaysOverdue,
      writeOffRate,
      riskLevel,
      recommendations,
    };
  }

  /**
   * Get collection priority list
   */
  getCollectionPriorityList(asOfDate: Date): Array<{
    receivableId: string;
    customerName: string;
    invoiceNumber: string;
    amount: number;
    daysOverdue: number;
    priority: 'high' | 'medium' | 'low';
  }> {
    const overdueReceivables = this.getOverdueReceivables(asOfDate);

    return overdueReceivables.map(r => {
      const daysOverdue = Math.floor((asOfDate.getTime() - r.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let priority: 'high' | 'medium' | 'low';
      if (daysOverdue > 90) {
        priority = 'high';
      } else if (daysOverdue > 60) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      return {
        receivableId: r.id,
        customerName: r.customerName,
        invoiceNumber: r.invoiceNumber,
        amount: r.balance,
        daysOverdue,
        priority,
      };
    }).sort((a, b) => b.daysOverdue - a.daysOverdue);
  }
}
