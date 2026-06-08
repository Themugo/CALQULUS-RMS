/**
 * Trial Balance
 * 
 * Implements ERP-grade trial balance with:
 * - Account balance calculation
 * - Debit/credit verification
 * - Period closing
 * - Balance adjustments
 * - Trial balance report
 * - Error detection
 */

// Account balance
export interface AccountBalance {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
  normalBalance: 'debit' | 'credit';
}

// Trial balance
export interface TrialBalance {
  periodId: string;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  balances: AccountBalance[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  difference: number;
  errors: TrialBalanceError[];
}

// Trial balance error
export interface TrialBalanceError {
  accountId: string;
  accountName: string;
  errorType: 'imbalance' | 'missing_entry' | 'incorrect_normal_balance' | 'rounding';
  description: string;
  severity: 'error' | 'warning';
}

// Balance adjustment
export interface BalanceAdjustment {
  id: string;
  accountId: string;
  adjustmentType: 'correction' | 'reclassification' | 'accrual' | 'deferral';
  debitAmount: number;
  creditAmount: number;
  reason: string;
  approvedBy: string;
  approvedAt: Date;
}

/**
 * Trial Balance Calculator
 */
export class TrialBalanceCalculator {
  /**
   * Calculate trial balance for period
   */
  calculateTrialBalance(
    journalEntries: Array<{
      accountId: string;
      debit: number;
      credit: number;
    }>,
    chartOfAccounts: Array<{
      id: string;
      accountNumber: string;
      name: string;
      type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    }>,
    period: {
      id: string;
      startDate: Date;
      endDate: Date;
    }
  ): TrialBalance {
    const balances = this.calculateAccountBalances(journalEntries, chartOfAccounts);
    const totalDebits = balances.reduce((sum, b) => sum + b.debitBalance, 0);
    const totalCredits = balances.reduce((sum, b) => sum + b.creditBalance, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
    const difference = totalDebits - totalCredits;
    const errors = this.detectErrors(balances, totalDebits, totalCredits);

    return {
      periodId: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      generatedAt: new Date(),
      balances,
      totalDebits,
      totalCredits,
      isBalanced,
      difference,
      errors,
    };
  }

  /**
   * Calculate account balances
   */
  private calculateAccountBalances(
    journalEntries: Array<{
      accountId: string;
      debit: number;
      credit: number;
    }>,
    chartOfAccounts: Array<{
      id: string;
      accountNumber: string;
      name: string;
      type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    }>
  ): AccountBalance[] {
    const balances = new Map<string, AccountBalance>();

    // Initialize balances from chart of accounts
    for (const account of chartOfAccounts) {
      balances.set(account.id, {
        accountId: account.id,
        accountNumber: account.accountNumber,
        accountName: account.name,
        accountType: account.type,
        debitBalance: 0,
        creditBalance: 0,
        netBalance: 0,
        normalBalance: this.getNormalBalance(account.type),
      });
    }

    // Sum journal entries
    for (const entry of journalEntries) {
      const balance = balances.get(entry.accountId);
      if (balance) {
        balance.debitBalance += entry.debit;
        balance.creditBalance += entry.credit;
        balance.netBalance = balance.debitBalance - balance.creditBalance;
      }
    }

    return Array.from(balances.values());
  }

  /**
   * Get normal balance for account type
   */
  private getNormalBalance(accountType: string): 'debit' | 'credit' {
    switch (accountType) {
      case 'asset':
      case 'expense':
        return 'debit';
      case 'liability':
      case 'equity':
      case 'revenue':
        return 'credit';
      default:
        return 'debit';
    }
  }

  /**
   * Detect trial balance errors
   */
  private detectErrors(
    balances: AccountBalance[],
    totalDebits: number,
    totalCredits: number
  ): TrialBalanceError[] {
    const errors: TrialBalanceError[] = [];

    // Check for overall imbalance
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      errors.push({
        accountId: 'SYSTEM',
        accountName: 'Trial Balance',
        errorType: 'imbalance',
        description: `Trial balance is not balanced. Difference: ${totalDebits - totalCredits}`,
        severity: 'error',
      });
    }

    // Check individual account balances
    for (const balance of balances) {
      // Check for incorrect normal balance
      if (balance.normalBalance === 'debit' && balance.netBalance < 0) {
        errors.push({
          accountId: balance.accountId,
          accountName: balance.accountName,
          errorType: 'incorrect_normal_balance',
          description: `Account has credit balance but should have debit balance`,
          severity: 'warning',
        });
      } else if (balance.normalBalance === 'credit' && balance.netBalance > 0) {
        errors.push({
          accountId: balance.accountId,
          accountName: balance.accountName,
          errorType: 'incorrect_normal_balance',
          description: `Account has debit balance but should have credit balance`,
          severity: 'warning',
        });
      }

      // Check for rounding errors
      if (Math.abs(balance.netBalance) < 0.01 && balance.netBalance !== 0) {
        errors.push({
          accountId: balance.accountId,
          accountName: balance.accountName,
          errorType: 'rounding',
          description: `Account has negligible balance due to rounding`,
          severity: 'warning',
        });
      }
    }

    return errors;
  }

  /**
   * Create balance adjustment
   */
  createAdjustment(
    accountId: string,
    adjustmentType: 'correction' | 'reclassification' | 'accrual' | 'deferral',
    debitAmount: number,
    creditAmount: number,
    reason: string,
    approvedBy: string
  ): BalanceAdjustment {
    return {
      id: `adjustment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accountId,
      adjustmentType,
      debitAmount,
      creditAmount,
      reason,
      approvedBy,
      approvedAt: new Date(),
    };
  }

  /**
   * Apply adjustment to trial balance
   */
  applyAdjustment(trialBalance: TrialBalance, adjustment: BalanceAdjustment): TrialBalance {
    const balance = trialBalance.balances.find(b => b.accountId === adjustment.accountId);
    if (balance) {
      balance.debitBalance += adjustment.debitAmount;
      balance.creditBalance += adjustment.creditAmount;
      balance.netBalance = balance.debitBalance - balance.creditBalance;
    }

    // Recalculate totals
    trialBalance.totalDebits = trialBalance.balances.reduce((sum, b) => sum + b.debitBalance, 0);
    trialBalance.totalCredits = trialBalance.balances.reduce((sum, b) => sum + b.creditBalance, 0);
    trialBalance.isBalanced = Math.abs(trialBalance.totalDebits - trialBalance.totalCredits) < 0.01;
    trialBalance.difference = trialBalance.totalDebits - trialBalance.totalCredits;
    trialBalance.errors = this.detectErrors(trialBalance.balances, trialBalance.totalDebits, trialBalance.totalCredits);

    return trialBalance;
  }

  /**
   * Generate trial balance report
   */
  generateReport(trialBalance: TrialBalance): {
    summary: {
      period: string;
      generatedAt: Date;
      totalAccounts: number;
      totalDebits: number;
      totalCredits: number;
      isBalanced: boolean;
    };
    balances: AccountBalance[];
    errors: TrialBalanceError[];
  } {
    return {
      summary: {
        period: `${trialBalance.startDate.toISOString()} to ${trialBalance.endDate.toISOString()}`,
        generatedAt: trialBalance.generatedAt,
        totalAccounts: trialBalance.balances.length,
        totalDebits: trialBalance.totalDebits,
        totalCredits: trialBalance.totalCredits,
        isBalanced: trialBalance.isBalanced,
      },
      balances: trialBalance.balances,
      errors: trialBalance.errors,
    };
  }

  /**
   * Export trial balance to CSV
   */
  exportToCSV(trialBalance: TrialBalance): string {
    const headers = ['Account Number', 'Account Name', 'Account Type', 'Debit', 'Credit', 'Net Balance'];
    const rows = trialBalance.balances.map(b => [
      b.accountNumber,
      b.accountName,
      b.accountType,
      b.debitBalance.toFixed(2),
      b.creditBalance.toFixed(2),
      b.netBalance.toFixed(2),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

/**
 * Trial Balance Validator
 */
export class TrialBalanceValidator {
  /**
   * Validate trial balance
   */
  validate(trialBalance: TrialBalance): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if balanced
    if (!trialBalance.isBalanced) {
      errors.push(`Trial balance is not balanced. Difference: ${trialBalance.difference.toFixed(2)}`);
    }

    // Check for critical errors
    for (const error of trialBalance.errors) {
      if (error.severity === 'error') {
        errors.push(`${error.accountName}: ${error.description}`);
      } else {
        warnings.push(`${error.accountName}: ${error.description}`);
      }
    }

    // Check for zero-balance accounts
    const zeroBalanceAccounts = trialBalance.balances.filter(b => Math.abs(b.netBalance) < 0.01);
    if (zeroBalanceAccounts.length > trialBalance.balances.length * 0.5) {
      warnings.push('More than 50% of accounts have zero balance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if trial balance can be closed
   */
  canClosePeriod(trialBalance: TrialBalance): boolean {
    const validation = this.validate(trialBalance);
    return validation.isValid && validation.warnings.length === 0;
  }
}
