/**
 * File Retention Policies
 * 
 * Implements file retention management with:
 * - Retention policy creation and management
 * - Automatic expiration handling
 * - Archive management
 * - Compliance tracking
 * - Retention scheduling
 * - Data lifecycle management
 */

// Retention action
export enum RetentionAction {
  DELETE = 'delete',
  ARCHIVE = 'archive',
  RETAIN = 'retain',
  REVIEW = 'review',
}

// Retention policy
export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  fileType: string;
  category: 'documents' | 'images' | 'videos' | 'audio' | 'logs' | 'backups' | 'other';
  retentionPeriodDays: number;
  action: RetentionAction;
  archiveLocation?: string;
  notifyBeforeDays: number;
  notifyEmails: string[];
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
}

// File record
export interface FileRecord {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  category: string;
  uploadedAt: Date;
  uploadedBy: string;
  policyId?: string;
  expiresAt?: Date;
  archivedAt?: Date;
  deletedAt?: Date;
  status: 'active' | 'archived' | 'expired' | 'deleted';
  metadata?: Record<string, unknown>;
}

// Retention event
export interface RetentionEvent {
  id: string;
  fileId: string;
  policyId: string;
  action: RetentionAction;
  executedAt: Date;
  executedBy: string;
  success: boolean;
  errorMessage?: string;
}

// Retention schedule
export interface RetentionSchedule {
  id: string;
  policyId: string;
  runAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  processedFiles: number;
  failedFiles: number;
}

/**
 * Create retention policy
 */
export function createRetentionPolicy(
  name: string,
  description: string,
  fileType: string,
  category: 'documents' | 'images' | 'videos' | 'audio' | 'logs' | 'backups' | 'other',
  retentionPeriodDays: number,
  action: RetentionAction,
  createdBy: string,
  archiveLocation?: string,
  notifyBeforeDays: number = 7,
  notifyEmails: string[] = []
): RetentionPolicy {
  return {
    id: `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    fileType,
    category,
    retentionPeriodDays,
    action,
    archiveLocation,
    notifyBeforeDays,
    notifyEmails,
    isActive: true,
    createdAt: new Date(),
    createdBy,
  };
}

/**
 * Apply retention policy to file
 */
export function applyRetentionPolicy(
  file: FileRecord,
  policy: RetentionPolicy
): FileRecord {
  const uploadedAt = new Date(file.uploadedAt);
  const expiresAt = new Date(uploadedAt.getTime() + policy.retentionPeriodDays * 24 * 60 * 60 * 1000);
  
  return {
    ...file,
    policyId: policy.id,
    expiresAt,
    status: 'active',
  };
}

/**
 * Check if file is expired
 */
export function isFileExpired(file: FileRecord): boolean {
  if (!file.expiresAt) {
    return false;
  }
  
  return new Date() > file.expiresAt;
}

/**
 * Get files due for retention action
 */
export function getFilesDueForRetention(files: FileRecord[]): FileRecord[] {
  return files.filter(file => isFileExpired(file) && file.status === 'active');
}

/**
 * Execute retention action
 */
export function executeRetentionAction(
  file: FileRecord,
  action: RetentionAction,
  executedBy: string,
  archiveLocation?: string
): { file: FileRecord; event: RetentionEvent } {
  const now = new Date();
  
  switch (action) {
    case RetentionAction.DELETE:
      return {
        file: {
          ...file,
          status: 'deleted',
          deletedAt: now,
        },
        event: {
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fileId: file.id,
          policyId: file.policyId || '',
          action,
          executedAt: now,
          executedBy,
          success: true,
        },
      };
    
    case RetentionAction.ARCHIVE:
      return {
        file: {
          ...file,
          status: 'archived',
          archivedAt: now,
          metadata: {
            ...file.metadata,
            archiveLocation,
          },
        },
        event: {
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fileId: file.id,
          policyId: file.policyId || '',
          action,
          executedAt: now,
          executedBy,
          success: true,
        },
      };
    
    case RetentionAction.RETAIN: {
      // Extend retention period
      const newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Extend by 30 days
      return {
        file: {
          ...file,
          expiresAt: newExpiresAt,
        },
        event: {
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fileId: file.id,
          policyId: file.policyId || '',
          action,
          executedAt: now,
          executedBy,
          success: true,
        },
      };
    }
    
    case RetentionAction.REVIEW:
      // Mark for review
      return {
        file: {
          ...file,
          status: 'expired',
          metadata: {
            ...file.metadata,
            reviewRequired: true,
          },
        },
        event: {
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fileId: file.id,
          policyId: file.policyId || '',
          action,
          executedAt: now,
          executedBy,
          success: true,
        },
      };
    
    default:
      return {
        file,
        event: {
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fileId: file.id,
          policyId: file.policyId || '',
          action,
          executedAt: now,
          executedBy,
          success: true,
        },
      };
  }
}

/**
 * Create retention schedule
 */
export function createRetentionSchedule(
  policyId: string,
  runAt: Date
): RetentionSchedule {
  return {
    id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    policyId,
    runAt,
    status: 'pending',
    processedFiles: 0,
    failedFiles: 0,
  };
}

/**
 * Execute retention schedule
 */
export function executeRetentionSchedule(
  schedule: RetentionSchedule,
  files: FileRecord[],
  policies: RetentionPolicy[],
  executedBy: string
): RetentionSchedule {
  let processedFiles = 0;
  let failedFiles = 0;
  
  for (const file of files) {
    if (!file.policyId) continue;
    
    const policy = policies.find(p => p.id === file.policyId);
    if (!policy || !policy.isActive) continue;
    
    try {
      executeRetentionAction(
        file,
        policy.action,
        executedBy,
        policy.archiveLocation
      );
      processedFiles++;
    } catch {
      failedFiles++;
    }
  }
  
  return {
    ...schedule,
    status: 'completed',
    processedFiles,
    failedFiles,
  };
}

/**
 * Get files approaching expiration
 */
export function getFilesApproachingExpiration(
  files: FileRecord[],
  daysThreshold: number = 7
): FileRecord[] {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return files.filter(file => {
    if (!file.expiresAt || file.status !== 'active') {
      return false;
    }
    
    return new Date(file.expiresAt) <= thresholdDate;
  });
}

/**
 * Get retention statistics
 */
export function getRetentionStatistics(files: FileRecord[]): {
  totalFiles: number;
  activeFiles: number;
  archivedFiles: number;
  expiredFiles: number;
  deletedFiles: number;
  byCategory: Record<string, number>;
  byFileType: Record<string, number>;
  totalStorageUsed: number;
  averageFileSize: number;
} {
  const activeFiles = files.filter(f => f.status === 'active').length;
  const archivedFiles = files.filter(f => f.status === 'archived').length;
  const expiredFiles = files.filter(f => f.status === 'expired').length;
  const deletedFiles = files.filter(f => f.status === 'deleted').length;
  
  const byCategory: Record<string, number> = {};
  const byFileType: Record<string, number> = {};
  let totalStorageUsed = 0;
  
  for (const file of files) {
    byCategory[file.category] = (byCategory[file.category] || 0) + 1;
    byFileType[file.fileType] = (byFileType[file.fileType] || 0) + 1;
    totalStorageUsed += file.fileSize;
  }
  
  const averageFileSize = files.length > 0 ? totalStorageUsed / files.length : 0;
  
  return {
    totalFiles: files.length,
    activeFiles,
    archivedFiles,
    expiredFiles,
    deletedFiles,
    byCategory,
    byFileType,
    totalStorageUsed,
    averageFileSize,
  };
}

/**
 * Get default retention policies
 */
export function getDefaultRetentionPolicies(): Omit<RetentionPolicy, 'id' | 'createdAt'>[] {
  return [
    {
      name: 'Document Retention',
      description: 'Retain documents for 7 years for compliance',
      fileType: '*',
      category: 'documents',
      retentionPeriodDays: 2555, // 7 years
      action: RetentionAction.ARCHIVE,
      archiveLocation: '/archive/documents',
      notifyBeforeDays: 30,
      notifyEmails: ['compliance@example.com'],
      isActive: true,
      createdBy: 'system',
    },
    {
      name: 'Image Retention',
      description: 'Retain images for 2 years',
      fileType: '*',
      category: 'images',
      retentionPeriodDays: 730, // 2 years
      action: RetentionAction.DELETE,
      notifyBeforeDays: 7,
      notifyEmails: [],
      isActive: true,
      createdBy: 'system',
    },
    {
      name: 'Log Retention',
      description: 'Retain logs for 90 days',
      fileType: '*',
      category: 'logs',
      retentionPeriodDays: 90,
      action: RetentionAction.DELETE,
      notifyBeforeDays: 7,
      notifyEmails: [],
      isActive: true,
      createdBy: 'system',
    },
    {
      name: 'Backup Retention',
      description: 'Retain backups for 1 year',
      fileType: '*',
      category: 'backups',
      retentionPeriodDays: 365,
      action: RetentionAction.ARCHIVE,
      archiveLocation: '/archive/backups',
      notifyBeforeDays: 30,
      notifyEmails: ['ops@example.com'],
      isActive: true,
      createdBy: 'system',
    },
  ];
}

/**
 * Get retention action label
 */
export function getRetentionActionLabel(action: RetentionAction): string {
  const labels: Record<RetentionAction, string> = {
    [RetentionAction.DELETE]: 'Delete',
    [RetentionAction.ARCHIVE]: 'Archive',
    [RetentionAction.RETAIN]: 'Retain',
    [RetentionAction.REVIEW]: 'Review',
  };

  return labels[action];
}

/**
 * Filter files by status
 */
export function filterFilesByStatus(files: FileRecord[], status: FileRecord['status']): FileRecord[] {
  return files.filter(file => file.status === status);
}

/**
 * Filter files by category
 */
export function filterFilesByCategory(files: FileRecord[], category: string): FileRecord[] {
  return files.filter(file => file.category === category);
}

/**
 * Filter files by policy
 */
export function filterFilesByPolicy(files: FileRecord[], policyId: string): FileRecord[] {
  return files.filter(file => file.policyId === policyId);
}

/**
 * Filter files by date range
 */
export function filterFilesByDateRange(
  files: FileRecord[],
  startDate: Date,
  endDate: Date
): FileRecord[] {
  return files.filter(file => {
    const uploadDate = new Date(file.uploadedAt);
    return uploadDate >= startDate && uploadDate <= endDate;
  });
}

/**
 * Enable retention policy
 */
export function enableRetentionPolicy(policy: RetentionPolicy): RetentionPolicy {
  return {
    ...policy,
    isActive: true,
  };
}

/**
 * Disable retention policy
 */
export function disableRetentionPolicy(policy: RetentionPolicy): RetentionPolicy {
  return {
    ...policy,
    isActive: false,
  };
}

/**
 * Update retention policy
 */
export function updateRetentionPolicy(
  policy: RetentionPolicy,
  updates: Partial<Omit<RetentionPolicy, 'id' | 'createdAt' | 'createdBy'>>
): RetentionPolicy {
  return {
    ...policy,
    ...updates,
  };
}

/**
 * Delete retention policy
 */
export function deleteRetentionPolicy(policies: RetentionPolicy[], policyId: string): RetentionPolicy[] {
  return policies.filter(policy => policy.id !== policyId);
}

/**
 * Get policy statistics
 */
export function getPolicyStatistics(policies: RetentionPolicy[]): {
  totalPolicies: number;
  activePolicies: number;
  byCategory: Record<string, number>;
  byAction: Record<RetentionAction, number>;
} {
  const activePolicies = policies.filter(p => p.isActive).length;
  
  const byCategory: Record<string, number> = {};
  const byAction: Record<RetentionAction, number> = {
    [RetentionAction.DELETE]: 0,
    [RetentionAction.ARCHIVE]: 0,
    [RetentionAction.RETAIN]: 0,
    [RetentionAction.REVIEW]: 0,
  };
  
  for (const policy of policies) {
    byCategory[policy.category] = (byCategory[policy.category] || 0) + 1;
    byAction[policy.action]++;
  }
  
  return {
    totalPolicies: policies.length,
    activePolicies,
    byCategory,
    byAction,
  };
}

/**
 * Calculate storage savings from retention
 */
export function calculateStorageSavings(files: FileRecord[]): {
  totalSavings: number;
  archivedFiles: number;
  deletedFiles: number;
  byCategory: Record<string, number>;
} {
  let totalSavings = 0;
  const archivedFiles = files.filter(f => f.status === 'archived').length;
  const deletedFiles = files.filter(f => f.status === 'deleted').length;
  const byCategory: Record<string, number> = {};
  
  for (const file of files) {
    if (file.status === 'archived' || file.status === 'deleted') {
      totalSavings += file.fileSize;
      byCategory[file.category] = (byCategory[file.category] || 0) + file.fileSize;
    }
  }
  
  return {
    totalSavings,
    archivedFiles,
    deletedFiles,
    byCategory,
  };
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get retention event statistics
 */
export function getRetentionEventStatistics(events: RetentionEvent[]): {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  byAction: Record<RetentionAction, number>;
  byDate: Record<string, number>;
} {
  const successfulEvents = events.filter(e => e.success).length;
  const failedEvents = events.filter(e => !e.success).length;
  
  const byAction: Record<RetentionAction, number> = {
    [RetentionAction.DELETE]: 0,
    [RetentionAction.ARCHIVE]: 0,
    [RetentionAction.RETAIN]: 0,
    [RetentionAction.REVIEW]: 0,
  };
  
  const byDate: Record<string, number> = {};
  
  for (const event of events) {
    byAction[event.action]++;
    
    const dateKey = event.executedAt.toISOString().split('T')[0];
    byDate[dateKey] = (byDate[dateKey] || 0) + 1;
  }
  
  return {
    totalEvents: events.length,
    successfulEvents,
    failedEvents,
    byAction,
    byDate,
  };
}
