/**
 * Accounting Periods System
 * 
 * Implements accounting period management with:
 * - Period creation and management
 * - Opening and closing balances
 * - Period locking
 * - Period closing entries
 * - Balance carry-forward
 */

import { Account, AccountType, NormalBalance } from './chart-of-accounts';
import { JournalEntry, TransactionStatus, TransactionType } from './journal-system';

// Period status
export enum PeriodStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  LOCKED = 'locked',
}

// Period type
export enum PeriodType {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

// Accounting period
export interface AccountingPeriod {
  id: string;
  name: string;
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  fiscalYear: number;
  status: PeriodStatus;
  openingBalances: Map<string, number>; // accountId -> balance
  closingBalances: Map<string, number>; // accountId -> balance
  createdAt: Date;
  createdBy: string;
  closedAt?: Date;
  closedBy?: string;
  lockedAt?: Date;
  lockedBy?: string;
}

// Period balance
export interface PeriodBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  openingBalance: number;
  closingBalance: number;
  netChange: number;
}

// Closing entry
export interface ClosingEntry {
  id: string;
  periodId: string;
  accountId: string;
  amount: number;
  description: string;
  createdAt: Date;
  createdBy: string;
}

/**
 * Create accounting period
 */
export function createAccountingPeriod(
  name: string,
  periodType: PeriodType,
  startDate: Date,
  endDate: Date,
  fiscalYear: number,
  userId: string
): AccountingPeriod {
  return {
    id: `period_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    periodType,
    startDate,
    endDate,
    fiscalYear,
    status: PeriodStatus.OPEN,
    openingBalances: new Map(),
    closingBalances: new Map(),
    createdAt: new Date(),
    createdBy: userId,
  };
}

/**
 * Calculate opening balances from previous period
 */
export function calculateOpeningBalances(
  previousPeriod: AccountingPeriod,
  accounts: Account[]
): Map<string, number> {
  const openingBalances = new Map<string, number>();

  for (const account of accounts) {
    const previousClosingBalance = previousPeriod.closingBalances.get(account.id) || 0;
    
    // Carry forward balance sheet accounts (Assets, Liabilities, Equity)
    // Reset income statement accounts (Revenue, Expenses)
    if (account.type === AccountType.ASSET || 
        account.type === AccountType.LIABILITY || 
        account.type === AccountType.EQUITY) {
      openingBalances.set(account.id, previousClosingBalance);
    } else {
      openingBalances.set(account.id, 0);
    }
  }

  return openingBalances;
}

/**
 * Calculate closing balances from journal entries
 */
export function calculateClosingBalances(
  accounts: Account[],
  entries: JournalEntry[],
  openingBalances: Map<string, number>
): Map<string, number> {
  const closingBalances = new Map<string, number>();

  // Initialize with opening balances
  for (const account of accounts) {
    closingBalances.set(account.id, openingBalances.get(account.id) || 0);
  }

  // Apply journal entries
  for (const entry of entries) {
    if (entry.status !== TransactionStatus.POSTED) continue;

    for (const lineItem of entry.lineItems) {
      const currentBalance = closingBalances.get(lineItem.accountId) || 0;
      
      if (accountNormalBalance(accounts, lineItem.accountId) === NormalBalance.DEBIT) {
        closingBalances.set(lineItem.accountId, currentBalance + lineItem.debit - lineItem.credit);
      } else {
        closingBalances.set(lineItem.accountId, currentBalance + lineItem.credit - lineItem.debit);
      }
    }
  }

  return closingBalances;
}

/**
 * Get account normal balance
 */
function accountNormalBalance(accounts: Account[], accountId: string): NormalBalance {
  const account = accounts.find(a => a.id === accountId);
  return account?.normalBalance || NormalBalance.DEBIT;
}

/**
 * Close accounting period
 */
export function closeAccountingPeriod(
  period: AccountingPeriod,
  accounts: Account[],
  entries: JournalEntry[],
  userId: string
): { closedPeriod: AccountingPeriod; closingEntries: ClosingEntry[] } {
  if (period.status !== PeriodStatus.OPEN) {
    throw new Error('Only open periods can be closed');
  }

  // Calculate closing balances
  const closingBalances = calculateClosingBalances(accounts, entries, period.openingBalances);

  // Generate closing entries for income statement accounts
  const closingEntries: ClosingEntry[] = [];
  
  for (const account of accounts) {
    if (account.type === AccountType.REVENUE || account.type === AccountType.EXPENSE) {
      const balance = closingBalances.get(account.id) || 0;
      
      if (Math.abs(balance) > 0.01) {
        closingEntries.push({
          id: `close_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          periodId: period.id,
          accountId: account.id,
          amount: balance,
          description: `Closing entry for ${account.name}`,
          createdAt: new Date(),
          createdBy: userId,
        });
      }
    }
  }

  // Update period status
  const closedPeriod: AccountingPeriod = {
    ...period,
    status: PeriodStatus.CLOSED,
    closingBalances,
    closedAt: new Date(),
    closedBy: userId,
  };

  return {
    closedPeriod,
    closingEntries,
  };
}

/**
 * Lock accounting period
 */
export function lockAccountingPeriod(
  period: AccountingPeriod,
  userId: string
): AccountingPeriod {
  if (period.status !== PeriodStatus.CLOSED) {
    throw new Error('Only closed periods can be locked');
  }

  return {
    ...period,
    status: PeriodStatus.LOCKED,
    lockedAt: new Date(),
    lockedBy: userId,
  };
}

/**
 * Reopen accounting period
 */
export function reopenAccountingPeriod(
  period: AccountingPeriod,
  userId: string
): AccountingPeriod {
  if (period.status === PeriodStatus.LOCKED) {
    throw new Error('Locked periods cannot be reopened');
  }

  return {
    ...period,
    status: PeriodStatus.OPEN,
    closedAt: undefined,
    closedBy: undefined,
  };
}

/**
 * Get period balances
 */
export function getPeriodBalances(
  period: AccountingPeriod,
  accounts: Account[]
): PeriodBalance[] {
  const balances: PeriodBalance[] = [];

  for (const account of accounts) {
    const openingBalance = period.openingBalances.get(account.id) || 0;
    const closingBalance = period.closingBalances.get(account.id) || 0;
    const netChange = closingBalance - openingBalance;

    balances.push({
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      openingBalance,
      closingBalance,
      netChange,
    });
  }

  return balances;
}

/**
 * Filter entries by period
 */
export function filterEntriesByPeriod(
  entries: JournalEntry[],
  period: AccountingPeriod
): JournalEntry[] {
  return entries.filter(entry => {
    const entryDate = new Date(entry.transactionDate);
    return entryDate >= period.startDate && entryDate <= period.endDate;
  });
}

/**
 * Get period by date
 */
export function getPeriodByDate(
  periods: AccountingPeriod[],
  date: Date
): AccountingPeriod | undefined {
  return periods.find(period => {
    return date >= period.startDate && date <= period.endDate;
  });
}

/**
 * Get fiscal year periods
 */
export function getFiscalYearPeriods(
  periods: AccountingPeriod[],
  fiscalYear: number
): AccountingPeriod[] {
  return periods.filter(period => period.fiscalYear === fiscalYear);
}

/**
 * Generate period name
 */
export function generatePeriodName(
  periodType: PeriodType,
  startDate: Date,
  endDate: Date
): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  switch (periodType) {
    case PeriodType.MONTHLY:
      return startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    case PeriodType.QUARTERLY: {
      const quarter = Math.floor(startDate.getMonth() / 3) + 1;
      return `Q${quarter} ${startDate.getFullYear()}`;
    }
    case PeriodType.YEARLY:
      return `FY ${startDate.getFullYear()}`;
    default:
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
}

/**
 * Check if period can be modified
 */
export function canModifyPeriod(period: AccountingPeriod): boolean {
  return period.status === PeriodStatus.OPEN;
}

/**
 * Check if period can be closed
 */
export function canClosePeriod(period: AccountingPeriod, entries: JournalEntry[]): boolean {
  if (period.status !== PeriodStatus.OPEN) {
    return false;
  }

  // Check if there are any unposted entries in the period
  const periodEntries = filterEntriesByPeriod(entries, period);
  const hasUnpostedEntries = periodEntries.some(entry => entry.status === TransactionStatus.DRAFT);

  return !hasUnpostedEntries;
}

/**
 * Get period statistics
 */
export function getPeriodStatistics(
  period: AccountingPeriod,
  entries: JournalEntry
): {
  totalEntries: number;
  postedEntries: number;
  draftEntries: number;
  totalDebit: number;
  totalCredit: number;
} {
  const periodEntries = filterEntriesByPeriod([entries], period);
  
  const posted = periodEntries.filter(e => e.status === TransactionStatus.POSTED).length;
  const draft = periodEntries.filter(e => e.status === TransactionStatus.DRAFT).length;
  const totalDebit = periodEntries.reduce((sum, e) => sum + e.totalDebit, 0);
  const totalCredit = periodEntries.reduce((sum, e) => sum + e.totalCredit, 0);

  return {
    totalEntries: periodEntries.length,
    postedEntries: posted,
    draftEntries: draft,
    totalDebit,
    totalCredit,
  };
}

/**
 * Create fiscal year periods
 */
export function createFiscalYearPeriods(
  fiscalYear: number,
  startDate: Date,
  userId: string
): AccountingPeriod[] {
  const periods: AccountingPeriod[] = [];
  
  // Create 12 monthly periods
  for (let month = 0; month < 12; month++) {
    const periodStart = new Date(fiscalYear, month, 1);
    const periodEnd = new Date(fiscalYear, month + 1, 0); // Last day of month
    
    const period = createAccountingPeriod(
      generatePeriodName(PeriodType.MONTHLY, periodStart, periodEnd),
      PeriodType.MONTHLY,
      periodStart,
      periodEnd,
      fiscalYear,
      userId
    );
    
    periods.push(period);
  }
  
  return periods;
}

/**
 * Get period status label
 */
export function getPeriodStatusLabel(status: PeriodStatus): string {
  const labels: Record<PeriodStatus, string> = {
    [PeriodStatus.OPEN]: 'Open',
    [PeriodStatus.CLOSED]: 'Closed',
    [PeriodStatus.LOCKED]: 'Locked',
  };

  return labels[status];
}
