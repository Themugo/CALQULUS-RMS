/**
 * Bank Integrations
 * 
 * Implements bank API integrations with:
 * - Account verification
 * - Payment processing
 * - Direct debit setup
 * - Transaction reconciliation
 * - Balance inquiries
 * - Statement import
 * - Webhook handling
 */

// Bank provider
export interface BankProvider {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  supportedCountries: string[];
  isActive: boolean;
}

// Bank account
export interface BankAccount {
  id: string;
  providerId: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'business';
  accountHolderName: string;
  bankName: string;
  currency: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Payment transaction
export interface PaymentTransaction {
  id: string;
  bankAccountId: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  description: string;
  referenceNumber?: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  transactionDate: Date;
  processedAt?: Date;
  metadata?: Record<string, unknown>;
}

// Direct debit mandate
export interface DirectDebitMandate {
  id: string;
  bankAccountId: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  frequency: 'weekly' | 'bi-weekly' | 'monthly';
  dayOfMonth?: number;
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  lastDebitDate?: Date;
  nextDebitDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Bank statement
export interface BankStatement {
  id: string;
  bankAccountId: string;
  statementDate: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  openingBalance: number;
  closingBalance: number;
  transactions: PaymentTransaction[];
  importedAt: Date;
}

// Webhook event
export interface WebhookEvent {
  id: string;
  providerId: string;
  eventType: string;
  payload: Record<string, unknown>;
  receivedAt: Date;
  processed: boolean;
  processedAt?: Date;
}

/**
 * Create bank account
 */
export function createBankAccount(
  providerId: string,
  accountNumber: string,
  accountType: 'checking' | 'savings' | 'business',
  accountHolderName: string,
  bankName: string,
  currency: string = 'KES'
): BankAccount {
  return {
    id: `bank_account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    providerId,
    accountNumber,
    accountType,
    accountHolderName,
    bankName,
    currency,
    isVerified: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Verify bank account
 */
export async function verifyBankAccount(
  account: BankAccount,
  _provider: BankProvider
): Promise<BankAccount> {
  // In production, this would call the bank's API to verify the account
  // For now, we'll simulate the verification
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      ...account,
      isVerified: true,
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('Failed to verify bank account:', error);
    return account;
  }
}

/**
 * Update bank account
 */
export function updateBankAccount(
  account: BankAccount,
  updates: Partial<Omit<BankAccount, 'id' | 'createdAt'>>
): BankAccount {
  return {
    ...account,
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * Create payment transaction
 */
export function createPaymentTransaction(
  bankAccountId: string,
  type: 'credit' | 'debit',
  amount: number,
  description: string,
  currency: string = 'KES',
  referenceNumber?: string,
  metadata?: Record<string, unknown>
): PaymentTransaction {
  return {
    id: `transaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    bankAccountId,
    type,
    amount,
    currency,
    description,
    referenceNumber,
    status: 'pending',
    transactionDate: new Date(),
    metadata,
  };
}

/**
 * Process payment
 */
export async function processPayment(
  transaction: PaymentTransaction,
  _provider: BankProvider
): Promise<PaymentTransaction> {
  // In production, this would call the bank's API to process the payment
  // For now, we'll simulate the processing
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      ...transaction,
      status: 'completed',
      processedAt: new Date(),
    };
  } catch (error) {
    console.error('Failed to process payment:', error);
    return {
      ...transaction,
      status: 'failed',
    };
  }
}

/**
 * Reverse payment
 */
export function reversePayment(transaction: PaymentTransaction): PaymentTransaction {
  return {
    ...transaction,
    status: 'reversed',
  };
}

/**
 * Create direct debit mandate
 */
export function createDirectDebitMandate(
  bankAccountId: string,
  tenantId: string,
  propertyId: string,
  amount: number,
  frequency: 'weekly' | 'bi-weekly' | 'monthly',
  dayOfMonth: number | undefined,
  startDate: Date
): DirectDebitMandate {
  const nextDebitDate = calculateNextDebitDate(frequency, dayOfMonth, startDate);
  
  return {
    id: `mandate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    bankAccountId,
    tenantId,
    propertyId,
    amount,
    frequency,
    dayOfMonth,
    isActive: true,
    startDate,
    nextDebitDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Calculate next debit date
 */
function calculateNextDebitDate(
  frequency: 'weekly' | 'bi-weekly' | 'monthly',
  dayOfMonth: number | undefined,
  startDate: Date
): Date {
  const nextDate = new Date(startDate);
  
  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'bi-weekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      if (dayOfMonth) {
        nextDate.setDate(dayOfMonth);
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;
  }
  
  return nextDate;
}

/**
 * Execute direct debit
 */
export async function executeDirectDebit(
  mandate: DirectDebitMandate,
  _provider: BankProvider
): Promise<PaymentTransaction> {
  const transaction = createPaymentTransaction(
    mandate.bankAccountId,
    'debit',
    mandate.amount,
    `Rent payment - ${mandate.propertyId}`,
    'KES',
    `mandate_${mandate.id}`
  );
  
  const processedTransaction = await processPayment(transaction, _provider);
  
  return processedTransaction;
}

/**
 * Update direct debit mandate
 */
export function updateDirectDebitMandate(
  mandate: DirectDebitMandate,
  updates: Partial<Omit<DirectDebitMandate, 'id' | 'createdAt'>>
): DirectDebitMandate {
  return {
    ...mandate,
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * Cancel direct debit mandate
 */
export function cancelDirectDebitMandate(mandate: DirectDebitMandate): DirectDebitMandate {
  return {
    ...mandate,
    isActive: false,
    endDate: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get account balance
 */
export async function getAccountBalance(
  _account: BankAccount,
  _provider: BankProvider
): Promise<number> {
  // In production, this would call the bank's API to get the balance
  // For now, we'll simulate the balance inquiry
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return a simulated balance
    return 100000; // 100,000 KES
  } catch (error) {
    console.error('Failed to get account balance:', error);
    return 0;
  }
}

/**
 * Import bank statement
 */
export async function importBankStatement(
  _account: BankAccount,
  _provider: BankProvider,
  _period: { startDate: Date; endDate: Date }
): Promise<BankStatement | null> {
  // In production, this would call the bank's API to import the statement
  // For now, we'll simulate the import
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return null to indicate no statement available (simulation)
    return null;
  } catch (error) {
    console.error('Failed to import bank statement:', error);
    return null;
  }
}

/**
 * Reconcile transactions
 */
export function reconcileTransactions(
  bankTransactions: PaymentTransaction[],
  internalTransactions: PaymentTransaction[]
): {
  matched: Array<{ bank: PaymentTransaction; internal: PaymentTransaction }>;
  unmatchedBank: PaymentTransaction[];
  unmatchedInternal: PaymentTransaction[];
} {
  const matched: Array<{ bank: PaymentTransaction; internal: PaymentTransaction }> = [];
  const unmatchedBank: PaymentTransaction[] = [];
  const unmatchedInternal: PaymentTransaction[] = [];
  
  const internalMap = new Map<string, PaymentTransaction>();
  for (const internal of internalTransactions) {
    if (internal.referenceNumber) {
      internalMap.set(internal.referenceNumber, internal);
    }
  }
  
  for (const bank of bankTransactions) {
    if (bank.referenceNumber && internalMap.has(bank.referenceNumber)) {
      matched.push({
        bank,
        internal: internalMap.get(bank.referenceNumber)!,
      });
      internalMap.delete(bank.referenceNumber);
    } else {
      unmatchedBank.push(bank);
    }
  }
  
  unmatchedInternal.push(...internalMap.values());
  
  return {
    matched,
    unmatchedBank,
    unmatchedInternal,
  };
}

/**
 * Handle webhook event
 */
export function handleWebhookEvent(
  event: WebhookEvent
): WebhookEvent {
  // Process the webhook event based on event type
  // In production, this would trigger appropriate actions
  
  return {
    ...event,
    processed: true,
    processedAt: new Date(),
  };
}

/**
 * Get bank statistics
 */
export function getBankStatistics(
  accounts: BankAccount[],
  transactions: PaymentTransaction[],
  mandates: DirectDebitMandate[]
): {
  totalAccounts: number;
  verifiedAccounts: number;
  activeAccounts: number;
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  totalVolume: number;
  activeMandates: number;
  byAccountType: Record<'checking' | 'savings' | 'business', number>;
  byStatus: Record<'pending' | 'completed' | 'failed' | 'reversed', number>;
} {
  const verifiedAccounts = accounts.filter(a => a.isVerified).length;
  const activeAccounts = accounts.filter(a => a.isActive).length;
  
  const totalCredits = transactions.filter(t => t.type === 'credit').length;
  const totalDebits = transactions.filter(t => t.type === 'debit').length;
  
  const totalVolume = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const activeMandates = mandates.filter(m => m.isActive).length;
  
  const byAccountType: Record<'checking' | 'savings' | 'business', number> = {
    checking: 0,
    savings: 0,
    business: 0,
  };
  
  const byStatus: Record<'pending' | 'completed' | 'failed' | 'reversed', number> = {
    pending: 0,
    completed: 0,
    failed: 0,
    reversed: 0,
  };
  
  for (const account of accounts) {
    byAccountType[account.accountType]++;
  }
  
  for (const transaction of transactions) {
    byStatus[transaction.status]++;
  }
  
  return {
    totalAccounts: accounts.length,
    verifiedAccounts,
    activeAccounts,
    totalTransactions: transactions.length,
    totalCredits,
    totalDebits,
    totalVolume,
    activeMandates,
    byAccountType,
    byStatus,
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount);
}
