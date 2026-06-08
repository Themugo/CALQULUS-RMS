/**
 * Journal System
 * 
 * Implements a double-entry journal system with:
 * - Debit/credit validation
 * - Transaction line items
 * - Balance verification
 * - Transaction types
 */

import { Account, NormalBalance, getNormalBalanceForType } from './chart-of-accounts';

// Journal entry line item
export interface JournalLineItem {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
  referenceId?: string; // Reference to external entity (invoice, payment, etc.)
}

// Transaction types
export enum TransactionType {
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_MADE = 'payment_made',
  INVOICE_ISSUED = 'invoice_issued',
  INVOICE_PAID = 'invoice_paid',
  EXPENSE_INCURRED = 'expense_incurred',
  REVENUE_RECOGNIZED = 'revenue_recognized',
  ADJUSTMENT = 'adjustment',
  OPENING_BALANCE = 'opening_balance',
  CLOSING_ENTRY = 'closing_entry',
  REVERSAL = 'reversal',
}

// Transaction status
export enum TransactionStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  REVERSED = 'reversed',
}

// Journal entry
export interface JournalEntry {
  id: string;
  transactionNumber: string;
  transactionType: TransactionType;
  transactionDate: Date;
  description: string;
  reference?: string;
  lineItems: JournalLineItem[];
  totalDebit: number;
  totalCredit: number;
  status: TransactionStatus;
  postedAt?: Date;
  postedBy?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate journal entry
 */
export function validateJournalEntry(entry: Omit<JournalEntry, 'id' | 'transactionNumber' | 'totalDebit' | 'totalCredit' | 'createdAt' | 'updatedAt'>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if line items exist
  if (entry.lineItems.length === 0) {
    errors.push('Journal entry must have at least one line item');
  }

  // Calculate totals
  let totalDebit = 0;
  let totalCredit = 0;

  for (const lineItem of entry.lineItems) {
    // Validate line item amounts
    if (lineItem.debit < 0) {
      errors.push(`Line item ${lineItem.accountCode}: Debit amount cannot be negative`);
    }
    if (lineItem.credit < 0) {
      errors.push(`Line item ${lineItem.accountCode}: Credit amount cannot be negative`);
    }

    // Validate that line item has either debit or credit, not both
    if (lineItem.debit > 0 && lineItem.credit > 0) {
      errors.push(`Line item ${lineItem.accountCode}: Cannot have both debit and credit amounts`);
    }

    if (lineItem.debit === 0 && lineItem.credit === 0) {
      warnings.push(`Line item ${lineItem.accountCode}: Zero amount line item`);
    }

    totalDebit += lineItem.debit;
    totalCredit += lineItem.credit;
  }

  // Validate double-entry accounting
  const tolerance = 0.01; // Allow for rounding differences
  if (Math.abs(totalDebit - totalCredit) > tolerance) {
    errors.push(`Debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)})`);
  }

  // Validate transaction date
  if (!entry.transactionDate) {
    errors.push('Transaction date is required');
  }

  // Validate description
  if (!entry.description || entry.description.trim() === '') {
    warnings.push('Journal entry should have a description');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create journal entry
 */
export function createJournalEntry(
  transactionType: TransactionType,
  transactionDate: Date,
  description: string,
  lineItems: Omit<JournalLineItem, 'id'>[],
  userId: string,
  reference?: string
): Omit<JournalEntry, 'id' | 'transactionNumber' | 'totalDebit' | 'totalCredit' | 'createdAt' | 'updatedAt'> {
  // Calculate totals
  const totalDebit = lineItems.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = lineItems.reduce((sum, item) => sum + item.credit, 0);

  // Create line items with IDs
  const journalLineItems: JournalLineItem[] = lineItems.map((item, index) => ({
    ...item,
    id: `line_${Date.now()}_${index}`,
  }));

  return {
    transactionType,
    transactionDate,
    description,
    reference,
    lineItems: journalLineItems,
    totalDebit,
    totalCredit,
    status: TransactionStatus.DRAFT,
    createdBy: userId,
    updatedBy: userId,
  };
}

/**
 * Post journal entry
 */
export function postJournalEntry(entry: JournalEntry, userId: string): JournalEntry {
  if (entry.status !== TransactionStatus.DRAFT) {
    throw new Error('Only draft entries can be posted');
  }

  const validation = validateJournalEntry(entry);
  if (!validation.isValid) {
    throw new Error(`Cannot post invalid journal entry: ${validation.errors.join(', ')}`);
  }

  return {
    ...entry,
    status: TransactionStatus.POSTED,
    postedAt: new Date(),
    postedBy: userId,
    updatedAt: new Date(),
    updatedBy: userId,
  };
}

/**
 * Reverse journal entry
 */
export function reverseJournalEntry(
  originalEntry: JournalEntry,
  reversalDate: Date,
  userId: string,
  reversalReason?: string
): Omit<JournalEntry, 'id' | 'transactionNumber' | 'totalDebit' | 'totalCredit' | 'createdAt' | 'updatedAt'> {
  if (originalEntry.status !== TransactionStatus.POSTED) {
    throw new Error('Only posted entries can be reversed');
  }

  // Create reversal line items (swap debit and credit)
  const reversalLineItems: Omit<JournalLineItem, 'id'>[] = originalEntry.lineItems.map(item => ({
    accountId: item.accountId,
    accountCode: item.accountCode,
    accountName: item.accountName,
    debit: item.credit, // Swap
    credit: item.debit, // Swap
    description: `Reversal of: ${item.description || originalEntry.description}`,
    referenceId: originalEntry.id,
  }));

  const description = `Reversal of transaction ${originalEntry.transactionNumber}${reversalReason ? ` - ${reversalReason}` : ''}`;

  return createJournalEntry(
    TransactionType.REVERSAL,
    reversalDate,
    description,
    reversalLineItems,
    userId,
    originalEntry.id
  );
}

/**
 * Calculate account balance from journal entries
 */
export function calculateAccountBalance(
  accountId: string,
  entries: JournalEntry[],
  normalBalance: NormalBalance
): number {
  let balance = 0;

  for (const entry of entries) {
    if (entry.status !== TransactionStatus.POSTED) {
      continue;
    }

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
 * Generate transaction number
 */
export function generateTransactionNumber(prefix: string, sequence: number): string {
  return `${prefix}-${sequence.toString().padStart(6, '0')}`;
}

/**
 * Get transaction type prefix
 */
export function getTransactionTypePrefix(type: TransactionType): string {
  const prefixes: Record<TransactionType, string> = {
    [TransactionType.PAYMENT_RECEIVED]: 'PAY',
    [TransactionType.PAYMENT_MADE]: 'PAY',
    [TransactionType.INVOICE_ISSUED]: 'INV',
    [TransactionType.INVOICE_PAID]: 'INV',
    [TransactionType.EXPENSE_INCURRED]: 'EXP',
    [TransactionType.REVENUE_RECOGNIZED]: 'REV',
    [TransactionType.ADJUSTMENT]: 'ADJ',
    [TransactionType.OPENING_BALANCE]: 'OPN',
    [TransactionType.CLOSING_ENTRY]: 'CLS',
    [TransactionType.REVERSAL]: 'REV',
  };

  return prefixes[type] || 'TXN';
}

/**
 * Check if journal entry is balanced
 */
export function isJournalEntryBalanced(entry: JournalEntry): boolean {
  const tolerance = 0.01;
  return Math.abs(entry.totalDebit - entry.totalCredit) <= tolerance;
}

/**
 * Get net effect of journal entry
 */
export function getNetEffect(entry: JournalEntry): number {
  return entry.totalDebit - entry.totalCredit;
}

/**
 * Filter journal entries by date range
 */
export function filterEntriesByDateRange(
  entries: JournalEntry[],
  startDate: Date,
  endDate: Date
): JournalEntry[] {
  return entries.filter(entry => {
    const entryDate = new Date(entry.transactionDate);
    return entryDate >= startDate && entryDate <= endDate;
  });
}

/**
 * Filter journal entries by account
 */
export function filterEntriesByAccount(
  entries: JournalEntry[],
  accountId: string
): JournalEntry[] {
  return entries.filter(entry =>
    entry.lineItems.some(item => item.accountId === accountId)
  );
}

/**
 * Filter journal entries by transaction type
 */
export function filterEntriesByType(
  entries: JournalEntry[],
  transactionType: TransactionType
): JournalEntry[] {
  return entries.filter(entry => entry.transactionType === transactionType);
}

/**
 * Get trial balance
 */
export function getTrialBalance(
  accounts: Account[],
  entries: JournalEntry[]
): Array<{ account: Account; debit: number; credit: number; balance: number }> {
  const trialBalance: Array<{ account: Account; debit: number; credit: number; balance: number }> = [];

  for (const account of accounts) {
    if (!account.isActive) continue;

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      if (entry.status !== TransactionStatus.POSTED) continue;

      for (const lineItem of entry.lineItems) {
        if (lineItem.accountId === account.id) {
          totalDebit += lineItem.debit;
          totalCredit += lineItem.credit;
        }
      }
    }

    const balance = calculateAccountBalance(account.id, entries, account.normalBalance);

    trialBalance.push({
      account,
      debit: totalDebit,
      credit: totalCredit,
      balance,
    });
  }

  return trialBalance;
}

/**
 * Verify trial balance
 */
export function verifyTrialBalance(trialBalance: Array<{ debit: number; credit: number }>): boolean {
  const totalDebit = trialBalance.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = trialBalance.reduce((sum, item) => sum + item.credit, 0);
  const tolerance = 0.01;

  return Math.abs(totalDebit - totalCredit) <= tolerance;
}
