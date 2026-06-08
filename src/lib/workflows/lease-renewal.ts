/**
 * Lease Renewal Workflow System
 * 
 * Implements lease renewal workflows with:
 * - Automated notifications
 * - Multi-level approval chains
 * - Renewal offer generation
 * - Document management
 * - Deadline tracking
 * - Escalation handling
 */

// Renewal status
export enum RenewalStatus {
  PENDING = 'pending',
  NOTIFIED = 'notified',
  OFFER_SENT = 'offer_sent',
  OFFER_ACCEPTED = 'offer_accepted',
  OFFER_DECLINED = 'offer_declined',
  APPROVAL_PENDING = 'approval_pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Renewal offer
export interface RenewalOffer {
  id: string;
  leaseId: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  currentRent: number;
  proposedRent: number;
  rentIncrease: number;
  rentIncreasePercentage: number;
  startDate: Date;
  endDate: Date;
  terms: string;
  specialConditions?: string;
  validUntil: Date;
  status: RenewalStatus;
  createdAt: Date;
  createdBy: string;
}

// Approval chain
export interface ApprovalChain {
  id: string;
  renewalOfferId: string;
  approvers: Approver[];
  currentStep: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

// Approver
export interface Approver {
  id: string;
  userId: string;
  userName: string;
  role: 'manager' | 'landlord' | 'owner';
  step: number;
  status: 'pending' | 'approved' | 'rejected';
  decisionAt?: Date;
  comments?: string;
}

// Renewal notification
export interface RenewalNotification {
  id: string;
  renewalOfferId: string;
  recipientId: string;
  recipientType: 'tenant' | 'manager' | 'landlord';
  type: 'renewal_reminder' | 'offer_sent' | 'offer_accepted' | 'offer_declined' | 'approval_required' | 'renewal_confirmed';
  sentAt: Date;
  status: 'sent' | 'delivered' | 'read';
  channel: 'email' | 'sms' | 'push' | 'whatsapp';
}

// Renewal configuration
export interface RenewalConfiguration {
  notificationDaysBeforeExpiry: number;
  offerValidityDays: number;
  defaultRentIncreasePercentage: number;
  requireApproval: boolean;
  approvalLevels: number;
  autoRenewEnabled: boolean;
  autoRenewDaysBeforeExpiry: number;
}

/**
 * Create renewal offer
 */
export function createRenewalOffer(
  leaseId: string,
  tenantId: string,
  propertyId: string,
  unitId: string,
  currentRent: number,
  startDate: Date,
  endDate: Date,
  rentIncreasePercentage: number,
  terms: string,
  createdBy: string,
  specialConditions?: string
): RenewalOffer {
  const proposedRent = currentRent * (1 + rentIncreasePercentage / 100);
  const rentIncrease = proposedRent - currentRent;
  
  const validUntil = new Date(endDate);
  validUntil.setDate(validUntil.getDate() - 30); // Valid until 30 days before lease ends
  
  return {
    id: `renewal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    leaseId,
    tenantId,
    propertyId,
    unitId,
    currentRent,
    proposedRent,
    rentIncrease,
    rentIncreasePercentage,
    startDate,
    endDate,
    terms,
    specialConditions,
    validUntil,
    status: RenewalStatus.PENDING,
    createdAt: new Date(),
    createdBy,
  };
}

/**
 * Send renewal offer to tenant
 */
export function sendRenewalOffer(offer: RenewalOffer): RenewalOffer {
  if (offer.status !== RenewalStatus.PENDING) {
    throw new Error('Only pending offers can be sent');
  }
  
  return {
    ...offer,
    status: RenewalStatus.OFFER_SENT,
  };
}

/**
 * Accept renewal offer
 */
export function acceptRenewalOffer(offer: RenewalOffer, acceptedBy: string): RenewalOffer {
  if (offer.status !== RenewalStatus.OFFER_SENT) {
    throw new Error('Only sent offers can be accepted');
  }
  
  if (new Date() > offer.validUntil) {
    throw new Error('Offer has expired');
  }
  
  return {
    ...offer,
    status: RenewalStatus.OFFER_ACCEPTED,
  };
}

/**
 * Decline renewal offer
 */
export function declineRenewalOffer(offer: RenewalOffer, reason: string): RenewalOffer {
  if (offer.status !== RenewalStatus.OFFER_SENT) {
    throw new Error('Only sent offers can be declined');
  }
  
  return {
    ...offer,
    status: RenewalStatus.OFFER_DECLINED,
    specialConditions: reason,
  };
}

/**
 * Create approval chain
 */
export function createApprovalChain(
  renewalOfferId: string,
  approvers: Omit<Approver, 'id' | 'status'>[]
): ApprovalChain {
  const approversWithIds: Approver[] = approvers.map((approver, index) => ({
    ...approver,
    id: `approver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'pending',
  }));
  
  return {
    id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    renewalOfferId,
    approvers: approversWithIds,
    currentStep: 0,
    status: 'pending',
    createdAt: new Date(),
  };
}

/**
 * Approve renewal at current step
 */
export function approveRenewal(
  chain: ApprovalChain,
  approverId: string,
  comments?: string
): ApprovalChain {
  const approverIndex = chain.approvers.findIndex(a => a.id === approverId);
  
  if (approverIndex === -1) {
    throw new Error('Approver not found in chain');
  }
  
  if (chain.approvers[approverIndex].step !== chain.currentStep) {
    throw new Error('Not your turn to approve');
  }
  
  const updatedApprovers = [...chain.approvers];
  updatedApprovers[approverIndex] = {
    ...updatedApprovers[approverIndex],
    status: 'approved',
    decisionAt: new Date(),
    comments,
  };
  
  const nextStep = chain.currentStep + 1;
  const isLastStep = nextStep >= chain.approvers.length;
  
  return {
    ...chain,
    approvers: updatedApprovers,
    currentStep: nextStep,
    status: isLastStep ? 'approved' : 'pending',
  };
}

/**
 * Reject renewal at current step
 */
export function rejectRenewal(
  chain: ApprovalChain,
  approverId: string,
  reason: string
): ApprovalChain {
  const approverIndex = chain.approvers.findIndex(a => a.id === approverId);
  
  if (approverIndex === -1) {
    throw new Error('Approver not found in chain');
  }
  
  if (chain.approvers[approverIndex].step !== chain.currentStep) {
    throw new Error('Not your turn to reject');
  }
  
  const updatedApprovers = [...chain.approvers];
  updatedApprovers[approverIndex] = {
    ...updatedApprovers[approverIndex],
    status: 'rejected',
    decisionAt: new Date(),
    comments: reason,
  };
  
  return {
    ...chain,
    approvers: updatedApprovers,
    status: 'rejected',
  };
}

/**
 * Send renewal notification
 */
export function sendRenewalNotification(
  renewalOfferId: string,
  recipientId: string,
  recipientType: 'tenant' | 'manager' | 'landlord',
  type: 'renewal_reminder' | 'offer_sent' | 'offer_accepted' | 'offer_declined' | 'approval_required' | 'renewal_confirmed',
  channel: 'email' | 'sms' | 'push' | 'whatsapp'
): RenewalNotification {
  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    renewalOfferId,
    recipientId,
    recipientType,
    type,
    sentAt: new Date(),
    status: 'sent',
    channel,
  };
}

/**
 * Check if renewal notification should be sent
 */
export function shouldSendRenewalNotification(
  leaseEndDate: Date,
  configuration: RenewalConfiguration
): boolean {
  const today = new Date();
  const notificationDate = new Date(leaseEndDate);
  notificationDate.setDate(notificationDate.getDate() - configuration.notificationDaysBeforeExpiry);
  
  return today >= notificationDate;
}

/**
 * Get default renewal configuration
 */
export function getDefaultRenewalConfiguration(): RenewalConfiguration {
  return {
    notificationDaysBeforeExpiry: 60,
    offerValidityDays: 30,
    defaultRentIncreasePercentage: 5,
    requireApproval: true,
    approvalLevels: 2,
    autoRenewEnabled: false,
    autoRenewDaysBeforeExpiry: 30,
  };
}

/**
 * Calculate renewal statistics
 */
export function calculateRenewalStatistics(
  offers: RenewalOffer[]
): {
  totalOffers: number;
  accepted: number;
  declined: number;
  pending: number;
  completed: number;
  acceptanceRate: number;
  averageRentIncrease: number;
  totalRentIncrease: number;
} {
  const accepted = offers.filter(o => o.status === RenewalStatus.OFFER_ACCEPTED || o.status === RenewalStatus.APPROVED || o.status === RenewalStatus.COMPLETED).length;
  const declined = offers.filter(o => o.status === RenewalStatus.OFFER_DECLINED || o.status === RenewalStatus.REJECTED).length;
  const pending = offers.filter(o => o.status === RenewalStatus.PENDING || o.status === RenewalStatus.OFFER_SENT || o.status === RenewalStatus.APPROVAL_PENDING).length;
  const completed = offers.filter(o => o.status === RenewalStatus.COMPLETED).length;
  
  const totalRentIncrease = offers.reduce((sum, o) => sum + o.rentIncrease, 0);
  const averageRentIncrease = offers.length > 0 ? totalRentIncrease / offers.length : 0;
  const acceptanceRate = offers.length > 0 ? (accepted / offers.length) * 100 : 0;
  
  return {
    totalOffers: offers.length,
    accepted,
    declined,
    pending,
    completed,
    acceptanceRate,
    averageRentIncrease,
    totalRentIncrease,
  };
}

/**
 * Filter renewal offers by status
 */
export function filterRenewalOffersByStatus(
  offers: RenewalOffer[],
  status: RenewalStatus
): RenewalOffer[] {
  return offers.filter(offer => offer.status === status);
}

/**
 * Filter renewal offers by date range
 */
export function filterRenewalOffersByDateRange(
  offers: RenewalOffer[],
  startDate: Date,
  endDate: Date
): RenewalOffer[] {
  return offers.filter(offer => {
    const offerDate = new Date(offer.createdAt);
    return offerDate >= startDate && offerDate <= endDate;
  });
}

/**
 * Get renewal status label
 */
export function getRenewalStatusLabel(status: RenewalStatus): string {
  const labels: Record<RenewalStatus, string> = {
    [RenewalStatus.PENDING]: 'Pending',
    [RenewalStatus.NOTIFIED]: 'Notified',
    [RenewalStatus.OFFER_SENT]: 'Offer Sent',
    [RenewalStatus.OFFER_ACCEPTED]: 'Offer Accepted',
    [RenewalStatus.OFFER_DECLINED]: 'Offer Declined',
    [RenewalStatus.APPROVAL_PENDING]: 'Approval Pending',
    [RenewalStatus.APPROVED]: 'Approved',
    [RenewalStatus.REJECTED]: 'Rejected',
    [RenewalStatus.COMPLETED]: 'Completed',
    [RenewalStatus.CANCELLED]: 'Cancelled',
  };

  return labels[status];
}

/**
 * Escalate renewal offer
 */
export function escalateRenewalOffer(offer: RenewalOffer): RenewalOffer {
  if (offer.status !== RenewalStatus.OFFER_SENT) {
    throw new Error('Only sent offers can be escalated');
  }
  
  // Send to higher authority or escalate to legal
  return {
    ...offer,
    status: RenewalStatus.APPROVAL_PENDING,
  };
}

/**
 * Complete renewal
 */
export function completeRenewal(offer: RenewalOffer): RenewalOffer {
  if (offer.status !== RenewalStatus.APPROVED) {
    throw new Error('Only approved offers can be completed');
  }
  
  return {
    ...offer,
    status: RenewalStatus.COMPLETED,
  };
}

/**
 * Cancel renewal
 */
export function cancelRenewal(offer: RenewalOffer): RenewalOffer {
  return {
    ...offer,
    status: RenewalStatus.CANCELLED,
  };
}

/**
 * Get pending approvals
 */
export function getPendingApprovals(chains: ApprovalChain[]): Array<{
  chainId: string;
  renewalOfferId: string;
  currentApprover: Approver;
}> {
  const pending: Array<{
    chainId: string;
    renewalOfferId: string;
    currentApprover: Approver;
  }> = [];
  
  for (const chain of chains) {
    if (chain.status === 'pending' && chain.currentStep < chain.approvers.length) {
      const currentApprover = chain.approvers[chain.currentStep];
      pending.push({
        chainId: chain.id,
        renewalOfferId: chain.renewalOfferId,
        currentApprover,
      });
    }
  }
  
  return pending;
}

/**
 * Check if offer is expired
 */
export function isOfferExpired(offer: RenewalOffer): boolean {
  return new Date() > offer.validUntil;
}

/**
 * Get renewal offer summary
 */
export function getRenewalOfferSummary(offer: RenewalOffer): {
  currentRent: number;
  proposedRent: number;
  rentIncrease: number;
  rentIncreasePercentage: number;
  termMonths: number;
  validUntil: Date;
  isExpired: boolean;
} {
  const termMonths = Math.ceil(
    (offer.endDate.getTime() - offer.startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
  );
  
  return {
    currentRent: offer.currentRent,
    proposedRent: offer.proposedRent,
    rentIncrease: offer.rentIncrease,
    rentIncreasePercentage: offer.rentIncreasePercentage,
    termMonths,
    validUntil: offer.validUntil,
    isExpired: isOfferExpired(offer),
  };
}
