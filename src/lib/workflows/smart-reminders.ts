/**
 * Smart Reminders System
 * 
 * Implements context-aware reminders with:
 * - Intelligent scheduling
 * - Priority-based delivery
 * - Multi-channel notifications
 * - User preference learning
 * - Time zone awareness
 * - Contextual timing optimization
 */

// Reminder type
export enum ReminderType {
  RENT_DUE = 'rent_due',
  RENT_OVERDUE = 'rent_overdue',
  LEASE_EXPIRING = 'lease_expiring',
  MAINTENANCE_SCHEDULED = 'maintenance_scheduled',
  PAYMENT_RECEIVED = 'payment_received',
  DOCUMENT_REQUIRED = 'document_required',
  INSPECTION_SCHEDULED = 'inspection_scheduled',
  CONTRACT_RENEWAL = 'contract_renewal',
  GENERAL = 'general',
}

// Reminder priority
export enum ReminderPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Reminder channel
export enum ReminderChannel {
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
  WHATSAPP = 'whatsapp',
  IN_APP = 'in_app',
}

// Reminder status
export enum ReminderStatus {
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// User preference
export interface UserPreference {
  userId: string;
  preferredChannels: ReminderChannel[];
  preferredTime: string; // HH:MM format
  timeZone: string;
  quietHours: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  frequencyLimits: {
    [key in ReminderType]?: number; // Max reminders per day
  };
  language: string;
}

// Reminder
export interface Reminder {
  id: string;
  type: ReminderType;
  priority: ReminderPriority;
  title: string;
  message: string;
  scheduledFor: Date;
  channels: ReminderChannel[];
  recipientId: string;
  recipientType: 'tenant' | 'landlord' | 'manager' | 'contractor';
  context?: Record<string, unknown>;
  status: ReminderStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  attempts: number;
  maxAttempts: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  createdBy: string;
}

// Reminder schedule
export interface ReminderSchedule {
  id: string;
  type: ReminderType;
  triggerCondition: string;
  leadTimeDays: number;
  repeatInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  channels: ReminderChannel[];
  templateId?: string;
  priority: ReminderPriority;
  isActive: boolean;
}

// Reminder analytics
export interface ReminderAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  deliveryRate: number;
  readRate: number;
  byChannel: Record<ReminderChannel, {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;
  byType: Record<ReminderType, {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;
  byPriority: Record<ReminderPriority, {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;
}

/**
 * Calculate optimal send time based on user preferences
 */
export function calculateOptimalSendTime(
  baseDate: Date,
  preference: UserPreference
): Date {
  const userTime = convertToTimeZone(baseDate, preference.timeZone);
  const [preferredHour, preferredMinute] = preference.preferredTime.split(':').map(Number);
  
  const optimalTime = new Date(userTime);
  optimalTime.setHours(preferredHour, preferredMinute, 0, 0);
  
  // Check if optimal time falls within quiet hours
  const [quietStartHour, quietStartMinute] = preference.quietHours.start.split(':').map(Number);
  const [quietEndHour, quietEndMinute] = preference.quietHours.end.split(':').map(Number);
  
  const quietStart = new Date(userTime);
  quietStart.setHours(quietStartHour, quietStartMinute, 0, 0);
  
  const quietEnd = new Date(userTime);
  quietEnd.setHours(quietEndHour, quietEndMinute, 0, 0);
  
  if (optimalTime >= quietStart && optimalTime <= quietEnd) {
    // Move to after quiet hours
    optimalTime.setHours(quietEndHour, quietEndMinute + 30, 0, 0);
  }
  
  return convertFromTimeZone(optimalTime, preference.timeZone);
}

/**
 * Convert date to user time zone
 */
function convertToTimeZone(date: Date, timeZone: string): Date {
  return new Date(date.toLocaleString('en-US', { timeZone }));
}

/**
 * Convert date from user time zone
 */
function convertFromTimeZone(date: Date, timeZone: string): Date {
  return new Date(date.toLocaleString('en-US', { timeZone }));
}

/**
 * Determine reminder priority based on context
 */
export function determineReminderPriority(
  type: ReminderType,
  daysUntilDue?: number,
  _amount?: number
): ReminderPriority {
  switch (type) {
    case ReminderType.RENT_OVERDUE:
      if (daysUntilDue && daysUntilDue > 30) return ReminderPriority.HIGH;
      if (daysUntilDue && daysUntilDue > 14) return ReminderPriority.MEDIUM;
      return ReminderPriority.URGENT;
    
    case ReminderType.RENT_DUE:
      if (daysUntilDue && daysUntilDue <= 1) return ReminderPriority.URGENT;
      if (daysUntilDue && daysUntilDue <= 3) return ReminderPriority.HIGH;
      if (daysUntilDue && daysUntilDue <= 7) return ReminderPriority.MEDIUM;
      return ReminderPriority.LOW;
    
    case ReminderType.LEASE_EXPIRING:
      if (daysUntilDue && daysUntilDue <= 7) return ReminderPriority.URGENT;
      if (daysUntilDue && daysUntilDue <= 30) return ReminderPriority.HIGH;
      return ReminderPriority.MEDIUM;
    
    case ReminderType.MAINTENANCE_SCHEDULED:
      if (daysUntilDue && daysUntilDue <= 1) return ReminderPriority.HIGH;
      return ReminderPriority.MEDIUM;
    
    case ReminderType.PAYMENT_RECEIVED:
      return ReminderPriority.LOW;
    
    case ReminderType.DOCUMENT_REQUIRED:
      return ReminderPriority.HIGH;
    
    case ReminderType.INSPECTION_SCHEDULED:
      if (daysUntilDue && daysUntilDue <= 1) return ReminderPriority.HIGH;
      return ReminderPriority.MEDIUM;
    
    case ReminderType.CONTRACT_RENEWAL:
      if (daysUntilDue && daysUntilDue <= 14) return ReminderPriority.HIGH;
      return ReminderPriority.MEDIUM;
    
    default:
      return ReminderPriority.MEDIUM;
  }
}

/**
 * Select optimal channels based on user preferences and priority
 */
export function selectOptimalChannels(
  userPreference: UserPreference,
  priority: ReminderPriority
): ReminderChannel[] {
  const channels = [...userPreference.preferredChannels];
  
  // Add additional channels based on priority
  if (priority === ReminderPriority.URGENT) {
    if (!channels.includes(ReminderChannel.SMS)) channels.push(ReminderChannel.SMS);
    if (!channels.includes(ReminderChannel.WHATSAPP)) channels.push(ReminderChannel.WHATSAPP);
    if (!channels.includes(ReminderChannel.PUSH)) channels.push(ReminderChannel.PUSH);
  } else if (priority === ReminderPriority.HIGH) {
    if (!channels.includes(ReminderChannel.SMS)) channels.push(ReminderChannel.SMS);
    if (!channels.includes(ReminderChannel.EMAIL)) channels.push(ReminderChannel.EMAIL);
  }
  
  return channels;
}

/**
 * Create reminder
 */
export function createReminder(
  type: ReminderType,
  title: string,
  message: string,
  scheduledFor: Date,
  recipientId: string,
  recipientType: 'tenant' | 'landlord' | 'manager' | 'contractor',
  priority: ReminderPriority,
  channels: ReminderChannel[],
  createdBy: string,
  context?: Record<string, unknown>
): Reminder {
  return {
    id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    priority,
    title,
    message,
    scheduledFor,
    channels,
    recipientId,
    recipientType,
    context,
    status: ReminderStatus.SCHEDULED,
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date(),
    createdBy,
  };
}

/**
 * Send reminder
 */
export async function sendReminder(
  reminder: Reminder,
  recipientContact: {
    phone: string;
    email: string;
    whatsapp?: string;
  }
): Promise<Reminder> {
  const now = new Date();
  
  try {
    for (const channel of reminder.channels) {
      await sendReminderViaChannel(channel, reminder, recipientContact);
    }
    
    return {
      ...reminder,
      status: ReminderStatus.SENT,
      sentAt: now,
      attempts: reminder.attempts + 1,
    };
  } catch (error) {
    if (reminder.attempts >= reminder.maxAttempts) {
      return {
        ...reminder,
        status: ReminderStatus.FAILED,
        attempts: reminder.attempts + 1,
      };
    }
    
    return {
      ...reminder,
      attempts: reminder.attempts + 1,
    };
  }
}

/**
 * Send reminder via specific channel
 */
async function sendReminderViaChannel(
  channel: ReminderChannel,
  reminder: Reminder,
  contact: { phone: string; email: string; whatsapp?: string }
): Promise<void> {
  switch (channel) {
    case ReminderChannel.SMS:
      console.warn(`Sending SMS to ${contact.phone}: ${reminder.title}`);
      // Integrate with SMS provider
      break;
    
    case ReminderChannel.EMAIL:
      console.warn(`Sending email to ${contact.email}: ${reminder.title}`);
      // Integrate with email provider
      break;
    
    case ReminderChannel.PUSH:
      console.warn(`Sending push notification to ${reminder.recipientId}: ${reminder.title}`);
      // Integrate with push notification service
      break;
    
    case ReminderChannel.WHATSAPP: {
      const whatsappNumber = contact.whatsapp || contact.phone;
      console.warn(`Sending WhatsApp message to ${whatsappNumber}: ${reminder.title}`);
      // Integrate with WhatsApp Business API
      break;
    }
    
    case ReminderChannel.IN_APP:
      console.warn(`Creating in-app notification for ${reminder.recipientId}: ${reminder.title}`);
      // Store in-app notification
      break;
  }
}

/**
 * Mark reminder as delivered
 */
export function markReminderAsDelivered(reminder: Reminder): Reminder {
  return {
    ...reminder,
    status: ReminderStatus.DELIVERED,
    deliveredAt: new Date(),
  };
}

/**
 * Mark reminder as read
 */
export function markReminderAsRead(reminder: Reminder): Reminder {
  return {
    ...reminder,
    status: ReminderStatus.READ,
    readAt: new Date(),
  };
}

/**
 * Cancel reminder
 */
export function cancelReminder(reminder: Reminder): Reminder {
  return {
    ...reminder,
    status: ReminderStatus.CANCELLED,
  };
}

/**
 * Check if reminder should be sent now
 */
export function shouldSendReminderNow(reminder: Reminder): boolean {
  if (reminder.status !== ReminderStatus.SCHEDULED) {
    return false;
  }
  
  const now = new Date();
  const scheduledTime = new Date(reminder.scheduledFor);
  
  return now >= scheduledTime;
}

/**
 * Get default user preferences
 */
export function getDefaultUserPreferences(userId: string): UserPreference {
  return {
    userId,
    preferredChannels: [ReminderChannel.EMAIL, ReminderChannel.SMS],
    preferredTime: '09:00',
    timeZone: 'Africa/Nairobi',
    quietHours: {
      start: '22:00',
      end: '07:00',
    },
    frequencyLimits: {
      [ReminderType.RENT_DUE]: 2,
      [ReminderType.RENT_OVERDUE]: 1,
      [ReminderType.GENERAL]: 5,
    },
    language: 'en',
  };
}

/**
 * Create reminder schedule
 */
export function createReminderSchedule(
  type: ReminderType,
  triggerCondition: string,
  leadTimeDays: number,
  channels: ReminderChannel[],
  priority: ReminderPriority,
  repeatInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly',
  templateId?: string
): ReminderSchedule {
  return {
    id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    triggerCondition,
    leadTimeDays,
    repeatInterval,
    channels,
    templateId,
    priority,
    isActive: true,
  };
}

/**
 * Calculate reminder analytics
 */
export function calculateReminderAnalytics(reminders: Reminder[]): ReminderAnalytics {
  const analytics: ReminderAnalytics = {
    totalSent: 0,
    totalDelivered: 0,
    totalRead: 0,
    totalFailed: 0,
    deliveryRate: 0,
    readRate: 0,
    byChannel: {
      [ReminderChannel.SMS]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderChannel.EMAIL]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderChannel.PUSH]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderChannel.WHATSAPP]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderChannel.IN_APP]: { sent: 0, delivered: 0, read: 0, failed: 0 },
    },
    byType: {
      [ReminderType.RENT_DUE]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderType.RENT_OVERDUE]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderType.LEASE_EXPIRING]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderType.MAINTENANCE_SCHEDULED]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderType.PAYMENT_RECEIVED]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderType.DOCUMENT_REQUIRED]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderType.INSPECTION_SCHEDULED]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderType.CONTRACT_RENEWAL]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderType.GENERAL]: { sent: 0, delivered: 0, read: 0, failed: 0 },
    },
    byPriority: {
      [ReminderPriority.LOW]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderPriority.MEDIUM]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderPriority.HIGH]: { sent: 0, delivered: 0, read: 0, failed: 0 },
      [ReminderPriority.URGENT]: { sent: 0, delivered: 0, read: 0, failed: 0 },
    },
  };

  for (const reminder of reminders) {
    if (reminder.status === ReminderStatus.SENT || reminder.status === ReminderStatus.DELIVERED || reminder.status === ReminderStatus.READ) {
      analytics.totalSent++;
      
      for (const channel of reminder.channels) {
        analytics.byChannel[channel].sent++;
      }
      
      analytics.byType[reminder.type].sent++;
      analytics.byPriority[reminder.priority].sent++;
    }

    if (reminder.status === ReminderStatus.DELIVERED || reminder.status === ReminderStatus.READ) {
      analytics.totalDelivered++;
      
      for (const channel of reminder.channels) {
        analytics.byChannel[channel].delivered++;
      }
      
      analytics.byType[reminder.type].delivered++;
      analytics.byPriority[reminder.priority].delivered++;
    }

    if (reminder.status === ReminderStatus.READ) {
      analytics.totalRead++;
      
      for (const channel of reminder.channels) {
        analytics.byChannel[channel].read++;
      }
      
      analytics.byType[reminder.type].read++;
      analytics.byPriority[reminder.priority].read++;
    }

    if (reminder.status === ReminderStatus.FAILED) {
      analytics.totalFailed++;
      
      for (const channel of reminder.channels) {
        analytics.byChannel[channel].failed++;
      }
      
      analytics.byType[reminder.type].failed++;
      analytics.byPriority[reminder.priority].failed++;
    }
  }

  analytics.deliveryRate = analytics.totalSent > 0 ? (analytics.totalDelivered / analytics.totalSent) * 100 : 0;
  analytics.readRate = analytics.totalSent > 0 ? (analytics.totalRead / analytics.totalSent) * 100 : 0;

  return analytics;
}

/**
 * Get reminder type label
 */
export function getReminderTypeLabel(type: ReminderType): string {
  const labels: Record<ReminderType, string> = {
    [ReminderType.RENT_DUE]: 'Rent Due',
    [ReminderType.RENT_OVERDUE]: 'Rent Overdue',
    [ReminderType.LEASE_EXPIRING]: 'Lease Expiring',
    [ReminderType.MAINTENANCE_SCHEDULED]: 'Maintenance Scheduled',
    [ReminderType.PAYMENT_RECEIVED]: 'Payment Received',
    [ReminderType.DOCUMENT_REQUIRED]: 'Document Required',
    [ReminderType.INSPECTION_SCHEDULED]: 'Inspection Scheduled',
    [ReminderType.CONTRACT_RENEWAL]: 'Contract Renewal',
    [ReminderType.GENERAL]: 'General',
  };

  return labels[type];
}

/**
 * Get reminder priority label
 */
export function getReminderPriorityLabel(priority: ReminderPriority): string {
  const labels: Record<ReminderPriority, string> = {
    [ReminderPriority.LOW]: 'Low',
    [ReminderPriority.MEDIUM]: 'Medium',
    [ReminderPriority.HIGH]: 'High',
    [ReminderPriority.URGENT]: 'Urgent',
  };

  return labels[priority];
}
