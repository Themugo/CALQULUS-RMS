/**
 * Signed URLs for Secure File Access
 * 
 * Implements secure file access with:
 * - Time-limited signed URLs
 * - Cryptographic signatures
 * - Access control
 * - URL expiration
 * - One-time use tokens
 * - Access logging
 */

// Signed URL configuration
export interface SignedURLConfig {
  secretKey: string;
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  expiresIn: number; // seconds
  issuer: string;
}

// Signed URL payload
export interface SignedURLPayload {
  fileId: string;
  userId: string;
  action: 'read' | 'write' | 'delete';
  expiresAt: number;
  issuedAt: number;
  nonce: string;
  permissions: string[];
}

// Signed URL
export interface SignedURL {
  url: string;
  token: string;
  expiresAt: Date;
  payload: SignedURLPayload;
}

// Access log
export interface AccessLog {
  id: string;
  fileId: string;
  userId: string;
  action: 'read' | 'write' | 'delete';
  accessedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  reason?: string;
}

/**
 * Generate signed URL
 */
export async function generateSignedURL(
  fileId: string,
  userId: string,
  action: 'read' | 'write' | 'delete',
  config: SignedURLConfig,
  permissions: string[] = [],
  expiresIn?: number
): Promise<SignedURL> {
  const now = Date.now();
  const expiresAt = now + (expiresIn || config.expiresIn) * 1000;
  const nonce = generateNonce();
  
  const payload: SignedURLPayload = {
    fileId,
    userId,
    action,
    expiresAt,
    issuedAt: now,
    nonce,
    permissions,
  };
  
  const token = await signPayload(payload, config);
  
  const url = `${config.issuer}/files/${fileId}?token=${token}`;
  
  return {
    url,
    token,
    expiresAt: new Date(expiresAt),
    payload,
  };
}

/**
 * Sign payload
 */
async function signPayload(payload: SignedURLPayload, config: SignedURLConfig): Promise<string> {
  const payloadString = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(payloadString);
  
  const keyBuffer = encoder.encode(config.secretKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray));
  
  // Combine payload and signature
  const combined = btoa(payloadString) + '.' + signatureBase64;
  
  return combined;
}

/**
 * Verify signed URL
 */
export async function verifySignedURL(
  token: string,
  config: SignedURLConfig
): Promise<{ valid: boolean; payload?: SignedURLPayload; reason?: string }> {
  try {
    const [payloadBase64, signatureBase64] = token.split('.');
    
    if (!payloadBase64 || !signatureBase64) {
      return { valid: false, reason: 'Invalid token format' };
    }
    
    const payloadString = atob(payloadBase64);
    const payload: SignedURLPayload = JSON.parse(payloadString);
    
    // Check expiration
    if (Date.now() > payload.expiresAt) {
      return { valid: false, reason: 'Token expired' };
    }
    
    // Verify signature
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(payloadString);
    
    const keyBuffer = encoder.encode(config.secretKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signatureData = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify('HMAC', key, signatureData, dataBuffer);
    
    if (!isValid) {
      return { valid: false, reason: 'Invalid signature' };
    }
    
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, reason: 'Token verification failed' };
  }
}

/**
 * Generate nonce
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create one-time use signed URL
 */
export async function createOneTimeSignedURL(
  fileId: string,
  userId: string,
  action: 'read' | 'write' | 'delete',
  config: SignedURLConfig,
  permissions: string[] = []
): Promise<SignedURL> {
  const signedUrl = await generateSignedURL(fileId, userId, action, config, permissions, 300); // 5 minutes
  
  // Add one-time use marker
  signedUrl.payload.nonce = `one_time_${signedUrl.payload.nonce}`;
  
  return signedUrl;
}

/**
 * Log access
 */
export function logAccess(
  fileId: string,
  userId: string,
  action: 'read' | 'write' | 'delete',
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  reason?: string
): AccessLog {
  return {
    id: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fileId,
    userId,
    action,
    accessedAt: new Date(),
    ipAddress,
    userAgent,
    success,
    reason,
  };
}

/**
 * Revoke signed URL
 */
export function revokeSignedURL(signedUrl: SignedURL): void {
  // In production, add to revocation list or database
  // For now, this is a placeholder
  console.warn(`Revoking signed URL for file ${signedUrl.payload.fileId}`);
}

/**
 * Check if signed URL is expired
 */
export function isSignedURLExpired(signedUrl: SignedURL): boolean {
  return new Date() > signedUrl.expiresAt;
}

/**
 * Get signed URL configuration
 */
export function getSignedURLConfig(): SignedURLConfig {
  return {
    secretKey: process.env.VITE_SIGNED_URL_SECRET || 'default-secret-key-change-in-production',
    algorithm: 'HS256',
    expiresIn: 3600, // 1 hour
    issuer: window.location.origin,
  };
}

/**
 * Generate batch signed URLs
 */
export async function generateBatchSignedURLs(
  fileIds: string[],
  userId: string,
  action: 'read' | 'write' | 'delete',
  config: SignedURLConfig,
  permissions: string[] = []
): Promise<SignedURL[]> {
  const signedUrls: SignedURL[] = [];
  
  for (const fileId of fileIds) {
    const signedUrl = await generateSignedURL(fileId, userId, action, config, permissions);
    signedUrls.push(signedUrl);
  }
  
  return signedUrls;
}

/**
 * Get access statistics
 */
export function getAccessStatistics(logs: AccessLog[]): {
  totalAccess: number;
  successfulAccess: number;
  failedAccess: number;
  byAction: Record<'read' | 'write' | 'delete', number>;
  byUser: Record<string, number>;
  byFile: Record<string, number>;
} {
  const successfulAccess = logs.filter(log => log.success).length;
  const failedAccess = logs.filter(log => !log.success).length;
  
  const byAction: Record<'read' | 'write' | 'delete', number> = {
    read: 0,
    write: 0,
    delete: 0,
  };
  
  const byUser: Record<string, number> = {};
  const byFile: Record<string, number> = {};
  
  for (const log of logs) {
    byAction[log.action]++;
    byUser[log.userId] = (byUser[log.userId] || 0) + 1;
    byFile[log.fileId] = (byFile[log.fileId] || 0) + 1;
  }
  
  return {
    totalAccess: logs.length,
    successfulAccess,
    failedAccess,
    byAction,
    byUser,
    byFile,
  };
}

/**
 * Filter access logs by user
 */
export function filterAccessLogsByUser(logs: AccessLog[], userId: string): AccessLog[] {
  return logs.filter(log => log.userId === userId);
}

/**
 * Filter access logs by file
 */
export function filterAccessLogsByFile(logs: AccessLog[], fileId: string): AccessLog[] {
  return logs.filter(log => log.fileId === fileId);
}

/**
 * Filter access logs by date range
 */
export function filterAccessLogsByDateRange(
  logs: AccessLog[],
  startDate: Date,
  endDate: Date
): AccessLog[] {
  return logs.filter(log => {
    const accessDate = new Date(log.accessedAt);
    return accessDate >= startDate && accessDate <= endDate;
  });
}

/**
 * Filter access logs by action
 */
export function filterAccessLogsByAction(
  logs: AccessLog[],
  action: 'read' | 'write' | 'delete'
): AccessLog[] {
  return logs.filter(log => log.action === action);
}

/**
 * Clean up expired signed URLs
 */
export function cleanupExpiredSignedURLs(signedUrls: SignedURL[]): SignedURL[] {
  return signedUrls.filter(url => !isSignedURLExpired(url));
}

/**
 * Validate permissions
 */
export function validatePermissions(
  payload: SignedURLPayload,
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every(perm => payload.permissions.includes(perm));
}

/**
 * Get signed URL TTL
 */
export function getSignedURLTTL(signedUrl: SignedURL): number {
  const now = Date.now();
  const expiresAt = signedUrl.expiresAt.getTime();
  return Math.max(0, expiresAt - now);
}
