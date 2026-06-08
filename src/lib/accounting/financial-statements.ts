/**
 * Financial Statements Generator
 * 
 * Generates financial statements:
 * - Balance Sheet
 * - Profit & Loss Statement
 * - Cash Flow Statement
 * - Trial Balance
 * - Statement of Changes in Equity
 */

import { Account, AccountType, NormalBalance } from './chart-of-accounts';
import { JournalEntry, TransactionStatus } from './journal-system';
import { AccountingPeriod } from './accounting-periods';

// Balance sheet line item
export interface BalanceSheetItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  level: number;
}

// Balance sheet
export interface BalanceSheet {
  reportDate: Date;
  periodId: string;
  assets: BalanceSheetItem[];
  liabilities: BalanceSheetItem[];
  equity: BalanceSheetItem[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  generatedAt: Date;
  generatedBy: string;
}

// P&L line item
export interface ProfitLossItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  level: number;
}

// Profit & Loss statement
export interface ProfitLossStatement {
  startDate: Date;
  endDate: Date;
  periodId: string;
  revenue: ProfitLossItem[];
  expenses: ProfitLossItem[];
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  generatedAt: Date;
  generatedBy: string;
}

// Cash flow line item
export interface CashFlowItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
  category: 'operating' | 'investing' | 'financing';
  isSubtotal?: boolean;
  isTotal?: boolean;
  level: number;
}

// Cash flow statement
export interface CashFlowStatement {
  startDate: Date;
  endDate: Date;
  periodId: string;
  operatingActivities: CashFlowItem[];
  investingActivities: CashFlowItem[];
  financingActivities: CashFlowItem[];
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
  generatedAt: Date;
  generatedBy: string;
}

// Trial balance line item
export interface TrialBalanceItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debit: number;
  credit: number;
  balance: number;
}

// Trial balance
export interface TrialBalance {
  reportDate: Date;
  periodId: string;
  items: TrialBalanceItem[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  generatedAt: Date;
  generatedBy: string;
}

/**
 * Calculate account balance from journal entries
 */
function calculateAccountBalance(
  accountId: string,
  entries: JournalEntry[],
  normalBalance: NormalBalance
): number {
  let balance = 0;

  for (const entry of entries) {
    if (entry.status !== TransactionStatus.POSTED) continue;

    for (const lineItem of entry.lineItems) {
      if (lineItem.accountId === accountId) {
        if (normalBalance === NormalBalance.DEBIT) {
          balance += lineItem.debit - lineItem.credit;
        } else {
          balance += lineItem.credit - lineItem.debit;
        }
      }
    }
  }

  return balance;
}

/**
 * Generate balance sheet
 */
export function generateBalanceSheet(
  accounts: Account[],
  entries: JournalEntry[],
  period: AccountingPeriod,
  userId: string
): BalanceSheet {
  const assets: BalanceSheetItem[] = [];
  const liabilities: BalanceSheetItem[] = [];
  const equity: BalanceSheetItem[] = [];

  // Calculate balances for each account
  for (const account of accounts) {
    if (!account.isActive) continue;

    const balance = calculateAccountBalance(account.id, entries, account.normalBalance);

    if (Math.abs(balance) < 0.01) continue;

    const item: BalanceSheetItem = {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      amount: balance,
      level: 1,
    };

    switch (account.type) {
      case AccountType.ASSET:
        assets.push(item);
        break;
      case AccountType.LIABILITY:
        liabilities.push(item);
        break;
      case AccountType.EQUITY:
        equity.push(item);
        break;
    }
  }

  // Calculate totals
  const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, item) => sum + item.amount, 0);
  const totalEquity = equity.reduce((sum, item) => sum + item.amount, 0);

  // Add total line items
  assets.push({
    accountId: '',
    accountCode: '',
    accountName: 'Total Assets',
    amount: totalAssets,
    isTotal: true,
    level: 0,
  });

  liabilities.push({
    accountId: '',
    accountCode: '',
    accountName: 'Total Liabilities',
    amount: totalLiabilities,
    isTotal: true,
    level: 0,
  });

  equity.push({
    accountId: '',
    accountCode: '',
    accountName: 'Total Equity',
    amount: totalEquity,
    isTotal: true,
    level: 0,
  });

  return {
    reportDate: period.endDate,
    periodId: period.id,
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    generatedAt: new Date(),
    generatedBy: userId,
  };
}

/**
 * Generate profit & loss statement
 */
export function generateProfitLossStatement(
  accounts: Account[],
  entries: JournalEntry[],
  period: AccountingPeriod,
  userId: string
): ProfitLossStatement {
  const revenue: ProfitLossItem[] = [];
  const expenses: ProfitLossItem[] = [];

  // Calculate balances for revenue and expense accounts
  for (const account of accounts) {
    if (!account.isActive) continue;

    if (account.type !== AccountType.REVENUE && account.type !== AccountType.EXPENSE) {
      continue;
    }

    const balance = calculateAccountBalance(account.id, entries, account.normalBalance);

    if (Math.abs(balance) < 0.01) continue;

    const item: ProfitLossItem = {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      amount: balance,
      level: 1,
    };

    switch (account.type) {
      case AccountType.REVENUE:
        revenue.push(item);
        break;
      case AccountType.EXPENSE:
        expenses.push(item);
        break;
    }
  }

  // Calculate totals
  const totalRevenue = revenue.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const grossProfit = totalRevenue;
  const operatingIncome = totalRevenue - totalExpenses;
  const netIncome = operatingIncome;

  // Add total line items
  revenue.push({
    accountId: '',
    accountCode: '',
    accountName: 'Total Revenue',
    amount: totalRevenue,
    isTotal: true,
    level: 0,
  });

  expenses.push({
    accountId: '',
    accountCode: '',
    accountName: 'Total Expenses',
    amount: totalExpenses,
    isTotal: true,
    level: 0,
  });

  return {
    startDate: period.startDate,
    endDate: period.endDate,
    periodId: period.id,
    revenue,
    expenses,
    grossProfit,
    operatingIncome,
    netIncome,
    generatedAt: new Date(),
    generatedBy: userId,
  };
}

/**
 * Generate cash flow statement
 */
export function generateCashFlowStatement(
  accounts: Account[],
  entries: JournalEntry[],
  period: AccountingPeriod,
  beginningCash: number,
  userId: string
): CashFlowStatement {
  const operatingActivities: CashFlowItem[] = [];
  const investingActivities: CashFlowItem[] = [];
  const financingActivities: CashFlowItem[] = [];

  // Cash accounts
  const cashAccounts = accounts.filter(a => 
    a.type === AccountType.ASSET && 
    a.code.startsWith('111') // Cash and cash equivalents
  );

  // Calculate cash flows from journal entries
  for (const account of accounts) {
    if (!account.isActive) continue;

    const balance = calculateAccountBalance(account.id, entries, account.normalBalance);

    if (Math.abs(balance) < 0.01) continue;

    // Determine cash flow category based on account type
    let category: 'operating' | 'investing' | 'financing' = 'operating';

    if (account.type === AccountType.ASSET && account.code.startsWith('12')) {
      category = 'investing';
    } else if (account.type === AccountType.LIABILITY && account.code.startsWith('22')) {
      category = 'financing';
    }

    const item: CashFlowItem = {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      amount: balance,
      category,
      level: 1,
    };

    switch (category) {
      case 'operating':
        operatingActivities.push(item);
        break;
      case 'investing':
        investingActivities.push(item);
        break;
      case 'financing':
        financingActivities.push(item);
        break;
    }
  }

  // Calculate net cash flow
  const operatingCashFlow = operatingActivities.reduce((sum, item) => sum + item.amount, 0);
  const investingCashFlow = investingActivities.reduce((sum, item) => sum + item.amount, 0);
  const financingCashFlow = financingActivities.reduce((sum, item) => sum + item.amount, 0);
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

  const endingCash = beginningCash + netCashFlow;

  // Add total line items
  operatingActivities.push({
    accountId: '',
    accountCode: '',
    accountName: 'Net Cash from Operating Activities',
    amount: operatingCashFlow,
    isTotal: true,
    category: 'operating',
    level: 0,
  });

  investingActivities.push({
    accountId: '',
    accountCode: '',
    accountName: 'Net Cash from Investing Activities',
    amount: investingCashFlow,
    isTotal: true,
    category: 'investing',
    level: 0,
  });

  financingActivities.push({
    accountId: '',
    accountCode: '',
    accountName: 'Net Cash from Financing Activities',
    amount: financingCashFlow,
    isTotal: true,
    category: 'financing',
    level: 0,
  });

  return {
    startDate: period.startDate,
    endDate: period.endDate,
    periodId: period.id,
    operatingActivities,
    investingActivities,
    financingActivities,
    netCashFlow,
    beginningCash,
    endingCash,
    generatedAt: new Date(),
    generatedBy: userId,
  };
}

/**
 * Generate trial balance
 */
export function generateTrialBalance(
  accounts: Account[],
  entries: JournalEntry[],
  period: AccountingPeriod,
  userId: string
): TrialBalance {
  const items: TrialBalanceItem[] = [];

  for (const account of accounts) {
    if (!account.isActive) continue;

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      if (entry.status !== TransactionStatus.POSTED) continue;

      const entryDate = new Date(entry.transactionDate);
      if (entryDate < period.startDate || entryDate > period.endDate) continue;

      for (const lineItem of entry.lineItems) {
        if (lineItem.accountId === account.id) {
          totalDebit += lineItem.debit;
          totalCredit += lineItem.credit;
        }
      }
    }

    const balance = calculateAccountBalance(account.id, entries, account.normalBalance);

    if (totalDebit === 0 && totalCredit === 0 && Math.abs(balance) < 0.01) {
      continue;
    }

    items.push({
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      debit: totalDebit,
      credit: totalCredit,
      balance,
    });
  }

  // Sort by account code
  items.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totalDebit = items.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = items.reduce((sum, item) => sum + item.credit, 0);
  const tolerance = 0.01;
  const isBalanced = Math.abs(totalDebit - totalCredit) <= tolerance;

  return {
    reportDate: period.endDate,
    periodId: period.id,
    items,
    totalDebit,
    totalCredit,
    isBalanced,
    generatedAt: new Date(),
    generatedBy: userId,
  };
}

/**
 * Export financial statement to JSON
 */
export function exportFinancialStatement<T>(statement: T): string {
  return JSON.stringify(statement, null, 2);
}

/**
 * Export financial statement to CSV
 */
export function exportFinancialStatementToCSV<T extends { items: Array<{ accountCode: string; accountName: string; amount: number }> }>(
  statement: T,
  statementName: string
): string {
  const lines: string[] = [];
  
  lines.push(statementName);
  lines.push('Account Code,Account Name,Amount');
  
  for (const item of statement.items) {
    lines.push(`${item.accountCode},"${item.accountName}",${item.amount.toFixed(2)}`);
  }
  
  return lines.join('\n');
}

/**
 * Compare period performance
 */
export function comparePeriodPerformance(
  currentPeriod: ProfitLossStatement,
  previousPeriod: ProfitLossStatement
): {
  revenueChange: number;
  revenueChangePercent: number;
  expenseChange: number;
  expenseChangePercent: number;
  netIncomeChange: number;
  netIncomeChangePercent: number;
} {
  const currentRevenue = currentPeriod.revenue.reduce((sum, item) => sum + item.amount, 0);
  const previousRevenue = previousPeriod.revenue.reduce((sum, item) => sum + item.amount, 0);
  
  const currentExpenses = currentPeriod.expenses.reduce((sum, item) => sum + item.amount, 0);
  const previousExpenses = previousPeriod.expenses.reduce((sum, item) => sum + item.amount, 0);
  
  const revenueChange = currentRevenue - previousRevenue;
  const revenueChangePercent = previousRevenue > 0 ? (revenueChange / previousRevenue) * 100 : 0;
  
  const expenseChange = currentExpenses - previousExpenses;
  const expenseChangePercent = previousExpenses > 0 ? (expenseChange / previousExpenses) * 100 : 0;
  
  const netIncomeChange = currentPeriod.netIncome - previousPeriod.netIncome;
  const netIncomeChangePercent = previousPeriod.netIncome > 0 ? (netIncomeChange / previousPeriod.netIncome) * 100 : 0;
  
  return {
    revenueChange,
    revenueChangePercent,
    expenseChange,
    expenseChangePercent,
    netIncomeChange,
    netIncomeChangePercent,
  };
}

/**
 * Get financial ratios
 */
export function getFinancialRatios(
  balanceSheet: BalanceSheet,
  profitLoss: ProfitLossStatement
): {
  currentRatio: number;
  quickRatio: number;
  debtToEquityRatio: number;
  grossProfitMargin: number;
  operatingProfitMargin: number;
  netProfitMargin: number;
} {
  // Current ratio = Current Assets / Current Liabilities
  const currentAssets = balanceSheet.assets
    .filter(item => item.accountCode.startsWith('11'))
    .reduce((sum, item) => sum + item.amount, 0);
  const currentLiabilities = balanceSheet.liabilities
    .filter(item => item.accountCode.startsWith('21'))
    .reduce((sum, item) => sum + item.amount, 0);
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;

  // Quick ratio = (Current Assets - Inventory) / Current Liabilities
  const inventory = balanceSheet.assets
    .filter(item => item.accountCode.startsWith('113'))
    .reduce((sum, item) => sum + item.amount, 0);
  const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;

  // Debt to equity ratio = Total Liabilities / Total Equity
  const debtToEquityRatio = balanceSheet.totalEquity > 0 ? balanceSheet.totalLiabilities / balanceSheet.totalEquity : 0;

  // Gross profit margin = Gross Profit / Revenue
  const totalRevenue = profitLoss.revenue.reduce((sum, item) => sum + item.amount, 0);
  const grossProfitMargin = totalRevenue > 0 ? (profitLoss.grossProfit / totalRevenue) * 100 : 0;

  // Operating profit margin = Operating Income / Revenue
  const operatingProfitMargin = totalRevenue > 0 ? (profitLoss.operatingIncome / totalRevenue) * 100 : 0;

  // Net profit margin = Net Income / Revenue
  const netProfitMargin = totalRevenue > 0 ? (profitLoss.netIncome / totalRevenue) * 100 : 0;

  return {
    currentRatio,
    quickRatio,
    debtToEquityRatio,
    grossProfitMargin,
    operatingProfitMargin,
    netProfitMargin,
  };
}
