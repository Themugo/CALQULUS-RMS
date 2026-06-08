/**
 * Prometheus Metrics Exporter
 * 
 * Provides application metrics for Prometheus scraping:
 * - HTTP request metrics
 * - Payment transaction metrics
 * - Database query metrics
 * - Custom business metrics
 */

// Counter for HTTP requests
let httpRequestCount = 0;
let httpRequestDurationSum = 0;
let httpRequestDurationCount = 0;

// Counter for payment transactions
let paymentTransactionCount = 0;
let paymentTransactionSuccessCount = 0;
let paymentTransactionFailureCount = 0;

// Counter for database queries
let dbQueryCount = 0;
let dbQueryDurationSum = 0;
let dbQuerySlowCount = 0;

// Gauge for active connections
let activeConnections = 0;

/**
 * Record HTTP request
 */
export function recordHttpRequest(
  method: string,
  path: string,
  status: number,
  duration: number
): void {
  httpRequestCount++;
  httpRequestDurationSum += duration;
  httpRequestDurationCount++;

  // Log to console for Prometheus scraping (in production, use a proper exporter)
  console.warn(`METRIC http_requests_total{method="${method}",path="${path}",status="${status}"} 1`);
  console.warn(`METRIC http_request_duration_seconds{method="${method}",path="${path}",status="${status}"} ${duration}`);
}

/**
 * Record payment transaction
 */
export function recordPaymentTransaction(
  method: string,
  status: 'completed' | 'failed' | 'pending',
  amount: number,
  duration: number
): void {
  paymentTransactionCount++;
  
  if (status === 'completed') {
    paymentTransactionSuccessCount++;
  } else if (status === 'failed') {
    paymentTransactionFailureCount++;
  }

  // Log to console for Prometheus scraping
  console.warn(`METRIC payment_transactions_total{method="${method}",status="${status}"} 1`);
  console.warn(`METRIC payment_transaction_amount{method="${method}",status="${status}"} ${amount}`);
  console.warn(`METRIC payment_transaction_duration_seconds{method="${method}",status="${status}"} ${duration}`);
}

/**
 * Record database query
 */
export function recordDbQuery(
  queryType: string,
  table: string,
  duration: number,
  success: boolean
): void {
  dbQueryCount++;
  dbQueryDurationSum += duration;

  if (duration > 1.0) { // Slow query threshold: 1 second
    dbQuerySlowCount++;
  }

  // Log to console for Prometheus scraping
  console.warn(`METRIC db_queries_total{query_type="${queryType}",table="${table}",success="${success}"} 1`);
  console.warn(`METRIC db_query_duration_seconds{query_type="${queryType}",table="${table}",success="${success}"} ${duration}`);
}

/**
 * Increment active connections
 */
export function incrementActiveConnections(): void {
  activeConnections++;
  console.warn(`METRIC http_active_connections ${activeConnections}`);
}

/**
 * Decrement active connections
 */
export function decrementActiveConnections(): void {
  activeConnections--;
  console.warn(`METRIC http_active_connections ${activeConnections}`);
}

/**
 * Record custom metric
 */
export function recordCustomMetric(
  name: string,
  value: number,
  labels?: Record<string, string>
): void {
  const labelString = labels 
    ? `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
    : '';
  console.warn(`METRIC ${name}${labelString} ${value}`);
}

/**
 * Get metrics summary for Prometheus
 */
export function getMetricsSummary(): string {
  const metrics: string[] = [];

  // HTTP request metrics
  metrics.push(`# HELP http_requests_total Total number of HTTP requests`);
  metrics.push(`# TYPE http_requests_total counter`);
  metrics.push(`http_requests_total ${httpRequestCount}`);

  metrics.push(`# HELP http_request_duration_seconds HTTP request duration in seconds`);
  metrics.push(`# TYPE http_request_duration_seconds histogram`);
  metrics.push(`http_request_duration_seconds_sum ${httpRequestDurationSum}`);
  metrics.push(`http_request_duration_seconds_count ${httpRequestDurationCount}`);

  // Payment transaction metrics
  metrics.push(`# HELP payment_transactions_total Total number of payment transactions`);
  metrics.push(`# TYPE payment_transactions_total counter`);
  metrics.push(`payment_transactions_total ${paymentTransactionCount}`);
  metrics.push(`payment_transactions_success_total ${paymentTransactionSuccessCount}`);
  metrics.push(`payment_transactions_failure_total ${paymentTransactionFailureCount}`);

  // Database query metrics
  metrics.push(`# HELP db_queries_total Total number of database queries`);
  metrics.push(`# TYPE db_queries_total counter`);
  metrics.push(`db_queries_total ${dbQueryCount}`);
  metrics.push(`db_queries_slow_total ${dbQuerySlowCount}`);

  metrics.push(`db_query_duration_seconds_sum ${dbQueryDurationSum}`);
  metrics.push(`db_query_duration_seconds_count ${dbQueryCount}`);

  // Active connections
  metrics.push(`# HELP http_active_connections Current number of active HTTP connections`);
  metrics.push(`# TYPE http_active_connections gauge`);
  metrics.push(`http_active_connections ${activeConnections}`);

  return metrics.join('\n');
}

/**
 * Metrics endpoint handler (for use in API routes)
 */
export function metricsEndpointHandler(): Response {
  const metrics = getMetricsSummary();
  return new Response(metrics, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
    },
  });
}

/**
 * Initialize metrics collection
 */
export function initializeMetrics(): void {
  console.warn('Prometheus metrics exporter initialized');
  
  // Reset counters on initialization
  httpRequestCount = 0;
  httpRequestDurationSum = 0;
  httpRequestDurationCount = 0;
  paymentTransactionCount = 0;
  paymentTransactionSuccessCount = 0;
  paymentTransactionFailureCount = 0;
  dbQueryCount = 0;
  dbQueryDurationSum = 0;
  dbQuerySlowCount = 0;
  activeConnections = 0;
}
