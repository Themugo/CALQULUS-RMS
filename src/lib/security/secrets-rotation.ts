/**
 * Secrets Rotation Automation System
 * 
 * Implements automated secrets rotation with:
 * - Secret lifecycle management
 * - Rotation scheduling
 * - Automated key generation
 * - Secret versioning
 * - Rollback capabilities
 * - Compliance tracking
 */

// Secret type
export enum SecretType {
  API_KEY = 'api_key',
  DATABASE_PASSWORD = 'database_password',
  ENCRYPTION_KEY = 'encryption_key',
  JWT_SECRET = 'jwt_secret',
  OAUTH_SECRET = 'oauth_secret',
  WEBHOOK_SECRET = 'webhook_secret',
  SERVICE_KEY = 'service_key',
  CERTIFICATE = 'certificate',
}

// Secret status
export enum SecretStatus {
  ACTIVE = 'active',
  ROTATING = 'rotating',
  DEPRECATED = 'deprecated',
  REVOKED = 'revoked',
}

// Rotation strategy
export enum RotationStrategy {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
  MANUAL = 'manual',
  EVENT_DRIVEN = 'event_driven',
}

// Secret
export interface Secret {
  id: string;
  name: string;
  type: SecretType;
  value: string; // Encrypted
  version: number;
  status: SecretStatus;
  createdAt: Date;
  expiresAt?: Date;
  lastRotatedAt?: Date;
  nextRotationAt?: Date;
  rotationStrategy: RotationStrategy;
  rotationIntervalDays?: number;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

// Secret version
export interface SecretVersion {
  id: string;
  secretId: string;
  version: number;
  value: string; // Encrypted
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
  revokedAt?: Date;
  revokedBy?: string;
}

// Rotation schedule
export interface RotationSchedule {
  id: string;
  secretId: string;
  strategy: RotationStrategy;
  intervalDays: number;
  nextRotationAt: Date;
  timezone: string;
  notifyBeforeDays: number;
  notifyEmails: string[];
  isActive: boolean;
}

// Rotation event
export interface RotationEvent {
  id: string;
  secretId: string;
  oldVersion: number;
  newVersion: number;
  rotatedAt: Date;
  rotatedBy: string;
  method: 'automatic' | 'manual';
  success: boolean;
  errorMessage?: string;
  rollbackAvailable: boolean;
}

/**
 * Generate secure random secret
 */
export function generateSecret(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += chars.charAt(array[i] % chars.length);
  }
  
  return secret;
}

/**
 * Generate API key
 */
export function generateAPIKey(prefix: string = 'sk'): string {
  const randomPart = generateSecret(32);
  return `${prefix}_${randomPart}`;
}

/**
 * Generate JWT secret
 */
export function generateJWTSecret(): string {
  return generateSecret(64);
}

/**
 * Create secret
 */
export function createSecret(
  name: string,
  type: SecretType,
  value: string,
  rotationStrategy: RotationStrategy,
  createdBy: string,
  rotationIntervalDays?: number,
  expiresAt?: Date,
  metadata?: Record<string, unknown>
): Secret {
  const now = new Date();
  let nextRotationAt: Date | undefined;
  
  if (rotationIntervalDays && rotationStrategy === RotationStrategy.SCHEDULED) {
    nextRotationAt = new Date(now.getTime() + rotationIntervalDays * 24 * 60 * 60 * 1000);
  }
  
  return {
    id: `secret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    value, // Should be encrypted before storage
    version: 1,
    status: SecretStatus.ACTIVE,
    createdAt: now,
    expiresAt,
    lastRotatedAt: now,
    nextRotationAt,
    rotationStrategy,
    rotationIntervalDays,
    createdBy,
    metadata,
  };
}

/**
 * Rotate secret
 */
export function rotateSecret(
  secret: Secret,
  newValue: string,
  rotatedBy: string
): { secret: Secret; event: RotationEvent } {
  const now = new Date();
  const oldVersion = secret.version;
  
  const updatedSecret: Secret = {
    ...secret,
    value: newValue, // Should be encrypted before storage
    version: secret.version + 1,
    status: SecretStatus.ACTIVE,
    lastRotatedAt: now,
  };
  
  // Calculate next rotation date if scheduled
  if (secret.rotationStrategy === RotationStrategy.SCHEDULED && secret.rotationIntervalDays) {
    updatedSecret.nextRotationAt = new Date(now.getTime() + secret.rotationIntervalDays * 24 * 60 * 60 * 1000);
  }
  
  const event: RotationEvent = {
    id: `rotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    secretId: secret.id,
    oldVersion,
    newVersion: updatedSecret.version,
    rotatedAt: now,
    rotatedBy,
    method: 'manual',
    success: true,
    rollbackAvailable: true,
  };
  
  return { secret: updatedSecret, event };
}

/**
 * Create secret version
 */
export function createSecretVersion(
  secretId: string,
  version: number,
  value: string,
  createdBy: string
): SecretVersion {
  return {
    id: `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    secretId,
    version,
    value, // Should be encrypted before storage
    createdAt: new Date(),
    createdBy,
    isActive: true,
  };
}

/**
 * Revoke secret version
 */
export function revokeSecretVersion(
  version: SecretVersion,
  revokedBy: string
): SecretVersion {
  return {
    ...version,
    isActive: false,
    revokedAt: new Date(),
    revokedBy,
  };
}

/**
 * Rollback to previous version
 */
export function rollbackSecret(
  secret: Secret,
  targetVersion: number,
  versions: SecretVersion[],
  rolledBackBy: string
): { secret: Secret; event: RotationEvent } {
  const targetVersionRecord = versions.find(v => v.version === targetVersion && v.secretId === secret.id);
  
  if (!targetVersionRecord) {
    throw new Error(`Version ${targetVersion} not found`);
  }
  
  const now = new Date();
  const oldVersion = secret.version;
  
  const updatedSecret: Secret = {
    ...secret,
    value: targetVersionRecord.value,
    version: targetVersion,
    status: SecretStatus.ACTIVE,
    lastRotatedAt: now,
  };
  
  const event: RotationEvent = {
    id: `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    secretId: secret.id,
    oldVersion,
    newVersion: targetVersion,
    rotatedAt: now,
    rotatedBy: rolledBackBy,
    method: 'manual',
    success: true,
    rollbackAvailable: false,
  };
  
  return { secret: updatedSecret, event };
}

/**
 * Create rotation schedule
 */
export function createRotationSchedule(
  secretId: string,
  strategy: RotationStrategy,
  intervalDays: number,
  timezone: string = 'UTC',
  notifyBeforeDays: number = 7,
  notifyEmails: string[] = []
): RotationSchedule {
  const now = new Date();
  const nextRotationAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  
  return {
    id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    secretId,
    strategy,
    intervalDays,
    nextRotationAt,
    timezone,
    notifyBeforeDays,
    notifyEmails,
    isActive: true,
  };
}

/**
 * Check if secret needs rotation
 */
export function needsRotation(secret: Secret): boolean {
  if (secret.status !== SecretStatus.ACTIVE) {
    return false;
  }
  
  if (!secret.nextRotationAt) {
    return false;
  }
  
  return new Date() >= secret.nextRotationAt;
}

/**
 * Get secrets due for rotation
 */
export function getSecretsDueForRotation(secrets: Secret[]): Secret[] {
  return secrets.filter(secret => needsRotation(secret));
}

/**
 * Schedule automatic rotation
 */
export function scheduleAutomaticRotation(
  secret: Secret,
  intervalDays: number
): Secret {
  const now = new Date();
  const nextRotationAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  
  return {
    ...secret,
    rotationStrategy: RotationStrategy.SCHEDULED,
    rotationIntervalDays: intervalDays,
    nextRotationAt,
  };
}

/**
 * Revoke secret
 */
export function revokeSecret(secret: Secret, reason: string): Secret {
  return {
    ...secret,
    status: SecretStatus.REVOKED,
    metadata: {
      ...secret.metadata,
      revocationReason: reason,
      revokedAt: new Date(),
    },
  };
}

/**
 * Deprecate secret
 */
export function deprecateSecret(secret: Secret, replacementSecretId?: string): Secret {
  return {
    ...secret,
    status: SecretStatus.DEPRECATED,
    metadata: {
      ...secret.metadata,
      replacementSecretId,
      deprecatedAt: new Date(),
    },
  };
}

/**
 * Get secret age in days
 */
export function getSecretAge(secret: Secret): number {
  const now = new Date();
  const created = new Date(secret.createdAt);
  return (now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000);
}

/**
 * Get days until rotation
 */
export function getDaysUntilRotation(secret: Secret): number {
  if (!secret.nextRotationAt) {
    return Infinity;
  }
  
  const now = new Date();
  const rotation = new Date(secret.nextRotationAt);
  return (rotation.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
}

/**
 * Check if secret is expired
 */
export function isSecretExpired(secret: Secret): boolean {
  if (!secret.expiresAt) {
    return false;
  }
  
  return new Date() > secret.expiresAt;
}

/**
 * Get secret type label
 */
export function getSecretTypeLabel(type: SecretType): string {
  const labels: Record<SecretType, string> = {
    [SecretType.API_KEY]: 'API Key',
    [SecretType.DATABASE_PASSWORD]: 'Database Password',
    [SecretType.ENCRYPTION_KEY]: 'Encryption Key',
    [SecretType.JWT_SECRET]: 'JWT Secret',
    [SecretType.OAUTH_SECRET]: 'OAuth Secret',
    [SecretType.WEBHOOK_SECRET]: 'Webhook Secret',
    [SecretType.SERVICE_KEY]: 'Service Key',
    [SecretType.CERTIFICATE]: 'Certificate',
  };

  return labels[type];
}

/**
 * Get secret status label
 */
export function getSecretStatusLabel(status: SecretStatus): string {
  const labels: Record<SecretStatus, string> = {
    [SecretStatus.ACTIVE]: 'Active',
    [SecretStatus.ROTATING]: 'Rotating',
    [SecretStatus.DEPRECATED]: 'Deprecated',
    [SecretStatus.REVOKED]: 'Revoked',
  };

  return labels[status];
}

/**
 * Get rotation strategy label
 */
export function getRotationStrategyLabel(strategy: RotationStrategy): string {
  const labels: Record<RotationStrategy, string> = {
    [RotationStrategy.IMMEDIATE]: 'Immediate',
    [RotationStrategy.SCHEDULED]: 'Scheduled',
    [RotationStrategy.MANUAL]: 'Manual',
    [RotationStrategy.EVENT_DRIVEN]: 'Event-Driven',
  };

  return labels[strategy];
}

/**
 * Get secret statistics
 */
export function getSecretStatistics(secrets: Secret[]): {
  totalSecrets: number;
  byType: Record<SecretType, number>;
  byStatus: Record<SecretStatus, number>;
  byStrategy: Record<RotationStrategy, number>;
  expiredSecrets: number;
  dueForRotation: number;
  averageAge: number;
} {
  const byType: Record<SecretType, number> = {
    [SecretType.API_KEY]: 0,
    [SecretType.DATABASE_PASSWORD]: 0,
    [SecretType.ENCRYPTION_KEY]: 0,
    [SecretType.JWT_SECRET]: 0,
    [SecretType.OAUTH_SECRET]: 0,
    [SecretType.WEBHOOK_SECRET]: 0,
    [SecretType.SERVICE_KEY]: 0,
    [SecretType.CERTIFICATE]: 0,
  };
  
  const byStatus: Record<SecretStatus, number> = {
    [SecretStatus.ACTIVE]: 0,
    [SecretStatus.ROTATING]: 0,
    [SecretStatus.DEPRECATED]: 0,
    [SecretStatus.REVOKED]: 0,
  };
  
  const byStrategy: Record<RotationStrategy, number> = {
    [RotationStrategy.IMMEDIATE]: 0,
    [RotationStrategy.SCHEDULED]: 0,
    [RotationStrategy.MANUAL]: 0,
    [RotationStrategy.EVENT_DRIVEN]: 0,
  };
  
  let totalAge = 0;
  
  for (const secret of secrets) {
    byType[secret.type]++;
    byStatus[secret.status]++;
    byStrategy[secret.rotationStrategy]++;
    totalAge += getSecretAge(secret);
  }
  
  const expiredSecrets = secrets.filter(s => isSecretExpired(s)).length;
  const dueForRotation = secrets.filter(s => needsRotation(s)).length;
  const averageAge = secrets.length > 0 ? totalAge / secrets.length : 0;
  
  return {
    totalSecrets: secrets.length,
    byType,
    byStatus,
    byStrategy,
    expiredSecrets,
    dueForRotation,
    averageAge,
  };
}

/**
 * Filter secrets by type
 */
export function filterSecretsByType(secrets: Secret[], type: SecretType): Secret[] {
  return secrets.filter(secret => secret.type === type);
}

/**
 * Filter secrets by status
 */
export function filterSecretsByStatus(secrets: Secret[], status: SecretStatus): Secret[] {
  return secrets.filter(secret => secret.status === status);
}

/**
 * Get rotation history
 */
export function getRotationHistory(events: RotationEvent[], secretId: string): RotationEvent[] {
  return events
    .filter(event => event.secretId === secretId)
    .sort((a, b) => b.rotatedAt.getTime() - a.rotatedAt.getTime());
}

/**
 * Validate secret strength
 */
export function validateSecretStrength(secret: string, type: SecretType): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  issues: string[];
} {
  const issues: string[] = [];
  
  // Length check
  if (secret.length < 16) {
    issues.push('Secret is too short (minimum 16 characters)');
  }
  
  // Complexity check
  const hasUpperCase = /[A-Z]/.test(secret);
  const hasLowerCase = /[a-z]/.test(secret);
  const hasNumbers = /[0-9]/.test(secret);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(secret);
  
  if (!hasUpperCase) {
    issues.push('Secret should contain uppercase letters');
  }
  
  if (!hasLowerCase) {
    issues.push('Secret should contain lowercase letters');
  }
  
  if (!hasNumbers) {
    issues.push('Secret should contain numbers');
  }
  
  if (!hasSpecial) {
    issues.push('Secret should contain special characters');
  }
  
  // Type-specific checks
  if (type === SecretType.JWT_SECRET && secret.length < 32) {
    issues.push('JWT secrets should be at least 32 characters');
  }
  
  if (type === SecretType.ENCRYPTION_KEY && secret.length < 32) {
    issues.push('Encryption keys should be at least 32 characters');
  }
  
  const complexityScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial].filter(Boolean).length;
  
  let strength: 'weak' | 'medium' | 'strong';
  if (complexityScore >= 4 && secret.length >= 32) {
    strength = 'strong';
  } else if (complexityScore >= 3 && secret.length >= 24) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }
  
  return {
    isValid: issues.length === 0,
    strength,
    issues,
  };
}
