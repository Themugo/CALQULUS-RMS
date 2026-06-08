/**
 * OpenTelemetry Distributed Tracing
 * 
 * Provides distributed tracing for application performance monitoring:
 * - Trace propagation across services
 * - Span creation for operations
 * - Integration with Jaeger/Tempo
 */

import { trace, context, propagation, Span, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

// Initialize tracer provider
let tracerProvider: WebTracerProvider | null = null;
let isInitialized = false;

/**
 * Initialize OpenTelemetry tracing
 */
export function initializeTracing(): void {
  if (isInitialized) return;

  try {
    // Create tracer provider
    tracerProvider = new WebTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'rentflow-frontend',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: import.meta.env.PROD ? 'production' : 'development',
      }),
    });

    // Configure exporter (send to Jaeger/Tempo)
    const exporter = new OTLPTraceExporter({
      url: import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add span processor
    tracerProvider.addSpanProcessor(new BatchSpanProcessor(exporter));

    // Register the provider
    tracerProvider.register({
      propagator: new W3CTraceContextPropagator(),
    });

    isInitialized = true;
    console.warn('OpenTelemetry tracing initialized');
  } catch (error) {
    console.warn('Failed to initialize OpenTelemetry tracing:', error);
  }
}

/**
 * Get tracer for a specific module
 */
export function getTracer(module: string) {
  if (!tracerProvider) {
    initializeTracing();
  }
  return trace.getTracer(module);
}

/**
 * Create a span for an operation
 */
export function createSpan(
  name: string,
  options?: {
    kind?: SpanKind;
    attributes?: Record<string, unknown>;
  }
): Span | undefined {
  if (!tracerProvider) {
    initializeTracing();
  }

  const tracer = getTracer('rentflow');
  return tracer.startSpan(name, {
    kind: options?.kind || SpanKind.INTERNAL,
    attributes: options?.attributes,
  });
}

/**
 * Trace an async operation
 */
export async function traceAsync<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: {
    kind?: SpanKind;
    attributes?: Record<string, unknown>;
  }
): Promise<T> {
  const span = createSpan(name, options);
  if (!span) {
    return fn(span as any);
  }

  try {
    const result = await fn(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Trace a synchronous operation
 */
export function traceSync<T>(
  name: string,
  fn: (span: Span) => T,
  options?: {
    kind?: SpanKind;
    attributes?: Record<string, unknown>;
  }
): T {
  const span = createSpan(name, options);
  if (!span) {
    return fn(span as any);
  }

  try {
    const result = fn(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Add attributes to current span
 */
export function addSpanAttributes(attributes: Record<string, unknown>): void {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.setAttributes(attributes);
  }
}

/**
 * Add event to current span
 */
export function addSpanEvent(name: string, attributes?: Record<string, unknown>): void {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.addEvent(name, attributes);
  }
}

/**
 * Record exception in current span
 */
export function recordSpanException(error: Error): void {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.recordException(error);
    activeSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}

/**
 * Get current trace ID
 */
export function getCurrentTraceId(): string | undefined {
  const activeSpan = trace.getActiveSpan();
  if (!activeSpan) return undefined;
  const spanContext = activeSpan.spanContext();
  return spanContext.traceId;
}

/**
 * Get current span ID
 */
export function getCurrentSpanId(): string | undefined {
  const activeSpan = trace.getActiveSpan();
  if (!activeSpan) return undefined;
  const spanContext = activeSpan.spanContext();
  return spanContext.spanId;
}

/**
 * Inject trace context into headers
 */
export function injectTraceContext(headers: Record<string, string>): void {
  propagation.inject(context.active(), headers);
}

/**
 * Extract trace context from headers
 */
export function extractTraceContext(headers: Record<string, string>): void {
  const carrier = propagation.extract(context.active(), headers);
  context.bind(carrier);
}

/**
 * Decorator for tracing async functions
 */
export function traced(name: string, options?: { attributes?: Record<string, unknown> }) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return traceAsync(
        name,
        async (span) => {
          span.setAttributes({
            'function.name': propertyKey,
            'function.args': JSON.stringify(args),
            ...options?.attributes,
          });
          return originalMethod.apply(this, args);
        }
      );
    };

    return descriptor;
  };
}

/**
 * Decorator for tracing sync functions
 */
export function tracedSync(name: string, options?: { attributes?: Record<string, unknown> }) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      return traceSync(
        name,
        (span) => {
          span.setAttributes({
            'function.name': propertyKey,
            'function.args': JSON.stringify(args),
            ...options?.attributes,
          });
          return originalMethod.apply(this, args);
        }
      );
    };

    return descriptor;
  };
}
