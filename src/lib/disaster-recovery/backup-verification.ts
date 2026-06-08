/**
 * Automated Backup Verification System
 * 
 * Implements comprehensive backup verification with:
 * - Backup integrity checking
 * - Automated verification scheduling
 * - Backup health monitoring
 * - Recovery point validation
 * - Backup performance metrics
 * - Alerting on backup failures
 */

// Backup status
export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  VERIFIED = 'verified',
  CORRUPTED = 'corrupted',
}

// Backup type
export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  DIFFERENTIAL = 'differential',
  SNAPSHOT = 'snapshot',
}

// Backup verification result
export interface BackupVerificationResult {
  backupId: string;
  verifiedAt: Date;
  isValid: boolean;
  integrityScore: number; // 0-100
  checksum: string;
  size: number;
  duration: number; // milliseconds
  errors: VerificationError[];
  warnings: VerificationWarning[];
}

// Verification error
export interface VerificationError {
  code: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
}

// Verification warning
export interface VerificationWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

// Backup record
export interface BackupRecord {
  id: string;
  name: string;
  type: BackupType;
  source: string;
  destination: string;
  size: number;
  createdAt: Date;
  completedAt?: Date;
  status: BackupStatus;
  checksum?: string;
  retentionDays: number;
  verificationResults: BackupVerificationResult[];
  metadata?: Record<string, unknown>;
}

// Verification schedule
export interface VerificationSchedule {
  id: string;
  backupId: string;
  schedule: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  nextRunAt: Date;
  lastRunAt?: Date;
  isActive: boolean;
}

// Backup health metrics
export interface BackupHealthMetrics {
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  verifiedBackups: number;
  corruptedBackups: number;
  averageBackupSize: number;
  averageBackupDuration: number;
  averageVerificationDuration: number;
  successRate: number;
  verificationRate: number;
  byType: Record<BackupType, number>;
  byStatus: Record<BackupStatus, number>;
}

/**
 * Calculate checksum
 */
export async function calculateChecksum(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify backup integrity
 */
export async function verifyBackupIntegrity(
  backupId: string,
  data: ArrayBuffer,
  expectedChecksum?: string
): Promise<BackupVerificationResult> {
  const startTime = Date.now();
  const errors: VerificationError[] = [];
  const warnings: VerificationWarning[] = [];
  
  // Calculate checksum
  const checksum = await calculateChecksum(data);
  
  // Verify checksum if provided
  if (expectedChecksum && checksum !== expectedChecksum) {
    errors.push({
      code: 'CHECKSUM_MISMATCH',
      message: 'Calculated checksum does not match expected checksum',
      severity: 'critical',
      timestamp: new Date(),
    });
  }
  
  // Check if data is empty
  if (data.byteLength === 0) {
    errors.push({
      code: 'EMPTY_BACKUP',
      message: 'Backup data is empty',
      severity: 'critical',
      timestamp: new Date(),
    });
  }
  
  // Check backup size
  const size = data.byteLength;
  if (size < 1024) {
    warnings.push({
      code: 'SMALL_BACKUP',
      message: 'Backup size is suspiciously small',
      severity: 'medium',
      timestamp: new Date(),
    });
  }
  
  // Calculate integrity score
  let integrityScore = 100;
  integrityScore -= errors.length * 25;
  integrityScore -= warnings.length * 10;
  integrityScore = Math.max(0, integrityScore);
  
  const duration = Date.now() - startTime;
  
  return {
    backupId,
    verifiedAt: new Date(),
    isValid: errors.length === 0,
    integrityScore,
    checksum,
    size,
    duration,
    errors,
    warnings,
  };
}

/**
 * Create backup record
 */
export function createBackupRecord(
  name: string,
  type: BackupType,
  source: string,
  destination: string,
  retentionDays: number,
  metadata?: Record<string, unknown>
): BackupRecord {
  return {
    id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    source,
    destination,
    size: 0,
    createdAt: new Date(),
    status: BackupStatus.PENDING,
    retentionDays,
    verificationResults: [],
    metadata,
  };
}

/**
 * Complete backup
 */
export function completeBackup(
  backup: BackupRecord,
  size: number,
  checksum: string
): BackupRecord {
  return {
    ...backup,
    size,
    checksum,
    status: BackupStatus.COMPLETED,
    completedAt: new Date(),
  };
}

/**
 * Fail backup
 */
export function failBackup(backup: BackupRecord, reason: string): BackupRecord {
  return {
    ...backup,
    status: BackupStatus.FAILED,
    metadata: {
      ...backup.metadata,
      failureReason: reason,
      failedAt: new Date(),
    },
  };
}

/**
 * Add verification result
 */
export function addVerificationResult(
  backup: BackupRecord,
  result: BackupVerificationResult
): BackupRecord {
  const updatedBackup = {
    ...backup,
    verificationResults: [...backup.verificationResults, result],
  };
  
  // Update status based on verification
  if (result.isValid) {
    updatedBackup.status = BackupStatus.VERIFIED;
  } else if (result.integrityScore < 50) {
    updatedBackup.status = BackupStatus.CORRUPTED;
  }
  
  return updatedBackup;
}

/**
 * Create verification schedule
 */
export function createVerificationSchedule(
  backupId: string,
  schedule: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'monthly'
): VerificationSchedule {
  const nextRunAt = calculateNextRunTime(schedule);
  
  return {
    id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    backupId,
    schedule,
    nextRunAt,
    isActive: true,
  };
}

/**
 * Calculate next run time
 */
function calculateNextRunTime(schedule: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'monthly'): Date {
  const now = new Date();
  
  switch (schedule) {
    case 'immediate':
      return now;
    
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000);
    
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    case 'monthly': {
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    }
    
    default:
      return now;
  }
}

/**
 * Get backups due for verification
 */
export function getBackupsDueForVerification(
  backups: BackupRecord[],
  schedules: VerificationSchedule[]
): BackupRecord[] {
  const now = new Date();
  const dueBackupIds = schedules
    .filter(s => s.isActive && s.nextRunAt <= now)
    .map(s => s.backupId);
  
  return backups.filter(b => dueBackupIds.includes(b.id));
}

/**
 * Calculate backup health metrics
 */
export function calculateBackupHealthMetrics(backups: BackupRecord[]): BackupHealthMetrics {
  const successfulBackups = backups.filter(b => b.status === BackupStatus.COMPLETED || b.status === BackupStatus.VERIFIED).length;
  const failedBackups = backups.filter(b => b.status === BackupStatus.FAILED).length;
  const verifiedBackups = backups.filter(b => b.status === BackupStatus.VERIFIED).length;
  const corruptedBackups = backups.filter(b => b.status === BackupStatus.CORRUPTED).length;
  
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
  const averageBackupSize = backups.length > 0 ? totalSize / backups.length : 0;
  
  // Calculate average durations
  const completedBackups = backups.filter(b => b.completedAt);
  const averageBackupDuration = completedBackups.length > 0
    ? completedBackups.reduce((sum, b) => sum + (b.completedAt!.getTime() - b.createdAt.getTime()), 0) / completedBackups.length
    : 0;
  
  const allVerificationResults = backups.flatMap(b => b.verificationResults);
  const averageVerificationDuration = allVerificationResults.length > 0
    ? allVerificationResults.reduce((sum, r) => sum + r.duration, 0) / allVerificationResults.length
    : 0;
  
  const successRate = backups.length > 0 ? (successfulBackups / backups.length) * 100 : 0;
  const verificationRate = completedBackups.length > 0 ? (verifiedBackups / completedBackups.length) * 100 : 0;
  
  const byType: Record<BackupType, number> = {
    [BackupType.FULL]: 0,
    [BackupType.INCREMENTAL]: 0,
    [BackupType.DIFFERENTIAL]: 0,
    [BackupType.SNAPSHOT]: 0,
  };
  
  const byStatus: Record<BackupStatus, number> = {
    [BackupStatus.PENDING]: 0,
    [BackupStatus.IN_PROGRESS]: 0,
    [BackupStatus.COMPLETED]: 0,
    [BackupStatus.FAILED]: 0,
    [BackupStatus.VERIFIED]: 0,
    [BackupStatus.CORRUPTED]: 0,
  };
  
  for (const backup of backups) {
    byType[backup.type]++;
    byStatus[backup.status]++;
  }
  
  return {
    totalBackups: backups.length,
    successfulBackups,
    failedBackups,
    verifiedBackups,
    corruptedBackups,
    averageBackupSize,
    averageBackupDuration,
    averageVerificationDuration,
    successRate,
    verificationRate,
    byType,
    byStatus,
  };
}

/**
 * Get backup status label
 */
export function getBackupStatusLabel(status: BackupStatus): string {
  const labels: Record<BackupStatus, string> = {
    [BackupStatus.PENDING]: 'Pending',
    [BackupStatus.IN_PROGRESS]: 'In Progress',
    [BackupStatus.COMPLETED]: 'Completed',
    [BackupStatus.FAILED]: 'Failed',
    [BackupStatus.VERIFIED]: 'Verified',
    [BackupStatus.CORRUPTED]: 'Corrupted',
  };

  return labels[status];
}

/**
 * Get backup type label
 */
export function getBackupTypeLabel(type: BackupType): string {
  const labels: Record<BackupType, string> = {
    [BackupType.FULL]: 'Full',
    [BackupType.INCREMENTAL]: 'Incremental',
    [BackupType.DIFFERENTIAL]: 'Differential',
    [BackupType.SNAPSHOT]: 'Snapshot',
  };

  return labels[type];
}

/**
 * Filter backups by status
 */
export function filterBackupsByStatus(backups: BackupRecord[], status: BackupStatus): BackupRecord[] {
  return backups.filter(backup => backup.status === status);
}

/**
 * Filter backups by type
 */
export function filterBackupsByType(backups: BackupRecord[], type: BackupType): BackupRecord[] {
  return backups.filter(backup => backup.type === type);
}

/**
 * Filter backups by date range
 */
export function filterBackupsByDateRange(
  backups: BackupRecord[],
  startDate: Date,
  endDate: Date
): BackupRecord[] {
  return backups.filter(backup => {
    const backupDate = new Date(backup.createdAt);
    return backupDate >= startDate && backupDate <= endDate;
  });
}

/**
 * Get expired backups
 */
export function getExpiredBackups(backups: BackupRecord[]): BackupRecord[] {
  const now = new Date();
  return backups.filter(backup => {
    const expiryDate = new Date(backup.createdAt);
    expiryDate.setDate(expiryDate.getDate() + backup.retentionDays);
    return now > expiryDate;
  });
}

/**
 * Clean up expired backups
 */
export function cleanupExpiredBackups(backups: BackupRecord[]): BackupRecord[] {
  const expiredBackups = getExpiredBackups(backups);
  const expiredIds = new Set(expiredBackups.map(b => b.id));
  return backups.filter(backup => !expiredIds.has(backup.id));
}

/**
 * Get backup retention summary
 */
export function getBackupRetentionSummary(backups: BackupRecord[]): {
  totalStorageUsed: number;
  storageByType: Record<BackupType, number>;
  backupsExpiringSoon: BackupRecord[];
  expiredBackups: BackupRecord[];
} {
  const totalStorageUsed = backups.reduce((sum, b) => sum + b.size, 0);
  
  const storageByType: Record<BackupType, number> = {
    [BackupType.FULL]: 0,
    [BackupType.INCREMENTAL]: 0,
    [BackupType.DIFFERENTIAL]: 0,
    [BackupType.SNAPSHOT]: 0,
  };
  
  for (const backup of backups) {
    storageByType[backup.type] += backup.size;
  }
  
  const now = new Date();
  const soonExpiryDate = new Date();
  soonExpiryDate.setDate(soonExpiryDate.getDate() + 7);
  
  const backupsExpiringSoon = backups.filter(backup => {
    const expiryDate = new Date(backup.createdAt);
    expiryDate.setDate(expiryDate.getDate() + backup.retentionDays);
    return expiryDate <= soonExpiryDate && expiryDate > now;
  });
  
  const expiredBackups = getExpiredBackups(backups);
  
  return {
    totalStorageUsed,
    storageByType,
    backupsExpiringSoon,
    expiredBackups,
  };
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get verification statistics
 */
export function getVerificationStatistics(results: BackupVerificationResult[]): {
  totalVerifications: number;
  successfulVerifications: number;
  failedVerifications: number;
  averageIntegrityScore: number;
  averageDuration: number;
  byErrorType: Record<string, number>;
} {
  const successfulVerifications = results.filter(r => r.isValid).length;
  const failedVerifications = results.filter(r => !r.isValid).length;
  
  const averageIntegrityScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.integrityScore, 0) / results.length
    : 0;
  
  const averageDuration = results.length > 0
    ? results.reduce((sum, r) => sum + r.duration, 0) / results.length
    : 0;
  
  const byErrorType: Record<string, number> = {};
  
  for (const result of results) {
    for (const error of result.errors) {
      byErrorType[error.code] = (byErrorType[error.code] || 0) + 1;
    }
  }
  
  return {
    totalVerifications: results.length,
    successfulVerifications,
    failedVerifications,
    averageIntegrityScore,
    averageDuration,
    byErrorType,
  };
}
