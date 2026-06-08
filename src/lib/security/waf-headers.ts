/**
 * WAF Integration and Security Headers
 * 
 * Implements web application firewall integration and security headers:
 * - Security header configuration
 * - CSP (Content Security Policy)
 * - WAF rule management
 * - Attack detection
 * - Request filtering
 * - Security header middleware
 */

// Security header configuration
export interface SecurityHeaderConfig {
  enableCSP: boolean;
  cspDirectives: CSPDirectives;
  enableHSTS: boolean;
  hstsMaxAge: number;
  hstsIncludeSubdomains: boolean;
  hstsPreload: boolean;
  enableXFrameOptions: boolean;
  xFrameOptions: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  enableXContentTypeOptions: boolean;
  enableXSSProtection: boolean;
  enableReferrerPolicy: boolean;
  referrerPolicy: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
  enablePermissionsPolicy: boolean;
  permissionsPolicy: string[];
  enableStrictTransportSecurity: boolean;
}

// CSP directives
export interface CSPDirectives {
  'default-src'?: string;
  'script-src'?: string;
  'style-src'?: string;
  'img-src'?: string;
  'font-src'?: string;
  'connect-src'?: string;
  'media-src'?: string;
  'object-src'?: string;
  'frame-src'?: string;
  'base-uri'?: string;
  'form-action'?: string;
  'frame-ancestors'?: string;
  'report-uri'?: string;
  'report-to'?: string;
}

// WAF rule
export interface WAFRule {
  id: string;
  name: string;
  description: string;
  type: 'sql_injection' | 'xss' | 'csrf' | 'path_traversal' | 'command_injection' | 'file_inclusion' | 'ddos' | 'custom';
  pattern: string | RegExp;
  action: 'allow' | 'block' | 'log' | 'challenge';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  priority: number;
}

// WAF match result
export interface WAFMatchResult {
  matched: boolean;
  ruleId?: string;
  ruleName?: string;
  action: 'allow' | 'block' | 'log' | 'challenge';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
}

// Security headers
export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Frame-Options'?: string;
  'X-Content-Type-Options'?: string;
  'X-XSS-Protection'?: string;
  'Strict-Transport-Security'?: string;
  'Referrer-Policy'?: string;
  'Permissions-Policy'?: string;
  'Cache-Control'?: string;
}

/**
 * Generate security headers
 */
export function generateSecurityHeaders(config: SecurityHeaderConfig): SecurityHeaders {
  const headers: SecurityHeaders = {};

  // Content Security Policy
  if (config.enableCSP) {
    headers['Content-Security-Policy'] = generateCSP(config.cspDirectives);
  }

  // X-Frame-Options
  if (config.enableXFrameOptions) {
    headers['X-Frame-Options'] = config.xFrameOptions;
  }

  // X-Content-Type-Options
  if (config.enableXContentTypeOptions) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  // X-XSS-Protection
  if (config.enableXSSProtection) {
    headers['X-XSS-Protection'] = '1; mode=block';
  }

  // Strict-Transport-Security
  if (config.enableHSTS || config.enableStrictTransportSecurity) {
    let hsts = `max-age=${config.hstsMaxAge}`;
    if (config.hstsIncludeSubdomains) {
      hsts += '; includeSubDomains';
    }
    if (config.hstsPreload) {
      hsts += '; preload';
    }
    headers['Strict-Transport-Security'] = hsts;
  }

  // Referrer-Policy
  if (config.enableReferrerPolicy) {
    headers['Referrer-Policy'] = config.referrerPolicy;
  }

  // Permissions-Policy
  if (config.enablePermissionsPolicy && config.permissionsPolicy.length > 0) {
    headers['Permissions-Policy'] = config.permissionsPolicy.join(', ');
  }

  // Cache-Control for security
  headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';

  return headers;
}

/**
 * Generate CSP header
 */
export function generateCSP(directives: CSPDirectives): string {
  const cspParts: string[] = [];

  for (const [directive, value] of Object.entries(directives)) {
    if (value) {
      cspParts.push(`${directive} ${value}`);
    }
  }

  return cspParts.join('; ');
}

/**
 * Get default CSP directives
 */
export function getDefaultCSPDirectives(): CSPDirectives {
  return {
    'default-src': "'self'",
    'script-src': "'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    'style-src': "'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    'img-src': "'self' data: https: blob:",
    'font-src': "'self' data: https://cdn.jsdelivr.net",
    'connect-src': "'self' https://*.supabase.co wss://*.supabase.co",
    'media-src': "'self' blob:",
    'object-src': "'none'",
    'frame-src': "'self'",
    'base-uri': "'self'",
    'form-action': "'self'",
    'frame-ancestors': "'none'",
  };
}

/**
 * Get default security header configuration
 */
export function getDefaultSecurityHeaderConfig(): SecurityHeaderConfig {
  return {
    enableCSP: true,
    cspDirectives: getDefaultCSPDirectives(),
    enableHSTS: true,
    hstsMaxAge: 31536000, // 1 year
    hstsIncludeSubdomains: true,
    hstsPreload: true,
    enableXFrameOptions: true,
    xFrameOptions: 'DENY',
    enableXContentTypeOptions: true,
    enableXSSProtection: true,
    enableReferrerPolicy: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    enablePermissionsPolicy: true,
    permissionsPolicy: [
      'geolocation=(self)',
      'camera=(self)',
      'microphone=(self)',
      'payment=(self)',
    ],
    enableStrictTransportSecurity: true,
  };
}

/**
 * WAF rule manager
 */
export class WAFManager {
  private rules: WAFRule[] = [];

  constructor(rules: WAFRule[] = []) {
    this.rules = rules;
  }

  addRule(rule: WAFRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }

  checkRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: string
  ): WAFMatchResult {
    // Sort rules by priority (highest first)
    const sortedRules = [...this.rules]
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      const match = this.checkRule(rule, url, method, headers, body);
      if (match.matched) {
        return {
          matched: true,
          ruleId: rule.id,
          ruleName: rule.name,
          action: rule.action,
          severity: rule.severity,
          details: match.details,
        };
      }
    }

    return { matched: true, action: 'allow' };
  }

  private checkRule(
    rule: WAFRule,
    url: string,
    _method: string,
    headers: Record<string, string>,
    body?: string
  ): { matched: boolean; details?: string } {
    const pattern = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern, 'i');

    // Check URL
    if (pattern.test(url)) {
      return { matched: true, details: `Pattern matched in URL: ${url}` };
    }

    // Check headers
    for (const [key, value] of Object.entries(headers)) {
      if (pattern.test(value)) {
        return { matched: true, details: `Pattern matched in header ${key}` };
      }
    }

    // Check body
    if (body && pattern.test(body)) {
      return { matched: true, details: 'Pattern matched in request body' };
    }

    return { matched: false };
  }

  getRules(): WAFRule[] {
    return this.rules;
  }

  getEnabledRules(): WAFRule[] {
    return this.rules.filter(r => r.enabled);
  }

  getRulesByType(type: WAFRule['type']): WAFRule[] {
    return this.rules.filter(r => r.type === type);
  }
}

/**
 * Get default WAF rules
 */
export function getDefaultWAFRules(): Omit<WAFRule, 'id'>[] {
  return [
    {
      name: 'SQL Injection Detection',
      description: 'Detect common SQL injection patterns',
      type: 'sql_injection',
      pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|ALTER|CREATE)\b.*\b(FROM|INTO|VALUES|WHERE|SET)\b)/i,
      action: 'block',
      severity: 'critical',
      enabled: true,
      priority: 100,
    },
    {
      name: 'XSS Detection',
      description: 'Detect cross-site scripting patterns',
      type: 'xss',
      pattern: /<script[^>]*>.*?<\/script>|javascript:|on\w+\s*=|<iframe/i,
      action: 'block',
      severity: 'critical',
      enabled: true,
      priority: 100,
    },
    {
      name: 'Path Traversal Detection',
      description: 'Detect path traversal attempts',
      type: 'path_traversal',
      pattern: /\.\.[\\/]|%2e%2e|%252e%252e|\.\.%5c|\.\.%2f/i,
      action: 'block',
      severity: 'high',
      enabled: true,
      priority: 90,
    },
    {
      name: 'Command Injection Detection',
      description: 'Detect command injection attempts',
      type: 'command_injection',
      pattern: /[;&|`$()]/i,
      action: 'block',
      severity: 'high',
      enabled: true,
      priority: 90,
    },
    {
      name: 'File Inclusion Detection',
      description: 'Detect file inclusion attempts',
      type: 'file_inclusion',
      pattern: /(php|asp|jsp):\/\/|file:\/\/|\.\.\/|\.\.\\/i,
      action: 'block',
      severity: 'high',
      enabled: true,
      priority: 80,
    },
    {
      name: 'CSRF Detection',
      description: 'Detect potential CSRF attacks',
      type: 'csrf',
      pattern: /<form[^>]*>(?!.*csrf)/i,
      action: 'log',
      severity: 'medium',
      enabled: true,
      priority: 50,
    },
    {
      name: 'DDoS Detection',
      description: 'Detect potential DDoS patterns',
      type: 'ddos',
      pattern: /(?:\/){20,}/i,
      action: 'block',
      severity: 'critical',
      enabled: true,
      priority: 100,
    },
  ];
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Validate URL
 */
export function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Kenya format)
 */
export function validatePhoneNumber(phone: string): boolean {
  // Kenya phone numbers: +254 followed by 9 digits, or 07/01 followed by 9 digits
  const phoneRegex = /^(\+254|0)[17]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Detect attack patterns in input
 */
export function detectAttackPatterns(input: string): {
  hasSQLInjection: boolean;
  hasXSS: boolean;
  hasPathTraversal: boolean;
  hasCommandInjection: boolean;
} {
  return {
    hasSQLInjection: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC)\b.*\b(FROM|INTO|VALUES|WHERE|SET)\b)/i.test(input),
    hasXSS: /<script[^>]*>.*?<\/script>|javascript:|on\w+\s*=|<iframe/i.test(input),
    hasPathTraversal: /\.\.[\\/]|%2e%2e|%252e%252e|\.\.%5c|\.\.%2f/i.test(input),
    hasCommandInjection: /[;&|`$()]/i.test(input),
  };
}

/**
 * Generate nonce for CSP
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get security header label
 */
export function getSecurityHeaderLabel(header: string): string {
  const labels: Record<string, string> = {
    'Content-Security-Policy': 'Content Security Policy',
    'X-Frame-Options': 'X-Frame-Options',
    'X-Content-Type-Options': 'X-Content-Type-Options',
    'X-XSS-Protection': 'X-XSS-Protection',
    'Strict-Transport-Security': 'Strict-Transport-Security',
    'Referrer-Policy': 'Referrer-Policy',
    'Permissions-Policy': 'Permissions-Policy',
    'Cache-Control': 'Cache-Control',
  };

  return labels[header] || header;
}

/**
 * Get WAF rule type label
 */
export function getWAFRuleTypeLabel(type: WAFRule['type']): string {
  const labels: Record<WAFRule['type'], string> = {
    sql_injection: 'SQL Injection',
    xss: 'Cross-Site Scripting (XSS)',
    csrf: 'Cross-Site Request Forgery (CSRF)',
    path_traversal: 'Path Traversal',
    command_injection: 'Command Injection',
    file_inclusion: 'File Inclusion',
    ddos: 'DDoS',
    custom: 'Custom',
  };

  return labels[type];
}

/**
 * Get WAF action label
 */
export function getWAFActionLabel(action: WAFRule['action']): string {
  const labels: Record<WAFRule['action'], string> = {
    allow: 'Allow',
    block: 'Block',
    log: 'Log Only',
    challenge: 'Challenge',
  };

  return labels[action];
}
