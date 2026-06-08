/**
 * Accrual Accounting
 * 
 * Implements ERP-grade accrual accounting with:
 * - Accrual journal entries
 * - Deferral journal entries
 * - Revenue recognition
 * - Expense matching
 * - Prepaid expenses
 * - Accrued revenues
 * - Period-end adjustments
 */

// Accrual type
export enum AccrualType {
  ACCRUED_REVENUE = 'accrued_revenue',
  ACCRUED_EXPENSE = 'accrued_expense',
  DEFERRED_REVENUE = 'deferred_revenue',
  DEFERRED_EXPENSE = 'deferred_expense',
  PREPAID_EXPENSE = 'prepaid_expense',
}

// Accrual entry
export interface AccrualEntry {
  id: string;
  type: AccrualType;
  description: string;
  amount: number;
  debitAccountId: string;
  creditAccountId: string;
  transactionDate: Date;
  recognitionDate: Date;
  periodId: string;
  status: 'pending' | 'recognized' | 'reversed';
  createdAt: Date;
  recognizedAt?: Date;
  reversedAt?: Date;
}

// Revenue recognition schedule
export interface RevenueRecognitionSchedule {
  id: string;
  contractId: string;
  totalAmount: number;
  recognitionPeriod: 'monthly' | 'quarterly' | 'annually';
  startDate: Date;
  endDate: Date;
  totalPeriods: number;
  recognizedAmount: number;
  remainingAmount: number;
  entries: RevenueRecognitionEntry[];
}

// Revenue recognition entry
export interface RevenueRecognitionEntry {
  id: string;
  scheduleId: string;
  periodId: string;
  amount: number;
  recognitionDate: Date;
  status: 'pending' | 'recognized';
  recognizedAt?: Date;
}

// Prepaid expense
export interface PrepaidExpense {
  id: string;
  description: string;
  totalAmount: number;
  paymentDate: Date;
  expensePeriod: 'monthly' | 'quarterly' | 'annually';
  startDate: Date;
  endDate: Date;
  totalPeriods: number;
  recognizedAmount: number;
  remainingAmount: number;
  assetAccountId: string;
  expenseAccountId: string;
  entries: PrepaidExpenseEntry[];
}

// Prepaid expense entry
export interface PrepaidExpenseEntry {
  id: string;
  prepaidExpenseId: string;
  periodId: string;
  amount: number;
  recognitionDate: Date;
  status: 'pending' | 'recognized';
  recognizedAt?: Date;
}

/**
 * Accrual Accounting Engine
 */
export class AccrualAccountingEngine {
  private accrualEntries: AccrualEntry[];
  private revenueSchedules: RevenueRecognitionSchedule[];
  private prepaidExpenses: PrepaidExpense[];

  constructor() {
    this.accrualEntries = [];
    this.revenueSchedules = [];
    this.prepaidExpenses = [];
  }

  /**
   * Create accrual entry
   */
  createAccrualEntry(
    type: AccrualType,
    description: string,
    amount: number,
    debitAccountId: string,
    creditAccountId: string,
    transactionDate: Date,
    recognitionDate: Date,
    periodId: string
  ): AccrualEntry {
    const entry: AccrualEntry = {
      id: `accrual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      description,
      amount,
      debitAccountId,
      creditAccountId,
      transactionDate,
      recognitionDate,
      periodId,
      status: 'pending',
      createdAt: new Date(),
    };

    this.accrualEntries.push(entry);
    return entry;
  }

  /**
   * Recognize accrual entry
   */
  recognizeAccrualEntry(entryId: string): AccrualEntry | null {
    const entry = this.accrualEntries.find(e => e.id === entryId);
    if (entry && entry.status === 'pending') {
      entry.status = 'recognized';
      entry.recognizedAt = new Date();
      return entry;
    }
    return null;
  }

  /**
   * Reverse accrual entry
   */
  reverseAccrualEntry(entryId: string): AccrualEntry | null {
    const entry = this.accrualEntries.find(e => e.id === entryId);
    if (entry && entry.status === 'recognized') {
      entry.status = 'reversed';
      entry.reversedAt = new Date();
      return entry;
    }
    return null;
  }

  /**
   * Create revenue recognition schedule
   */
  createRevenueRecognitionSchedule(
    contractId: string,
    totalAmount: number,
    recognitionPeriod: 'monthly' | 'quarterly' | 'annually',
    startDate: Date,
    endDate: Date
  ): RevenueRecognitionSchedule {
    const totalPeriods = this.calculateTotalPeriods(recognitionPeriod, startDate, endDate);
    const amountPerPeriod = totalAmount / totalPeriods;

    const entries: RevenueRecognitionEntry[] = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < totalPeriods; i++) {
      const recognitionDate = new Date(currentDate);
      
      entries.push({
        id: `rev_rec_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        scheduleId: '',
        periodId: '',
        amount: amountPerPeriod,
        recognitionDate,
        status: 'pending',
      });

      // Advance to next period
      if (recognitionPeriod === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (recognitionPeriod === 'quarterly') {
        currentDate.setMonth(currentDate.getMonth() + 3);
      } else {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      }
    }

    const schedule: RevenueRecognitionSchedule = {
      id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contractId,
      totalAmount,
      recognitionPeriod,
      startDate,
      endDate,
      totalPeriods,
      recognizedAmount: 0,
      remainingAmount: totalAmount,
      entries,
    };

    // Link entries to schedule
    schedule.entries.forEach(entry => {
      entry.scheduleId = schedule.id;
    });

    this.revenueSchedules.push(schedule);
    return schedule;
  }

  /**
   * Calculate total periods
   */
  private calculateTotalPeriods(
    period: 'monthly' | 'quarterly' | 'annually',
    startDate: Date,
    endDate: Date
  ): number {
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
    
    switch (period) {
      case 'monthly':
        return months;
      case 'quarterly':
        return Math.floor(months / 3);
      case 'annually':
        return Math.floor(months / 12);
      default:
        return months;
    }
  }

  /**
   * Recognize revenue for period
   */
  recognizeRevenueForPeriod(periodId: string, recognitionDate: Date): RevenueRecognitionEntry[] {
    const recognized: RevenueRecognitionEntry[] = [];

    for (const schedule of this.revenueSchedules) {
      for (const entry of schedule.entries) {
        if (entry.periodId === periodId && entry.status === 'pending' && entry.recognitionDate <= recognitionDate) {
          entry.status = 'recognized';
          entry.recognizedAt = new Date();
          schedule.recognizedAmount += entry.amount;
          schedule.remainingAmount -= entry.amount;
          recognized.push(entry);
        }
      }
    }

    return recognized;
  }

  /**
   * Create prepaid expense
   */
  createPrepaidExpense(
    description: string,
    totalAmount: number,
    paymentDate: Date,
    expensePeriod: 'monthly' | 'quarterly' | 'annually',
    startDate: Date,
    endDate: Date,
    assetAccountId: string,
    expenseAccountId: string
  ): PrepaidExpense {
    const totalPeriods = this.calculateTotalPeriods(expensePeriod, startDate, endDate);
    const amountPerPeriod = totalAmount / totalPeriods;

    const entries: PrepaidExpenseEntry[] = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < totalPeriods; i++) {
      const recognitionDate = new Date(currentDate);
      
      entries.push({
        id: `prepaid_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        prepaidExpenseId: '',
        periodId: '',
        amount: amountPerPeriod,
        recognitionDate,
        status: 'pending',
      });

      // Advance to next period
      if (expensePeriod === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (expensePeriod === 'quarterly') {
        currentDate.setMonth(currentDate.getMonth() + 3);
      } else {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      }
    }

    const prepaidExpense: PrepaidExpense = {
      id: `prepaid_exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description,
      totalAmount,
      paymentDate,
      expensePeriod,
      startDate,
      endDate,
      totalPeriods,
      recognizedAmount: 0,
      remainingAmount: totalAmount,
      assetAccountId,
      expenseAccountId,
      entries,
    };

    // Link entries to prepaid expense
    prepaidExpense.entries.forEach(entry => {
      entry.prepaidExpenseId = prepaidExpense.id;
    });

    this.prepaidExpenses.push(prepaidExpense);
    return prepaidExpense;
  }

  /**
   * Recognize prepaid expense for period
   */
  recognizePrepaidExpenseForPeriod(periodId: string, recognitionDate: Date): PrepaidExpenseEntry[] {
    const recognized: PrepaidExpenseEntry[] = [];

    for (const prepaidExpense of this.prepaidExpenses) {
      for (const entry of prepaidExpense.entries) {
        if (entry.periodId === periodId && entry.status === 'pending' && entry.recognitionDate <= recognitionDate) {
          entry.status = 'recognized';
          entry.recognizedAt = new Date();
          prepaidExpense.recognizedAmount += entry.amount;
          prepaidExpense.remainingAmount -= entry.amount;
          recognized.push(entry);
        }
      }
    }

    return recognized;
  }

  /**
   * Generate period-end adjustments
   */
  generatePeriodEndAdjustments(periodId: string, periodEndDate: Date): Array<{
    type: 'accrual' | 'deferral';
    description: string;
    debitAccountId: string;
    creditAccountId: string;
    amount: number;
  }> {
    const adjustments: Array<{
      type: 'accrual' | 'deferral';
      description: string;
      debitAccountId: string;
      creditAccountId: string;
      amount: number;
    }> = [];

    // Recognize pending accruals
    for (const entry of this.accrualEntries) {
      if (entry.periodId === periodId && entry.status === 'pending' && entry.recognitionDate <= periodEndDate) {
        adjustments.push({
          type: 'accrual',
          description: entry.description,
          debitAccountId: entry.debitAccountId,
          creditAccountId: entry.creditAccountId,
          amount: entry.amount,
        });
      }
    }

    // Recognize revenue
    const revenueEntries = this.recognizeRevenueForPeriod(periodId, periodEndDate);
    for (const entry of revenueEntries) {
      const schedule = this.revenueSchedules.find(s => s.id === entry.scheduleId);
      if (schedule) {
        adjustments.push({
          type: 'accrual',
          description: `Revenue recognition for contract ${schedule.contractId}`,
          debitAccountId: 'accounts_receivable',
          creditAccountId: 'revenue',
          amount: entry.amount,
        });
      }
    }

    // Recognize prepaid expenses
    const prepaidEntries = this.recognizePrepaidExpenseForPeriod(periodId, periodEndDate);
    for (const entry of prepaidEntries) {
      const prepaidExpense = this.prepaidExpenses.find(p => p.id === entry.prepaidExpenseId);
      if (prepaidExpense) {
        adjustments.push({
          type: 'deferral',
          description: `Prepaid expense recognition: ${prepaidExpense.description}`,
          debitAccountId: prepaidExpense.expenseAccountId,
          creditAccountId: prepaidExpense.assetAccountId,
          amount: entry.amount,
        });
      }
    }

    return adjustments;
  }

  /**
   * Get pending accruals for period
   */
  getPendingAccruals(periodId: string): AccrualEntry[] {
    return this.accrualEntries.filter(e => e.periodId === periodId && e.status === 'pending');
  }

  /**
   * Get pending revenue recognition
   */
  getPendingRevenueRecognition(periodId: string): RevenueRecognitionEntry[] {
    const pending: RevenueRecognitionEntry[] = [];
    
    for (const schedule of this.revenueSchedules) {
      for (const entry of schedule.entries) {
        if (entry.periodId === periodId && entry.status === 'pending') {
          pending.push(entry);
        }
      }
    }

    return pending;
  }

  /**
   * Get pending prepaid expense recognition
   */
  getPendingPrepaidExpenseRecognition(periodId: string): PrepaidExpenseEntry[] {
    const pending: PrepaidExpenseEntry[] = [];
    
    for (const prepaidExpense of this.prepaidExpenses) {
      for (const entry of prepaidExpense.entries) {
        if (entry.periodId === periodId && entry.status === 'pending') {
          pending.push(entry);
        }
      }
    }

    return pending;
  }

  /**
   * Get accrual summary
   */
  getAccrualSummary(periodId: string): {
    totalAccruals: number;
    recognized: number;
    pending: number;
    byType: Record<AccrualType, number>;
  } {
    const periodAccruals = this.accrualEntries.filter(e => e.periodId === periodId);
    const recognized = periodAccruals.filter(e => e.status === 'recognized').length;
    const pending = periodAccruals.filter(e => e.status === 'pending').length;

    const byType: Record<AccrualType, number> = {
      [AccrualType.ACCRUED_REVENUE]: 0,
      [AccrualType.ACCRUED_EXPENSE]: 0,
      [AccrualType.DEFERRED_REVENUE]: 0,
      [AccrualType.DEFERRED_EXPENSE]: 0,
      [AccrualType.PREPAID_EXPENSE]: 0,
    };

    for (const entry of periodAccruals) {
      byType[entry.type] += entry.amount;
    }

    return {
      totalAccruals: periodAccruals.length,
      recognized,
      pending,
      byType,
    };
  }
}
