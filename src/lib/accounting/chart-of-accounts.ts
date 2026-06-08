/**
 * Chart of Accounts System
 * 
 * Implements a hierarchical chart of accounts with:
 * - Account types (Asset, Liability, Equity, Revenue, Expense)
 * - Account categories and subcategories
 * - Account codes and numbering
 * - Normal balance indicators
 * - Active/inactive status
 */

// Account types
export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

// Account categories
export enum AccountCategory {
  // Asset categories
  CURRENT_ASSETS = 'current_assets',
  FIXED_ASSETS = 'fixed_assets',
  OTHER_ASSETS = 'other_assets',
  
  // Liability categories
  CURRENT_LIABILITIES = 'current_liabilities',
  LONG_TERM_LIABILITIES = 'long_term_liabilities',
  OTHER_LIABILITIES = 'other_liabilities',
  
  // Equity categories
  OWNER_EQUITY = 'owner_equity',
  RETAINED_EARNINGS = 'retained_earnings',
  
  // Revenue categories
  OPERATING_REVENUE = 'operating_revenue',
  NON_OPERATING_REVENUE = 'non_operating_revenue',
  
  // Expense categories
  OPERATING_EXPENSES = 'operating_expenses',
  NON_OPERATING_EXPENSES = 'non_operating_expenses',
}

// Normal balance types
export enum NormalBalance {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

// Account interface
export interface Account {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: AccountType;
  category: AccountCategory;
  parentId?: string;
  normalBalance: NormalBalance;
  isActive: boolean;
  isSystem: boolean; // System accounts cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

// Account hierarchy node
export interface AccountNode extends Account {
  children: AccountNode[];
  balance: number;
}

// Standard chart of accounts for property management
const STANDARD_CHART_OF_ACCOUNTS: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Assets (1000-1999)
  {
    code: '1000',
    name: 'Assets',
    type: AccountType.ASSET,
    category: AccountCategory.CURRENT_ASSETS,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '1100',
    name: 'Current Assets',
    type: AccountType.ASSET,
    category: AccountCategory.CURRENT_ASSETS,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '1110',
    name: 'Cash and Cash Equivalents',
    description: 'Cash on hand and in bank accounts',
    type: AccountType.ASSET,
    category: AccountCategory.CURRENT_ASSETS,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '1111',
    name: 'Cash on Hand',
    description: 'Physical cash',
    type: AccountType.ASSET,
    category: AccountCategory.CURRENT_ASSETS,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '1112',
    name: 'Bank Accounts',
    description: 'Money in bank accounts',
    type: AccountType.ASSET,
    category: AccountCategory.CURRENT_ASSETS,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '1120',
    name: 'Accounts Receivable',
    description: 'Money owed by tenants',
    type: AccountType.ASSET,
    category: AccountCategory.CURRENT_ASSETS,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '1121',
    name: 'Rent Receivable',
    description: 'Rent owed by tenants',
    type: AccountType.ASSET,
    category: AccountCategory.CURRENT_ASSETS,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '1130',
    name: 'Prepaid Expenses',
    description: 'Expenses paid in advance',
    type: AccountType.ASSET,
    category: AccountCategory.CURRENT_ASSETS,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '1200',
    name: 'Fixed Assets',
    type: AccountType.ASSET,
    category: AccountCategory.FIXED_ASSETS,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '1210',
    name: 'Property, Plant, and Equipment',
    description: 'Real estate and equipment',
    type: AccountType.ASSET,
    category: AccountCategory.FIXED_ASSETS,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '1220',
    name: 'Accumulated Depreciation',
    description: 'Depreciation of fixed assets',
    type: AccountType.ASSET,
    category: AccountCategory.FIXED_ASSETS,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  
  // Liabilities (2000-2999)
  {
    code: '2000',
    name: 'Liabilities',
    type: AccountType.LIABILITY,
    category: AccountCategory.CURRENT_LIABILITIES,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '2100',
    name: 'Current Liabilities',
    type: AccountType.LIABILITY,
    category: AccountCategory.CURRENT_LIABILITIES,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '2110',
    name: 'Accounts Payable',
    description: 'Money owed to suppliers',
    type: AccountType.LIABILITY,
    category: AccountCategory.CURRENT_LIABILITIES,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '2120',
    name: 'Unearned Revenue',
    description: 'Revenue received but not yet earned',
    type: AccountType.LIABILITY,
    category: AccountCategory.CURRENT_LIABILITIES,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '2130',
    name: 'Accrued Expenses',
    description: 'Expenses incurred but not yet paid',
    type: AccountType.LIABILITY,
    category: AccountCategory.CURRENT_LIABILITIES,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '2140',
    name: 'Withholding Tax Payable',
    description: 'Tax withheld from payments',
    type: AccountType.LIABILITY,
    category: AccountCategory.CURRENT_LIABILITIES,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '2200',
    name: 'Long Term Liabilities',
    type: AccountType.LIABILITY,
    category: AccountCategory.LONG_TERM_LIABILITIES,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '2210',
    name: 'Loans Payable',
    description: 'Long-term loans',
    type: AccountType.LIABILITY,
    category: AccountCategory.LONG_TERM_LIABILITIES,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  
  // Equity (3000-3999)
  {
    code: '3000',
    name: 'Equity',
    type: AccountType.EQUITY,
    category: AccountCategory.OWNER_EQUITY,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '3100',
    name: 'Owner Equity',
    type: AccountType.EQUITY,
    category: AccountCategory.OWNER_EQUITY,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '3110',
    name: 'Capital',
    description: 'Owner capital investment',
    type: AccountType.EQUITY,
    category: AccountCategory.OWNER_EQUITY,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '3200',
    name: 'Retained Earnings',
    type: AccountType.EQUITY,
    category: AccountCategory.RETAINED_EARNINGS,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '3300',
    name: 'Current Period Earnings',
    description: 'Earnings for current accounting period',
    type: AccountType.EQUITY,
    category: AccountCategory.RETAINED_EARNINGS,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  
  // Revenue (4000-4999)
  {
    code: '4000',
    name: 'Revenue',
    type: AccountType.REVENUE,
    category: AccountCategory.OPERATING_REVENUE,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '4100',
    name: 'Operating Revenue',
    type: AccountType.REVENUE,
    category: AccountCategory.OPERATING_REVENUE,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '4110',
    name: 'Rental Income',
    description: 'Income from property rentals',
    type: AccountType.REVENUE,
    category: AccountCategory.OPERATING_REVENUE,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '4120',
    name: 'Service Fees',
    description: 'Fees for property management services',
    type: AccountType.REVENUE,
    category: AccountCategory.OPERATING_REVENUE,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '4200',
    name: 'Non-Operating Revenue',
    type: AccountType.REVENUE,
    category: AccountCategory.NON_OPERATING_REVENUE,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '4210',
    name: 'Interest Income',
    description: 'Interest earned on investments',
    type: AccountType.REVENUE,
    category: AccountCategory.NON_OPERATING_REVENUE,
    normalBalance: NormalBalance.CREDIT,
    isActive: true,
    isSystem: true,
  },
  
  // Expenses (5000-5999)
  {
    code: '5000',
    name: 'Expenses',
    type: AccountType.EXPENSE,
    category: AccountCategory.OPERATING_EXPENSES,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '5100',
    name: 'Operating Expenses',
    type: AccountType.EXPENSE,
    category: AccountCategory.OPERATING_EXPENSES,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '5110',
    name: 'Maintenance and Repairs',
    description: 'Property maintenance costs',
    type: AccountType.EXPENSE,
    category: AccountCategory.OPERATING_EXPENSES,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '5120',
    name: 'Utilities',
    description: 'Water, electricity, gas',
    type: AccountType.EXPENSE,
    category: AccountCategory.OPERATING_EXPENSES,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '5130',
    name: 'Salaries and Wages',
    description: 'Employee compensation',
    type: AccountType.EXPENSE,
    category: AccountCategory.OPERATING_EXPENSES,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '5140',
    name: 'Insurance',
    description: 'Property and liability insurance',
    type: AccountType.EXPENSE,
    category: AccountCategory.OPERATING_EXPENSES,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '5150',
    name: 'Property Tax',
    description: 'Property taxes',
    type: AccountType.EXPENSE,
    category: AccountCategory.OPERATING_EXPENSES,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '5200',
    name: 'Non-Operating Expenses',
    type: AccountType.EXPENSE,
    category: AccountCategory.NON_OPERATING_EXPENSES,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '5210',
    name: 'Interest Expense',
    description: 'Interest on loans',
    type: AccountType.EXPENSE,
    category: AccountCategory.NON_OPERATING_EXPENSES,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
  {
    code: '5220',
    name: 'Depreciation Expense',
    description: 'Depreciation of fixed assets',
    type: AccountType.EXPENSE,
    category: AccountCategory.NON_OPERATING_EXPENSES,
    normalBalance: NormalBalance.DEBIT,
    isActive: true,
    isSystem: true,
  },
];

/**
 * Generate account code based on type and sequence
 */
export function generateAccountCode(type: AccountType, sequence: number): string {
  const typePrefix: Record<AccountType, string> = {
    [AccountType.ASSET]: '1',
    [AccountType.LIABILITY]: '2',
    [AccountType.EQUITY]: '3',
    [AccountType.REVENUE]: '4',
    [AccountType.EXPENSE]: '5',
  };
  
  return `${typePrefix[type]}${sequence.toString().padStart(3, '0')}`;
}

/**
 * Validate account code format
 */
export function validateAccountCode(code: string): boolean {
  const regex = /^[1-5]\d{3}$/;
  return regex.test(code);
}

/**
 * Get normal balance for account type
 */
export function getNormalBalanceForType(type: AccountType): NormalBalance {
  const debitTypes = [AccountType.ASSET, AccountType.EXPENSE];
  return debitTypes.includes(type) ? NormalBalance.DEBIT : NormalBalance.CREDIT;
}

/**
 * Build account hierarchy tree
 */
export function buildAccountHierarchy(accounts: Account[]): AccountNode[] {
  const accountMap = new Map<string, AccountNode>();
  const rootAccounts: AccountNode[] = [];
  
  // Create nodes for all accounts
  for (const account of accounts) {
    accountMap.set(account.id, {
      ...account,
      children: [],
      balance: 0,
    });
  }
  
  // Build hierarchy
  for (const account of accounts) {
    const node = accountMap.get(account.id)!;
    
    if (account.parentId) {
      const parent = accountMap.get(account.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      rootAccounts.push(node);
    }
  }
  
  return rootAccounts;
}

/**
 * Get account by code
 */
export function getAccountByCode(accounts: Account[], code: string): Account | undefined {
  return accounts.find(account => account.code === code);
}

/**
 * Get accounts by type
 */
export function getAccountsByType(accounts: Account[], type: AccountType): Account[] {
  return accounts.filter(account => account.type === type);
}

/**
 * Get accounts by category
 */
export function getAccountsByCategory(accounts: Account[], category: AccountCategory): Account[] {
  return accounts.filter(account => account.category === category);
}

/**
 * Check if account can be deleted
 */
export function canDeleteAccount(account: Account): boolean {
  return !account.isSystem && !account.isActive;
}

/**
 * Get standard chart of accounts
 */
export function getStandardChartOfAccounts(): Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[] {
  return STANDARD_CHART_OF_ACCOUNTS;
}

/**
 * Initialize chart of accounts for a new entity
 */
export function initializeChartOfAccounts(): Account[] {
  const now = new Date();
  
  return STANDARD_CHART_OF_ACCOUNTS.map((account, index) => ({
    ...account,
    id: `acc_${index}`,
    createdAt: now,
    updatedAt: now,
  }));
}
