/**
 * Webhook Alert System
 * 
 * Provides webhook integration for sending alerts to external services:
 * - Payment failure alerts
 * - Suspicious login alerts
 * - Callback failure alerts
 * - Database anomaly alerts
 */

interface WebhookPayload {
  alert_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  data: Record<string, unknown>;
}

interface WebhookConfig {
  url: string;
  secret?: string;
  enabled: boolean;
}

// Webhook configurations (should be stored in environment variables or database)
const WEBHOOK_CONFIGS: Record<string, WebhookConfig> = {
  payment_failures: {
    url: import.meta.env.VITE_WEBHOOK_PAYMENT_FAILURES || '',
    secret: import.meta.env.VITE_WEBHOOK_SECRET,
    enabled: !!import.meta.env.VITE_WEBHOOK_PAYMENT_FAILURES,
  },
  security_alerts: {
    url: import.meta.env.VITE_WEBHOOK_SECURITY_ALERTS || '',
    secret: import.meta.env.VITE_WEBHOOK_SECRET,
    enabled: !!import.meta.env.VITE_WEBHOOK_SECURITY_ALERTS,
  },
  callback_failures: {
    url: import.meta.env.VITE_WEBHOOK_CALLBACK_FAILURES || '',
    secret: import.meta.env.VITE_WEBHOOK_SECRET,
    enabled: !!import.meta.env.VITE_WEBHOOK_CALLBACK_FAILURES,
  },
  database_anomalies: {
    url: import.meta.env.VITE_WEBHOOK_DATABASE_ANOMALIES || '',
    secret: import.meta.env.VITE_WEBHOOK_SECRET,
    enabled: !!import.meta.env.VITE_WEBHOOK_DATABASE_ANOMALIES,
  },
};

/**
 * Send webhook alert
 */
async function sendWebhook(
  webhookType: string,
  payload: WebhookPayload
): Promise<boolean> {
  const config = WEBHOOK_CONFIGS[webhookType];
  if (!config || !config.enabled || !config.url) {
    console.warn(`Webhook ${webhookType} not configured or disabled`);
    return false;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.secret) {
      headers['X-Webhook-Secret'] = config.secret;
    }

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Webhook ${webhookType} failed: ${response.status}`);
      return false;
    }

    console.warn(`Webhook ${webhookType} sent successfully`);
    return true;
  } catch (error) {
    console.error(`Webhook ${webhookType} error:`, error);
    return false;
  }
}

/**
 * Send payment failure alert
 */
export async function alertPaymentFailure(
  paymentId: string,
  amount: number,
  method: string,
  error: string,
  tenantId?: string,
  propertyId?: string
): Promise<boolean> {
  const payload: WebhookPayload = {
    alert_type: 'payment_failure',
    severity: 'critical',
    timestamp: new Date().toISOString(),
    data: {
      payment_id: paymentId,
      amount,
      payment_method: method,
      error,
      tenant_id: tenantId,
      property_id: propertyId,
    },
  };

  // Send webhook
  const webhookSent = await sendWebhook('payment_failures', payload);

  // Track in Sentry
  const { trackPaymentFailure } = await import('@/shared/lib/sentry');
  trackPaymentFailure(paymentId, amount, method, error);

  return webhookSent;
}

/**
 * Send suspicious login alert
 */
export async function alertSuspiciousLogin(
  userId: string,
  email: string,
  ip: string,
  userAgent: string,
  reason: string,
  location?: string
): Promise<boolean> {
  const payload: WebhookPayload = {
    alert_type: 'suspicious_login',
    severity: 'warning',
    timestamp: new Date().toISOString(),
    data: {
      user_id: userId,
      email,
      ip_address: ip,
      user_agent: userAgent,
      reason,
      location,
    },
  };

  // Send webhook
  const webhookSent = await sendWebhook('security_alerts', payload);

  // Track in Sentry
  const { trackSuspiciousLogin } = await import('@/shared/lib/sentry');
  trackSuspiciousLogin(userId, ip, userAgent, reason);

  return webhookSent;
}

/**
 * Send callback failure alert
 */
export async function alertCallbackFailure(
  provider: string,
  transactionId: string,
  error: string,
  retryCount: number,
  maxRetries: number = 3
): Promise<boolean> {
  const payload: WebhookPayload = {
    alert_type: 'callback_failure',
    severity: retryCount >= maxRetries ? 'critical' : 'warning',
    timestamp: new Date().toISOString(),
    data: {
      provider,
      transaction_id: transactionId,
      error,
      retry_count: retryCount,
      max_retries: maxRetries,
    },
  };

  // Send webhook
  const webhookSent = await sendWebhook('callback_failures', payload);

  // Track in Sentry
  const { trackCallbackFailure } = await import('@/shared/lib/sentry');
  trackCallbackFailure(provider, transactionId, error, retryCount);

  return webhookSent;
}

/**
 * Send database anomaly alert
 */
export async function alertDatabaseAnomaly(
  queryType: string,
  duration: number,
  threshold: number,
  query?: string,
  table?: string
): Promise<boolean> {
  const payload: WebhookPayload = {
    alert_type: 'database_anomaly',
    severity: duration > threshold * 2 ? 'critical' : 'warning',
    timestamp: new Date().toISOString(),
    data: {
      query_type: queryType,
      duration_ms: duration,
      threshold_ms: threshold,
      query: query?.substring(0, 500), // Truncate long queries
      table,
    },
  };

  // Send webhook
  const webhookSent = await sendWebhook('database_anomalies', payload);

  // Track in Sentry
  const { trackDatabaseAnomaly } = await import('@/shared/lib/sentry');
  trackDatabaseAnomaly(queryType, duration, threshold);

  return webhookSent;
}

/**
 * Send queue failure alert (if using message queues)
 */
export async function alertQueueFailure(
  queueName: string,
  error: string,
  failedMessageId: string,
  retryCount: number
): Promise<boolean> {
  const payload: WebhookPayload = {
    alert_type: 'queue_failure',
    severity: 'error',
    timestamp: new Date().toISOString(),
    data: {
      queue_name: queueName,
      error,
      failed_message_id: failedMessageId,
      retry_count: retryCount,
    },
  };

  // Send webhook (reusing callback_failures for now)
  const webhookSent = await sendWebhook('callback_failures', payload);

  // Track in Sentry
  const { captureMessage } = await import('@/shared/lib/sentry');
  captureMessage(`Queue failure: ${queueName}`, {
    level: 'error',
    tags: {
      category: 'queue',
      queue_name: queueName,
    },
    extra: {
      error,
      failed_message_id: failedMessageId,
      retry_count: retryCount,
    },
  });

  return webhookSent;
}

/**
 * Send custom alert
 */
export async function sendCustomAlert(
  alertType: string,
  severity: 'info' | 'warning' | 'error' | 'critical',
  data: Record<string, unknown>
): Promise<boolean> {
  const payload: WebhookPayload = {
    alert_type: alertType,
    severity,
    timestamp: new Date().toISOString(),
    data,
  };

  // Try to find matching webhook config
  const webhookType = Object.keys(WEBHOOK_CONFIGS).find(
    (key) => key.includes(alertType.toLowerCase())
  );

  if (webhookType) {
    return await sendWebhook(webhookType, payload);
  }

  // Track in Sentry
  const { captureMessage } = await import('@/shared/lib/sentry');
  captureMessage(`Custom alert: ${alertType}`, {
    level: severity,
    tags: {
      category: 'custom',
      alertType: alertType,
    },
    extra: data,
  });

  return false;
}
