/**
 * Immutable Transaction Journal
 * 
 * Implements an immutable transaction journal with:
 * - Append-only transaction storage
 * - Complete audit trail
 * - Tamper-evident records
 * - Change tracking
 * - Digital fingerprinting
 */

import { JournalEntry, TransactionStatus } from './journal-system';

// Audit log entry
export interface AuditLogEntry {
  id: string;
  transactionId: string;
  action: 'created' | 'posted' | 'reversed' | 'viewed';
  userId: string;
  userName: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, unknown>;
}

// Transaction fingerprint
export interface TransactionFingerprint {
  transactionId: string;
  hash: string;
  previousHash: string;
  timestamp: Date;
  sequenceNumber: number;
}

// Immutable journal record
export interface ImmutableJournalRecord {
  transaction: JournalEntry;
  fingerprint: TransactionFingerprint;
  auditLog: AuditLogEntry[];
  isImmutable: boolean;
}

// Journal storage interface
export interface JournalStorage {
  addTransaction(transaction: JournalEntry): Promise<void>;
  getTransaction(transactionId: string): Promise<JournalEntry | null>;
  getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<JournalEntry[]>;
  getAuditLog(transactionId: string): Promise<AuditLogEntry[]>;
  verifyIntegrity(): Promise<boolean>;
}

/**
 * Generate cryptographic hash for transaction
 */
export async function generateTransactionHash(transaction: JournalEntry, previousHash: string): Promise<string> {
  const data = JSON.stringify({
    transactionId: transaction.id,
    transactionNumber: transaction.transactionNumber,
    transactionType: transaction.transactionType,
    transactionDate: transaction.transactionDate,
    lineItems: transaction.lineItems,
    totalDebit: transaction.totalDebit,
    totalCredit: transaction.totalCredit,
    previousHash,
  });

  // Simple hash implementation (in production, use proper crypto)
  const hash = await simpleHash(data);
  return hash;
}

/**
 * Simple hash function (for demonstration - use proper crypto in production)
 */
async function simpleHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Create audit log entry
 */
export function createAuditLogEntry(
  transactionId: string,
  action: 'created' | 'posted' | 'reversed' | 'viewed',
  userId: string,
  userName: string,
  changes?: Record<string, unknown>
): AuditLogEntry {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    transactionId,
    action,
    userId,
    userName,
    timestamp: new Date(),
    changes,
  };
}

/**
 * In-memory journal storage (for demonstration)
 */
class InMemoryJournalStorage implements JournalStorage {
  private transactions: Map<string, ImmutableJournalRecord> = new Map();
  private sequenceNumber = 0;
  private lastHash = '';

  async addTransaction(transaction: JournalEntry): Promise<void> {
    const sequenceNumber = ++this.sequenceNumber;
    const hash = await generateTransactionHash(transaction, this.lastHash);
    
    const fingerprint: TransactionFingerprint = {
      transactionId: transaction.id,
      hash,
      previousHash: this.lastHash,
      timestamp: new Date(),
      sequenceNumber,
    };

    const auditLog: AuditLogEntry[] = [
      createAuditLogEntry(
        transaction.id,
        'created',
        transaction.createdBy,
        transaction.createdBy,
        {
          transactionType: transaction.transactionType,
          totalDebit: transaction.totalDebit,
          totalCredit: transaction.totalCredit,
        }
      ),
    ];

    if (transaction.status === TransactionStatus.POSTED && transaction.postedBy) {
      auditLog.push(
        createAuditLogEntry(
          transaction.id,
          'posted',
          transaction.postedBy,
          transaction.postedBy
        )
      );
    }

    const record: ImmutableJournalRecord = {
      transaction,
      fingerprint,
      auditLog,
      isImmutable: transaction.status === TransactionStatus.POSTED,
    };

    this.transactions.set(transaction.id, record);
    this.lastHash = hash;
  }

  async getTransaction(transactionId: string): Promise<JournalEntry | null> {
    const record = this.transactions.get(transactionId);
    return record?.transaction || null;
  }

  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<JournalEntry[]> {
    const records = Array.from(this.transactions.values());
    return records
      .filter(record => {
        const date = new Date(record.transaction.transactionDate);
        return date >= startDate && date <= endDate;
      })
      .map(record => record.transaction);
  }

  async getAuditLog(transactionId: string): Promise<AuditLogEntry[]> {
    const record = this.transactions.get(transactionId);
    return record?.auditLog || [];
  }

  async verifyIntegrity(): Promise<boolean> {
    const records = Array.from(this.transactions.values());
    let previousHash = '';
    
    for (const record of records) {
      const expectedHash = await generateTransactionHash(record.transaction, previousHash);
      
      if (record.fingerprint.hash !== expectedHash) {
        console.error(`Integrity check failed for transaction ${record.transaction.id}`);
        return false;
      }
      
      if (record.fingerprint.previousHash !== previousHash) {
        console.error(`Chain integrity check failed for transaction ${record.transaction.id}`);
        return false;
      }
      
      previousHash = record.fingerprint.hash;
    }
    
    return true;
  }
}

// Global journal storage instance
const journalStorage = new InMemoryJournalStorage();

/**
 * Add transaction to immutable journal
 */
export async function addToJournal(transaction: JournalEntry): Promise<void> {
  await journalStorage.addTransaction(transaction);
}

/**
 * Get transaction from journal
 */
export async function getFromJournal(transactionId: string): Promise<JournalEntry | null> {
  return journalStorage.getTransaction(transactionId);
}

/**
 * Get transactions by date range
 */
export async function getTransactionsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<JournalEntry[]> {
  return journalStorage.getTransactionsByDateRange(startDate, endDate);
}

/**
 * Get audit log for transaction
 */
export async function getTransactionAuditLog(transactionId: string): Promise<AuditLogEntry[]> {
  return journalStorage.getAuditLog(transactionId);
}

/**
 * Verify journal integrity
 */
export async function verifyJournalIntegrity(): Promise<boolean> {
  return journalStorage.verifyIntegrity();
}

/**
 * Log transaction action
 */
export async function logTransactionAction(
  transactionId: string,
  action: 'created' | 'posted' | 'reversed' | 'viewed',
  userId: string,
  userName: string,
  changes?: Record<string, unknown>
): Promise<void> {
  const auditLog = await getTransactionAuditLog(transactionId);
  const newEntry = createAuditLogEntry(transactionId, action, userId, userName, changes);
  
  // In a real implementation, this would update the storage
  console.warn('Logging transaction action:', newEntry);
}

/**
 * Get transaction chain
 */
export async function getTransactionChain(transactionId: string): Promise<TransactionFingerprint[]> {
  const chain: TransactionFingerprint[] = [];
  const record = (journalStorage as any).transactions.get(transactionId);
  
  if (!record) {
    return chain;
  }
  
  chain.push(record.fingerprint);
  
  // In a real implementation, this would traverse the chain
  // For now, we just return the single fingerprint
  return chain;
}

/**
 * Check if transaction can be modified
 */
export function canModifyTransaction(transaction: JournalEntry): boolean {
  return transaction.status === TransactionStatus.DRAFT;
}

/**
 * Check if transaction is immutable
 */
export function isTransactionImmutable(transaction: JournalEntry): boolean {
  return transaction.status === TransactionStatus.POSTED || transaction.status === TransactionStatus.REVERSED;
}

/**
 * Export journal for audit
 */
export async function exportJournalForAudit(startDate: Date, endDate: Date): Promise<string> {
  const transactions = await getTransactionsByDateRange(startDate, endDate);
  
  const exportData = {
    exportDate: new Date(),
    startDate,
    endDate,
    transactionCount: transactions.length,
    transactions: transactions.map(tx => ({
      transactionNumber: tx.transactionNumber,
      transactionType: tx.transactionType,
      transactionDate: tx.transactionDate,
      description: tx.description,
      totalDebit: tx.totalDebit,
      totalCredit: tx.totalCredit,
      status: tx.status,
      createdBy: tx.createdBy,
      createdAt: tx.createdAt,
    })),
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Get journal statistics
 */
export async function getJournalStatistics(): Promise<{
  totalTransactions: number;
  postedTransactions: number;
  draftTransactions: number;
  reversedTransactions: number;
  totalDebit: number;
  totalCredit: number;
}> {
  const transactions = await getTransactionsByDateRange(
    new Date('2000-01-01'),
    new Date()
  );
  
  const posted = transactions.filter(tx => tx.status === TransactionStatus.POSTED).length;
  const draft = transactions.filter(tx => tx.status === TransactionStatus.DRAFT).length;
  const reversed = transactions.filter(tx => tx.status === TransactionStatus.REVERSED).length;
  const totalDebit = transactions.reduce((sum, tx) => sum + tx.totalDebit, 0);
  const totalCredit = transactions.reduce((sum, tx) => sum + tx.totalCredit, 0);
  
  return {
    totalTransactions: transactions.length,
    postedTransactions: posted,
    draftTransactions: draft,
    reversedTransactions: reversed,
    totalDebit,
    totalCredit,
  };
}
