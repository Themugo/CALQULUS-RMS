/**
 * Reversal Workflow System
 * 
 * Handles transaction reversal workflows with:
 * - Reversal request approval
 * - Reason validation
 * - Audit trail
 * - Partial reversal support
 * - Reversal limits and controls
 */

import { JournalEntry, TransactionStatus, TransactionType, reverseJournalEntry } from './journal-system';
import { logTransactionAction } from './immutable-journal';

// Reversal request status
export enum ReversalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Reversal reason categories
export enum ReversalReason {
  ERROR = 'error',
  DUPLICATE = 'duplicate',
  CANCELLATION = 'cancellation',
  ADJUSTMENT = 'adjustment',
  REFUND = 'refund',
  OTHER = 'other',
}

// Reversal request
export interface ReversalRequest {
  id: string;
  originalTransactionId: string;
  originalTransactionNumber: string;
  reversalReason: ReversalReason;
  reasonDescription: string;
  reversalDate: Date;
  requestedBy: string;
  requestedByUserName: string;
  requestedAt: Date;
  status: ReversalStatus;
  approvedBy?: string;
  approvedByUserName?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  reversalTransactionId?: string;
  reversalTransactionNumber?: string;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

// Reversal approval workflow
export interface ReversalApprovalWorkflow {
  requireApproval: boolean;
  approvalLevels: number;
  autoApproveAmountThreshold: number;
  requireReason: boolean;
  allowPartialReversal: boolean;
  reversalLimitPerPeriod: number;
  reversalLimitPeriod: 'day' | 'week' | 'month';
}

// Default approval workflow configuration
const DEFAULT_APPROVAL_WORKFLOW: ReversalApprovalWorkflow = {
  requireApproval: true,
  approvalLevels: 1,
  autoApproveAmountThreshold: 1000,
  requireReason: true,
  allowPartialReversal: false,
  reversalLimitPerPeriod: 10,
  reversalLimitPeriod: 'month',
};

/**
 * Create reversal request
 */
export function createReversalRequest(
  originalTransaction: JournalEntry,
  reversalReason: ReversalReason,
  reasonDescription: string,
  reversalDate: Date,
  userId: string,
  userName: string
): ReversalRequest {
  return {
    id: `rev_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalTransactionId: originalTransaction.id,
    originalTransactionNumber: originalTransaction.transactionNumber,
    reversalReason,
    reasonDescription,
    reversalDate,
    requestedBy: userId,
    requestedByUserName: userName,
    requestedAt: new Date(),
    status: ReversalStatus.PENDING,
  };
}

/**
 * Validate reversal request
 */
export function validateReversalRequest(
  request: ReversalRequest,
  originalTransaction: JournalEntry,
  workflow: ReversalApprovalWorkflow = DEFAULT_APPROVAL_WORKFLOW
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if original transaction can be reversed
  if (originalTransaction.status !== TransactionStatus.POSTED) {
    errors.push('Only posted transactions can be reversed');
  }

  if (originalTransaction.status === TransactionStatus.REVERSED) {
    errors.push('Transaction has already been reversed');
  }

  // Validate reason
  if (workflow.requireReason && !request.reasonDescription.trim()) {
    errors.push('Reversal reason description is required');
  }

  // Validate reversal date
  if (new Date(request.reversalDate) < new Date(originalTransaction.transactionDate)) {
    errors.push('Reversal date cannot be before original transaction date');
  }

  // Check reversal limits
  // In a real implementation, this would check against existing reversals
  // For now, we'll skip this check

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Approve reversal request
 */
export function approveReversalRequest(
  request: ReversalRequest,
  approvedBy: string,
  approvedByUserName: string
): ReversalRequest {
  if (request.status !== ReversalStatus.PENDING) {
    throw new Error('Only pending requests can be approved');
  }

  return {
    ...request,
    status: ReversalStatus.APPROVED,
    approvedBy,
    approvedByUserName,
    approvedAt: new Date(),
  };
}

/**
 * Reject reversal request
 */
export function rejectReversalRequest(
  request: ReversalRequest,
  rejectionReason: string,
  rejectedBy: string,
  rejectedByUserName: string
): ReversalRequest {
  if (request.status !== ReversalStatus.PENDING) {
    throw new Error('Only pending requests can be rejected');
  }

  return {
    ...request,
    status: ReversalStatus.REJECTED,
    rejectionReason,
    approvedBy: rejectedBy,
    approvedByUserName: rejectedByUserName,
    approvedAt: new Date(),
  };
}

/**
 * Execute reversal
 */
export async function executeReversal(
  request: ReversalRequest,
  originalTransaction: JournalEntry,
  userId: string,
  userName: string
): Promise<{ reversalEntry: Omit<JournalEntry, 'id' | 'transactionNumber' | 'totalDebit' | 'totalCredit' | 'createdAt' | 'updatedAt'>; updatedRequest: ReversalRequest }> {
  if (request.status !== ReversalStatus.APPROVED) {
    throw new Error('Only approved requests can be executed');
  }

  // Create reversal journal entry
  const reversalEntry = reverseJournalEntry(
    originalTransaction,
    new Date(request.reversalDate),
    userId,
    request.reasonDescription
  );

  // Log the reversal action
  await logTransactionAction(
    originalTransaction.id,
    'reversed',
    userId,
    userName,
    {
      reversalRequestId: request.id,
      reversalReason: request.reversalReason,
      reversalDescription: request.reasonDescription,
    }
  );

  // Update request status
  const updatedRequest: ReversalRequest = {
    ...request,
    status: ReversalStatus.COMPLETED,
    completedAt: new Date(),
  };

  return {
    reversalEntry,
    updatedRequest,
  };
}

/**
 * Cancel reversal request
 */
export function cancelReversalRequest(
  request: ReversalRequest,
  cancelledBy: string,
  cancelledByUserName: string
): ReversalRequest {
  if (request.status === ReversalStatus.COMPLETED) {
    throw new Error('Completed requests cannot be cancelled');
  }

  return {
    ...request,
    status: ReversalStatus.CANCELLED,
    approvedBy: cancelledBy,
    approvedByUserName: cancelledByUserName,
    approvedAt: new Date(),
  };
}

/**
 * Check if reversal requires approval
 */
export function requiresApproval(
  request: ReversalRequest,
  originalTransaction: JournalEntry,
  workflow: ReversalApprovalWorkflow = DEFAULT_APPROVAL_WORKFLOW
): boolean {
  if (!workflow.requireApproval) {
    return false;
  }

  // Auto-approve for small amounts
  const amount = Math.max(originalTransaction.totalDebit, originalTransaction.totalCredit);
  if (amount <= workflow.autoApproveAmountThreshold) {
    return false;
  }

  return true;
}

/**
 * Get reversal statistics
 */
export function getReversalStatistics(requests: ReversalRequest[]): {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  cancelled: number;
  byReason: Record<ReversalReason, number>;
} {
  const stats = {
    total: requests.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    cancelled: 0,
    byReason: {
      [ReversalReason.ERROR]: 0,
      [ReversalReason.DUPLICATE]: 0,
      [ReversalReason.CANCELLATION]: 0,
      [ReversalReason.ADJUSTMENT]: 0,
      [ReversalReason.REFUND]: 0,
      [ReversalReason.OTHER]: 0,
    },
  };

  for (const request of requests) {
    switch (request.status) {
      case ReversalStatus.PENDING:
        stats.pending++;
        break;
      case ReversalStatus.APPROVED:
        stats.approved++;
        break;
      case ReversalStatus.REJECTED:
        stats.rejected++;
        break;
      case ReversalStatus.COMPLETED:
        stats.completed++;
        break;
      case ReversalStatus.CANCELLED:
        stats.cancelled++;
        break;
    }

    stats.byReason[request.reversalReason]++;
  }

  return stats;
}

/**
 * Filter reversal requests by status
 */
export function filterReversalsByStatus(
  requests: ReversalRequest[],
  status: ReversalStatus
): ReversalRequest[] {
  return requests.filter(request => request.status === status);
}

/**
 * Filter reversal requests by date range
 */
export function filterReversalsByDateRange(
  requests: ReversalRequest[],
  startDate: Date,
  endDate: Date
): ReversalRequest[] {
  return requests.filter(request => {
    const date = new Date(request.requestedAt);
    return date >= startDate && date <= endDate;
  });
}

/**
 * Filter reversal requests by user
 */
export function filterReversalsByUser(
  requests: ReversalRequest[],
  userId: string
): ReversalRequest[] {
  return requests.filter(request => request.requestedBy === userId);
}

/**
 * Get reversal reason label
 */
export function getReversalReasonLabel(reason: ReversalReason): string {
  const labels: Record<ReversalReason, string> = {
    [ReversalReason.ERROR]: 'Error Correction',
    [ReversalReason.DUPLICATE]: 'Duplicate Transaction',
    [ReversalReason.CANCELLATION]: 'Cancellation',
    [ReversalReason.ADJUSTMENT]: 'Adjustment',
    [ReversalReason.REFUND]: 'Refund',
    [ReversalReason.OTHER]: 'Other',
  };

  return labels[reason];
}

/**
 * Get reversal status label
 */
export function getReversalStatusLabel(status: ReversalStatus): string {
  const labels: Record<ReversalStatus, string> = {
    [ReversalStatus.PENDING]: 'Pending Approval',
    [ReversalStatus.APPROVED]: 'Approved',
    [ReversalStatus.REJECTED]: 'Rejected',
    [ReversalStatus.COMPLETED]: 'Completed',
    [ReversalStatus.CANCELLED]: 'Cancelled',
  };

  return labels[status];
}

/**
 * Check reversal limit
 */
export function checkReversalLimit(
  userId: string,
  requests: ReversalRequest[],
  workflow: ReversalApprovalWorkflow = DEFAULT_APPROVAL_WORKFLOW
): { withinLimit: boolean; currentCount: number; limit: number } {
  const now = new Date();
  const startDate = new Date();

  switch (workflow.reversalLimitPeriod) {
    case 'day':
      startDate.setDate(now.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
  }

  const userRequests = filterReversalsByUser(requests, userId);
  const periodRequests = filterReversalsByDateRange(userRequests, startDate, now);
  const completedRequests = periodRequests.filter(r => r.status === ReversalStatus.COMPLETED);

  return {
    withinLimit: completedRequests.length < workflow.reversalLimitPerPeriod,
    currentCount: completedRequests.length,
    limit: workflow.reversalLimitPerPeriod,
  };
}

/**
 * Get approval workflow configuration
 */
export function getApprovalWorkflow(): ReversalApprovalWorkflow {
  return { ...DEFAULT_APPROVAL_WORKFLOW };
}

/**
 * Update approval workflow configuration
 */
export function updateApprovalWorkflow(updates: Partial<ReversalApprovalWorkflow>): ReversalApprovalWorkflow {
  return {
    ...DEFAULT_APPROVAL_WORKFLOW,
    ...updates,
  };
}
