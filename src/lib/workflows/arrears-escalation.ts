/**
 * Arrears Escalation System
 * 
 * Implements automated arrears escalation with:
 * - Multi-tier notification system
 * - Configurable escalation rules
 * - Payment reminder automation
 * - Late fee calculation
 * - Legal action triggers
 * - Communication tracking
 */

// Escalation tier
export enum EscalationTier {
  TIER_1 = 'tier_1', // Initial reminder (1-7 days overdue)
  TIER_2 = 'tier_2', // Second reminder (8-14 days overdue)
  TIER_3 = 'tier_3', // Final notice (15-30 days overdue)
  TIER_4 = 'tier_4', // Legal warning (31-60 days overdue)
  TIER_5 = 'tier_5', // Legal action (60+ days overdue)
}

// Escalation action
export enum EscalationAction {
  SMS_REMINDER = 'sms_reminder',
  EMAIL_REMINDER = 'email_reminder',
  PUSH_NOTIFICATION = 'push_notification',
  PHONE_CALL = 'phone_call',
  WHATSAPP_MESSAGE = 'whatsapp_message',
  LATE_FEE = 'late_fee',
  SERVICE_DISRUPTION = 'service_disruption',
  LEGAL_NOTICE = 'legal_notice',
  EVICTION_NOTICE = 'eviction_notice',
}

// Escalation rule
export interface EscalationRule {
  id: string;
  tier: EscalationTier;
  daysOverdue: number;
  actions: EscalationAction[];
  lateFeePercentage?: number;
  lateFeeFixedAmount?: number;
  maxLateFee?: number;
  templateId?: string;
  isActive: boolean;
  priority: number;
}

// Escalation event
export interface EscalationEvent {
  id: string;
  leaseId: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  tier: EscalationTier;
  actions: EscalationAction[];
  amountDue: number;
  amountOverdue: number;
  daysOverdue: number;
  triggeredAt: Date;
  executedAt?: Date;
  status: 'pending' | 'executed' | 'failed' | 'skipped';
  failureReason?: string;
  communicationLog: CommunicationLog[];
}

// Communication log
export interface CommunicationLog {
  id: string;
  type: EscalationAction;
  recipient: string;
  recipientType: 'tenant' | 'guarantor' | 'emergency_contact';
  sentAt: Date;
  status: 'sent' | 'delivered' | 'failed';
  messageId?: string;
  error?: string;
}

// Arrears configuration
export interface ArrearsConfiguration {
  gracePeriodDays: number;
  enableLateFees: boolean;
  enableEscalation: boolean;
  enableLegalActions: boolean;
  maxEscalationTier: EscalationTier;
  customRules: EscalationRule[];
}

// Default escalation rules
const DEFAULT_ESCALATION_RULES: Omit<EscalationRule, 'id'>[] = [
  {
    tier: EscalationTier.TIER_1,
    daysOverdue: 1,
    actions: [EscalationAction.SMS_REMINDER, EscalationAction.EMAIL_REMINDER],
    lateFeePercentage: 2,
    maxLateFee: 500,
    isActive: true,
    priority: 1,
  },
  {
    tier: EscalationTier.TIER_2,
    daysOverdue: 8,
    actions: [EscalationAction.SMS_REMINDER, EscalationAction.EMAIL_REMINDER, EscalationAction.PUSH_NOTIFICATION],
    lateFeePercentage: 5,
    maxLateFee: 1000,
    isActive: true,
    priority: 2,
  },
  {
    tier: EscalationTier.TIER_3,
    daysOverdue: 15,
    actions: [EscalationAction.SMS_REMINDER, EscalationAction.EMAIL_REMINDER, EscalationAction.PHONE_CALL],
    lateFeePercentage: 10,
    maxLateFee: 2000,
    isActive: true,
    priority: 3,
  },
  {
    tier: EscalationTier.TIER_4,
    daysOverdue: 31,
    actions: [EscalationAction.EMAIL_REMINDER, EscalationAction.LEGAL_NOTICE, EscalationAction.WHATSAPP_MESSAGE],
    lateFeePercentage: 15,
    maxLateFee: 5000,
    isActive: true,
    priority: 4,
  },
  {
    tier: EscalationTier.TIER_5,
    daysOverdue: 61,
    actions: [EscalationAction.LEGAL_NOTICE, EscalationAction.EVICTION_NOTICE],
    lateFeePercentage: 20,
    maxLateFee: 10000,
    isActive: true,
    priority: 5,
  },
];

/**
 * Calculate late fee
 */
export function calculateLateFee(
  amountDue: number,
  rule: EscalationRule
): number {
  let lateFee = 0;

  if (rule.lateFeePercentage) {
    lateFee = (amountDue * rule.lateFeePercentage) / 100;
  }

  if (rule.lateFeeFixedAmount) {
    lateFee = Math.max(lateFee, rule.lateFeeFixedAmount);
  }

  if (rule.maxLateFee) {
    lateFee = Math.min(lateFee, rule.maxLateFee);
  }

  return lateFee;
}

/**
 * Determine escalation tier based on days overdue
 */
export function determineEscalationTier(
  daysOverdue: number,
  rules: EscalationRule[]
): EscalationTier | null {
  const applicableRules = rules
    .filter(rule => rule.isActive && daysOverdue >= rule.daysOverdue)
    .sort((a, b) => b.priority - a.priority);

  if (applicableRules.length === 0) {
    return null;
  }

  return applicableRules[0].tier;
}

/**
 * Create escalation event
 */
export function createEscalationEvent(
  leaseId: string,
  tenantId: string,
  propertyId: string,
  unitId: string,
  amountDue: number,
  amountOverdue: number,
  daysOverdue: number,
  tier: EscalationTier,
  actions: EscalationAction[]
): EscalationEvent {
  return {
    id: `escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    leaseId,
    tenantId,
    propertyId,
    unitId,
    tier,
    actions,
    amountDue,
    amountOverdue,
    daysOverdue,
    triggeredAt: new Date(),
    status: 'pending',
    communicationLog: [],
  };
}

/**
 * Execute escalation actions
 */
export async function executeEscalationActions(
  event: EscalationEvent,
  tenantContact: {
    phone: string;
    email: string;
    whatsapp?: string;
  }
): Promise<EscalationEvent> {
  const communicationLog: CommunicationLog[] = [];

  for (const action of event.actions) {
    try {
      const log = await executeAction(action, tenantContact);
      communicationLog.push(log);
    } catch (error) {
      communicationLog.push({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: action,
        recipient: tenantContact.phone,
        recipientType: 'tenant',
        sentAt: new Date(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    ...event,
    executedAt: new Date(),
    status: communicationLog.every(log => log.status === 'sent' || log.status === 'delivered') 
      ? 'executed' 
      : 'failed',
    communicationLog,
  };
}

/**
 * Execute single action
 */
async function executeAction(
  action: EscalationAction,
  contact: { phone: string; email: string; whatsapp?: string }
): Promise<CommunicationLog> {
  const log: CommunicationLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: action,
    recipient: '',
    recipientType: 'tenant',
    sentAt: new Date(),
    status: 'sent',
  };

  switch (action) {
    case EscalationAction.SMS_REMINDER:
      log.recipient = contact.phone;
      // In production, integrate with SMS provider (e.g., Twilio, Africa's Talking)
      console.warn(`Sending SMS to ${contact.phone}: Rent payment reminder`);
      break;

    case EscalationAction.EMAIL_REMINDER:
      log.recipient = contact.email;
      // In production, integrate with email provider (e.g., SendGrid, Resend)
      console.warn(`Sending email to ${contact.email}: Rent payment reminder`);
      break;

    case EscalationAction.PUSH_NOTIFICATION:
      log.recipient = contact.phone;
      // In production, integrate with push notification service
      console.warn(`Sending push notification to ${contact.phone}: Rent payment reminder`);
      break;

    case EscalationAction.PHONE_CALL:
      log.recipient = contact.phone;
      // In production, integrate with call center or auto-dialer
      console.warn(`Initiating call to ${contact.phone}: Rent payment reminder`);
      break;

    case EscalationAction.WHATSAPP_MESSAGE:
      log.recipient = contact.whatsapp || contact.phone;
      // In production, integrate with WhatsApp Business API
      console.warn(`Sending WhatsApp message to ${log.recipient}: Rent payment reminder`);
      break;

    case EscalationAction.LATE_FEE:
      log.recipient = contact.email;
      // Late fee is applied separately
      console.warn(`Applying late fee for tenant`);
      break;

    case EscalationAction.LEGAL_NOTICE:
      log.recipient = contact.email;
      // In production, generate and send legal notice
      console.warn(`Sending legal notice to ${contact.email}`);
      break;

    case EscalationAction.EVICTION_NOTICE:
      log.recipient = contact.email;
      // In production, generate and send eviction notice
      console.warn(`Sending eviction notice to ${contact.email}`);
      break;

    default:
      throw new Error(`Unknown action type: ${action}`);
  }

  return log;
}

/**
 * Check if escalation should trigger
 */
export function shouldTriggerEscalation(
  daysOverdue: number,
  lastEscalationTier: EscalationTier | null,
  configuration: ArrearsConfiguration
): boolean {
  if (!configuration.enableEscalation) {
    return false;
  }

  if (daysOverdue < configuration.gracePeriodDays) {
    return false;
  }

  const currentTier = determineEscalationTier(daysOverdue, configuration.customRules);

  if (!currentTier) {
    return false;
  }

  // Check if we've already escalated to this tier or higher
  if (lastEscalationTier) {
    const tierOrder = [
      EscalationTier.TIER_1,
      EscalationTier.TIER_2,
      EscalationTier.TIER_3,
      EscalationTier.TIER_4,
      EscalationTier.TIER_5,
    ];

    const lastTierIndex = tierOrder.indexOf(lastEscalationTier);
    const currentTierIndex = tierOrder.indexOf(currentTier);

    if (currentTierIndex <= lastTierIndex) {
      return false;
    }
  }

  // Check if current tier exceeds max allowed tier
  const maxTierIndex = [
    EscalationTier.TIER_1,
    EscalationTier.TIER_2,
    EscalationTier.TIER_3,
    EscalationTier.TIER_4,
    EscalationTier.TIER_5,
  ].indexOf(configuration.maxEscalationTier);

  const currentTierIndex = [
    EscalationTier.TIER_1,
    EscalationTier.TIER_2,
    EscalationTier.TIER_3,
    EscalationTier.TIER_4,
    EscalationTier.TIER_5,
  ].indexOf(currentTier);

  if (currentTierIndex > maxTierIndex) {
    return false;
  }

  return true;
}

/**
 * Get default escalation rules
 */
export function getDefaultEscalationRules(): Omit<EscalationRule, 'id'>[] {
  return DEFAULT_ESCALATION_RULES;
}

/**
 * Create custom escalation rule
 */
export function createEscalationRule(
  tier: EscalationTier,
  daysOverdue: number,
  actions: EscalationAction[],
  lateFeePercentage?: number,
  lateFeeFixedAmount?: number,
  maxLateFee?: number,
  templateId?: string
): Omit<EscalationRule, 'id'> {
  return {
    tier,
    daysOverdue,
    actions,
    lateFeePercentage,
    lateFeeFixedAmount,
    maxLateFee,
    templateId,
    isActive: true,
    priority: [EscalationTier.TIER_1, EscalationTier.TIER_2, EscalationTier.TIER_3, EscalationTier.TIER_4, EscalationTier.TIER_5].indexOf(tier) + 1,
  };
}

/**
 * Get default arrears configuration
 */
export function getDefaultArrearsConfiguration(): ArrearsConfiguration {
  return {
    gracePeriodDays: 5,
    enableLateFees: true,
    enableEscalation: true,
    enableLegalActions: true,
    maxEscalationTier: EscalationTier.TIER_4,
    customRules: DEFAULT_ESCALATION_RULES.map(rule => ({
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    })),
  };
}

/**
 * Get escalation tier label
 */
export function getEscalationTierLabel(tier: EscalationTier): string {
  const labels: Record<EscalationTier, string> = {
    [EscalationTier.TIER_1]: 'Initial Reminder',
    [EscalationTier.TIER_2]: 'Second Reminder',
    [EscalationTier.TIER_3]: 'Final Notice',
    [EscalationTier.TIER_4]: 'Legal Warning',
    [EscalationTier.TIER_5]: 'Legal Action',
  };

  return labels[tier];
}

/**
 * Get escalation action label
 */
export function getEscalationActionLabel(action: EscalationAction): string {
  const labels: Record<EscalationAction, string> = {
    [EscalationAction.SMS_REMINDER]: 'SMS Reminder',
    [EscalationAction.EMAIL_REMINDER]: 'Email Reminder',
    [EscalationAction.PUSH_NOTIFICATION]: 'Push Notification',
    [EscalationAction.PHONE_CALL]: 'Phone Call',
    [EscalationAction.WHATSAPP_MESSAGE]: 'WhatsApp Message',
    [EscalationAction.LATE_FEE]: 'Late Fee',
    [EscalationAction.SERVICE_DISRUPTION]: 'Service Disruption',
    [EscalationAction.LEGAL_NOTICE]: 'Legal Notice',
    [EscalationAction.EVICTION_NOTICE]: 'Eviction Notice',
  };

  return labels[action];
}

/**
 * Get escalation statistics
 */
export function getEscalationStatistics(events: EscalationEvent[]): {
  totalEvents: number;
  byTier: Record<EscalationTier, number>;
  executedEvents: number;
  failedEvents: number;
  pendingEvents: number;
  totalAmountOverdue: number;
} {
  const stats = {
    totalEvents: events.length,
    byTier: {
      [EscalationTier.TIER_1]: 0,
      [EscalationTier.TIER_2]: 0,
      [EscalationTier.TIER_3]: 0,
      [EscalationTier.TIER_4]: 0,
      [EscalationTier.TIER_5]: 0,
    },
    executedEvents: 0,
    failedEvents: 0,
    pendingEvents: 0,
    totalAmountOverdue: 0,
  };

  for (const event of events) {
    stats.byTier[event.tier]++;
    stats.totalAmountOverdue += event.amountOverdue;

    switch (event.status) {
      case 'executed':
        stats.executedEvents++;
        break;
      case 'failed':
        stats.failedEvents++;
        break;
      case 'pending':
        stats.pendingEvents++;
        break;
    }
  }

  return stats;
}

/**
 * Filter escalation events by status
 */
export function filterEscalationEventsByStatus(
  events: EscalationEvent[],
  status: 'pending' | 'executed' | 'failed' | 'skipped'
): EscalationEvent[] {
  return events.filter(event => event.status === status);
}

/**
 * Filter escalation events by tier
 */
export function filterEscalationEventsByTier(
  events: EscalationEvent[],
  tier: EscalationTier
): EscalationEvent[] {
  return events.filter(event => event.tier === tier);
}

/**
 * Filter escalation events by date range
 */
export function filterEscalationEventsByDateRange(
  events: EscalationEvent[],
  startDate: Date,
  endDate: Date
): EscalationEvent[] {
  return events.filter(event => {
    const eventDate = new Date(event.triggeredAt);
    return eventDate >= startDate && eventDate <= endDate;
  });
}
