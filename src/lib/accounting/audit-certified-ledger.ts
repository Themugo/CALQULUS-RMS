/**
 * Audit-Certified Ledger System
 * 
 * Implements an audit-certified ledger with:
 * - Digital signatures
 * - Cryptographic integrity verification
 * - Audit trail certification
 * - Tamper detection
 * - Compliance reporting
 */

import { JournalEntry, TransactionStatus } from './journal-system';
import { generateTransactionHash } from './immutable-journal';

// Digital signature
export interface DigitalSignature {
  algorithm: 'RSA' | 'ECDSA' | 'Ed25519';
  publicKey: string;
  signature: string;
  timestamp: Date;
  signedBy: string;
}

// Ledger certification
export interface LedgerCertification {
  id: string;
  ledgerId: string;
  certificationDate: Date;
  certifiedBy: string;
  certificationAuthority: string;
  signature: DigitalSignature;
  hash: string;
  previousHash: string;
  transactionCount: number;
  totalDebit: number;
  totalCredit: number;
  status: 'pending' | 'certified' | 'revoked';
}

// Ledger entry
export interface LedgerEntry {
  id: string;
  sequenceNumber: number;
  transaction: JournalEntry;
  hash: string;
  previousHash: string;
  digitalSignature?: DigitalSignature;
  certificationId?: string;
  isCertified: boolean;
  createdAt: Date;
}

// Audit report
export interface AuditReport {
  id: string;
  ledgerId: string;
  reportDate: Date;
  startDate: Date;
  endDate: Date;
  totalTransactions: number;
  certifiedTransactions: number;
  uncertifiedTransactions: number;
  integrityCheck: boolean;
  signatureVerification: boolean;
  complianceStatus: 'compliant' | 'non_compliant' | 'partial';
  findings: AuditFinding[];
  generatedBy: string;
}

// Audit finding
export interface AuditFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'integrity' | 'signature' | 'compliance' | 'security';
  description: string;
  transactionId?: string;
  recommendation: string;
}

/**
 * Generate digital signature
 */
export async function generateDigitalSignature(
  data: string,
  privateKey: string,
  algorithm: 'RSA' | 'ECDSA' | 'Ed25519' = 'Ed25519'
): Promise<DigitalSignature> {
  // In a real implementation, this would use proper cryptographic libraries
  // For demonstration, we'll create a mock signature
  const timestamp = new Date();
  const signature = await simpleHash(`${data}_${timestamp.getTime()}_${privateKey}`);
  
  return {
    algorithm,
    publicKey: 'mock_public_key', // In production, derive from private key
    signature,
    timestamp,
    signedBy: 'system',
  };
}

/**
 * Verify digital signature
 */
export async function verifyDigitalSignature(
  data: string,
  signature: DigitalSignature
): Promise<boolean> {
  // In a real implementation, this would verify the signature using the public key
  // For demonstration, we'll return true
  const expectedHash = await simpleHash(`${data}_${signature.timestamp.getTime()}`);
  return expectedHash === signature.signature;
}

/**
 * Simple hash function (for demonstration)
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
 * Create ledger entry
 */
export async function createLedgerEntry(
  transaction: JournalEntry,
  sequenceNumber: number,
  previousHash: string
): Promise<LedgerEntry> {
  const hash = await generateTransactionHash(transaction, previousHash);
  
  return {
    id: `ledger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sequenceNumber,
    transaction,
    hash,
    previousHash,
    isCertified: false,
    createdAt: new Date(),
  };
}

/**
 * Sign ledger entry
 */
export async function signLedgerEntry(
  entry: LedgerEntry,
  privateKey: string,
  signedBy: string
): Promise<LedgerEntry> {
  const data = JSON.stringify({
    sequenceNumber: entry.sequenceNumber,
    transactionId: entry.transaction.id,
    hash: entry.hash,
    previousHash: entry.previousHash,
  });
  
  const digitalSignature = await generateDigitalSignature(data, privateKey);
  
  return {
    ...entry,
    digitalSignature,
    isCertified: true,
  };
}

/**
 * Verify ledger entry signature
 */
export async function verifyLedgerEntrySignature(entry: LedgerEntry): Promise<boolean> {
  if (!entry.digitalSignature) {
    return false;
  }
  
  const data = JSON.stringify({
    sequenceNumber: entry.sequenceNumber,
    transactionId: entry.transaction.id,
    hash: entry.hash,
    previousHash: entry.previousHash,
  });
  
  return verifyDigitalSignature(data, entry.digitalSignature);
}

/**
 * Verify ledger chain integrity
 */
export async function verifyLedgerChainIntegrity(entries: LedgerEntry[]): Promise<{
  isValid: boolean;
  brokenAt?: number;
  findings: AuditFinding[];
}> {
  const findings: AuditFinding[] = [];
  let previousHash = '';
  let isValid = true;
  let brokenAt: number | undefined;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    // Verify hash chain
    if (entry.previousHash !== previousHash) {
      findings.push({
        severity: 'critical',
        category: 'integrity',
        description: `Hash chain broken at entry ${entry.sequenceNumber}`,
        transactionId: entry.transaction.id,
        recommendation: 'Investigate potential tampering or data corruption',
      });
      isValid = false;
      brokenAt = i;
    }
    
    // Recalculate and verify hash
    const expectedHash = await generateTransactionHash(entry.transaction, previousHash);
    if (entry.hash !== expectedHash) {
      findings.push({
        severity: 'critical',
        category: 'integrity',
        description: `Hash mismatch at entry ${entry.sequenceNumber}`,
        transactionId: entry.transaction.id,
        recommendation: 'Transaction data may have been modified',
      });
      isValid = false;
    }
    
    // Verify digital signature if present
    if (entry.digitalSignature) {
      const signatureValid = await verifyLedgerEntrySignature(entry);
      if (!signatureValid) {
        findings.push({
          severity: 'high',
          category: 'signature',
          description: `Invalid digital signature at entry ${entry.sequenceNumber}`,
          transactionId: entry.transaction.id,
          recommendation: 'Verify signing authority and re-sign if necessary',
        });
      }
    }
    
    previousHash = entry.hash;
  }

  return {
    isValid,
    brokenAt,
    findings,
  };
}

/**
 * Create ledger certification
 */
export async function createLedgerCertification(
  ledgerId: string,
  entries: LedgerEntry[],
  certifiedBy: string,
  certificationAuthority: string,
  privateKey: string
): Promise<LedgerCertification> {
  const lastEntry = entries[entries.length - 1];
  const previousHash = lastEntry?.hash || '';
  
  const certificationData = {
    ledgerId,
    transactionCount: entries.length,
    totalDebit: entries.reduce((sum, e) => sum + e.transaction.totalDebit, 0),
    totalCredit: entries.reduce((sum, e) => sum + e.transaction.totalCredit, 0),
    previousHash,
  };
  
  const hash = await simpleHash(JSON.stringify(certificationData));
  const signature = await generateDigitalSignature(hash, privateKey);
  
  return {
    id: `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ledgerId,
    certificationDate: new Date(),
    certifiedBy,
    certificationAuthority,
    signature,
    hash,
    previousHash,
    transactionCount: entries.length,
    totalDebit: certificationData.totalDebit,
    totalCredit: certificationData.totalCredit,
    status: 'certified',
  };
}

/**
 * Verify ledger certification
 */
export async function verifyLedgerCertification(
  certification: LedgerCertification,
  entries: LedgerEntry[]
): Promise<boolean> {
  // Verify certification hash
  const expectedData = {
    ledgerId: certification.ledgerId,
    transactionCount: certification.transactionCount,
    totalDebit: certification.totalDebit,
    totalCredit: certification.totalCredit,
    previousHash: certification.previousHash,
  };
  
  const expectedHash = await simpleHash(JSON.stringify(expectedData));
  
  if (certification.hash !== expectedHash) {
    return false;
  }
  
  // Verify digital signature
  const signatureValid = await verifyDigitalSignature(certification.hash, certification.signature);
  
  if (!signatureValid) {
    return false;
  }
  
  // Verify chain integrity
  const chainVerification = await verifyLedgerChainIntegrity(entries);
  
  return chainVerification.isValid;
}

/**
 * Generate audit report
 */
export async function generateAuditReport(
  ledgerId: string,
  entries: LedgerEntry[],
  startDate: Date,
  endDate: Date,
  generatedBy: string
): Promise<AuditReport> {
  const periodEntries = entries.filter(entry => {
    const entryDate = new Date(entry.transaction.transactionDate);
    return entryDate >= startDate && entryDate <= endDate;
  });
  
  const certifiedEntries = periodEntries.filter(e => e.isCertified);
  const chainVerification = await verifyLedgerChainIntegrity(periodEntries);
  
  const findings = chainVerification.findings;
  
  // Determine compliance status
  let complianceStatus: 'compliant' | 'non_compliant' | 'partial' = 'compliant';
  
  if (!chainVerification.isValid) {
    complianceStatus = 'non_compliant';
  } else if (certifiedEntries.length < periodEntries.length) {
    complianceStatus = 'partial';
  }
  
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ledgerId,
    reportDate: new Date(),
    startDate,
    endDate,
    totalTransactions: periodEntries.length,
    certifiedTransactions: certifiedEntries.length,
    uncertifiedTransactions: periodEntries.length - certifiedEntries.length,
    integrityCheck: chainVerification.isValid,
    signatureVerification: findings.filter(f => f.category === 'signature').length === 0,
    complianceStatus,
    findings,
    generatedBy,
  };
}

/**
 * Get ledger summary
 */
export function getLedgerSummary(entries: LedgerEntry[]): {
  totalEntries: number;
  certifiedEntries: number;
  uncertifiedEntries: number;
  totalDebit: number;
  totalCredit: number;
  firstEntryDate: Date | null;
  lastEntryDate: Date | null;
} {
  const certified = entries.filter(e => e.isCertified).length;
  
  const dates = entries
    .map(e => new Date(e.transaction.transactionDate))
    .filter(d => !isNaN(d.getTime()));
  
  return {
    totalEntries: entries.length,
    certifiedEntries: certified,
    uncertifiedEntries: entries.length - certified,
    totalDebit: entries.reduce((sum, e) => sum + e.transaction.totalDebit, 0),
    totalCredit: entries.reduce((sum, e) => sum + e.transaction.totalCredit, 0),
    firstEntryDate: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null,
    lastEntryDate: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null,
  };
}

/**
 * Export ledger for audit
 */
export async function exportLedgerForAudit(
  entries: LedgerEntry[],
  certification?: LedgerCertification
): Promise<string> {
  const summary = getLedgerSummary(entries);
  
  const exportData = {
    exportDate: new Date(),
    ledgerSummary: summary,
    certification: certification ? {
      id: certification.id,
      certificationDate: certification.certificationDate,
      certifiedBy: certification.certifiedBy,
      certificationAuthority: certification.certificationAuthority,
      status: certification.status,
    } : null,
    entries: entries.map(entry => ({
      sequenceNumber: entry.sequenceNumber,
      transactionId: entry.transaction.id,
      transactionNumber: entry.transaction.transactionNumber,
      transactionType: entry.transaction.transactionType,
      transactionDate: entry.transaction.transactionDate,
      description: entry.transaction.description,
      totalDebit: entry.transaction.totalDebit,
      totalCredit: entry.transaction.totalCredit,
      hash: entry.hash,
      previousHash: entry.previousHash,
      isCertified: entry.isCertified,
      hasSignature: !!entry.digitalSignature,
    })),
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Revoke certification
 */
export function revokeCertification(
  certification: LedgerCertification,
  revokedBy: string,
  reason: string
): LedgerCertification {
  return {
    ...certification,
    status: 'revoked',
  };
}
