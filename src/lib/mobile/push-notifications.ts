/**
 * Push Notifications Service
 * 
 * Handles push notifications for mobile:
 * - FCM (Firebase Cloud Messaging) for Android
 * - APNs (Apple Push Notification Service) for iOS
 * - Permission handling
 * - Token registration
 * - Notification handling
 */

import { PushNotifications, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { CapacitorHttp } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

// Notification types
export enum NotificationType {
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  LEASE_REMINDER = 'lease_reminder',
  MAINTENANCE_UPDATE = 'maintenance_update',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  SECURITY_ALERT = 'security_alert',
}

// Notification data interface
export interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  imageUrl?: string;
  actionUrl?: string;
}

/**
 * Initialize push notifications
 */
export async function initializePushNotifications(): Promise<void> {
  // Request permission
  const result = await PushNotifications.requestPermissions();
  
  if (result.receive === 'granted') {
    // Register for push notifications
    await PushNotifications.register();
    
    // Set up listeners
    setupPushNotificationListeners();
    
    console.warn('Push notifications initialized');
  } else {
    console.warn('Push notifications permission denied');
  }
}

/**
 * Set up push notification listeners
 */
function setupPushNotificationListeners(): void {
  // Listen for registration
  PushNotifications.addListener('registration', async (token) => {
    console.warn('Push notification token:', token.value);
    
    // Send token to server
    await registerPushToken(token.value);
  });

  // Listen for registration error
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Push notification registration error:', error.error);
  });

  // Listen for push notification received
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.warn('Push notification received:', notification);
    
    // Show local notification if app is in foreground
    showLocalNotification(notification);
  });

  // Listen for push notification action performed
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.warn('Push notification action performed:', notification);
    handleNotificationAction(notification);
  });
}

/**
 * Register push token with server
 */
async function registerPushToken(token: string): Promise<void> {
  try {
    await CapacitorHttp.post({
      url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-push-token`,
      data: {
        token,
        platform: Capacitor.getPlatform(),
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('supabase-token')}`,
      },
    });
    
    console.warn('Push token registered successfully');
  } catch (error) {
    console.error('Failed to register push token:', error);
  }
}

/**
 * Show local notification
 */
async function showLocalNotification(notification: PushNotificationSchema): Promise<void> {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: notification.title || 'RentFlow',
          body: notification.body || '',
          data: notification.data,
          schedule: { at: new Date() },
        },
      ],
    });
  } catch (error) {
    console.error('Failed to show local notification:', error);
  }
}

/**
 * Handle notification action
 */
function handleNotificationAction(notification: ActionPerformed): void {
  const { actionId, notification: notif } = notification;
  
  console.warn('Notification action:', actionId);
  console.warn('Notification data:', notif.data);
  
  // Handle different actions based on notification type
  const data = notif.data as Record<string, unknown>;
  
  switch (data?.type) {
    case NotificationType.PAYMENT_RECEIVED:
      // Navigate to payment details
      navigateToPayment(data.paymentId as string);
      break;
    
    case NotificationType.PAYMENT_FAILED:
      // Navigate to payment retry
      navigateToPaymentRetry(data.paymentId as string);
      break;
    
    case NotificationType.LEASE_REMINDER:
      // Navigate to lease details
      navigateToLease(data.leaseId as string);
      break;
    
    case NotificationType.MAINTENANCE_UPDATE:
      // Navigate to maintenance request
      navigateToMaintenance(data.maintenanceId as string);
      break;
    
    default:
      // Navigate to home or specific URL
      if (data?.actionUrl) {
        window.location.href = data.actionUrl as string;
      }
  }
}

/**
 * Navigate to payment details
 */
function navigateToPayment(paymentId: string): void {
  // Implement navigation logic
  console.warn('Navigate to payment:', paymentId);
}

/**
 * Navigate to payment retry
 */
function navigateToPaymentRetry(paymentId: string): void {
  // Implement navigation logic
  console.warn('Navigate to payment retry:', paymentId);
}

/**
 * Navigate to lease details
 */
function navigateToLease(leaseId: string): void {
  // Implement navigation logic
  console.warn('Navigate to lease:', leaseId);
}

/**
 * Navigate to maintenance request
 */
function navigateToMaintenance(maintenanceId: string): void {
  // Implement navigation logic
  console.warn('Navigate to maintenance:', maintenanceId);
}

/**
 * Send local notification
 */
export async function sendLocalNotification(data: NotificationData): Promise<void> {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: data.title,
          body: data.body,
          data: data.data,
          schedule: { at: new Date() },
          largeBody: data.body,
          summaryText: data.title,
        },
      ],
    });
  } catch (error) {
    console.error('Failed to send local notification:', error);
  }
}

/**
 * Schedule notification
 */
export async function scheduleNotification(
  data: NotificationData,
  date: Date
): Promise<void> {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: data.title,
          body: data.body,
          data: data.data,
          schedule: { at: date },
          largeBody: data.body,
          summaryText: data.title,
        },
      ],
    });
  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
}

/**
 * Cancel notification
 */
export async function cancelNotification(notificationId: number): Promise<void> {
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }],
    });
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await LocalNotifications.cancel();
  } catch (error) {
    console.error('Failed to cancel all notifications:', error);
  }
}

/**
 * Get pending notifications
 */
export async function getPendingNotifications(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    console.warn('Pending notifications:', pending);
    return pending;
  } catch (error) {
    console.error('Failed to get pending notifications:', error);
  }
}

/**
 * Check notification permissions
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  const result = await PushNotifications.checkPermissions();
  return result.receive === 'granted';
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const result = await PushNotifications.requestPermissions();
  return result.receive === 'granted';
}

/**
 * Unregister push notifications
 */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    await PushNotifications.unregister();
    console.warn('Push notifications unregistered');
  } catch (error) {
    console.error('Failed to unregister push notifications:', error);
  }
}
