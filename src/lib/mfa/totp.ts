/**
 * MFA - TOTP (Time-based One-Time Password) Implementation
 * 
 * Provides TOTP generation and verification for two-factor authentication:
 * - Generate TOTP secret
 * - Generate TOTP QR code URI
 * - Verify TOTP token
 * - Backup codes generation and verification
 */

import * as OTPAuth from 'otpauth';

/**
 * Generate a new TOTP secret for a user
 */
export function generateTOTPSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

/**
 * Generate TOTP URI for QR code generation
 * @param secret - TOTP secret
 * @param email - User email
 * @param issuer - Application name (e.g., "RentFlow")
 */
export function generateTOTPUri(secret: string, email: string, issuer: string = 'RentFlow'): string {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}

/**
 * Verify a TOTP token against a secret
 * @param token - 6-digit TOTP token
 * @param secret - TOTP secret
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'RentFlow',
      label: 'user',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    const delta = totp.validate({ token, window: 1 });
    return delta === 0;
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

/**
 * Generate backup codes for emergency access
 * @param count - Number of backup codes to generate (default: 10)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const secret = new OTPAuth.Secret({ size: 20 });
    const code = secret.base32.slice(0, 8).toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash backup codes for storage (use bcrypt or similar in production)
 * @param codes - Array of backup codes
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  // In production, use bcrypt or argon2 for hashing
  // For now, return simple hash (NOT PRODUCTION READY)
  return codes.map(code => btoa(code));
}

/**
 * Verify a backup code against hashed codes
 * @param code - Backup code to verify
 * @param hashedCodes - Array of hashed backup codes
 */
export async function verifyBackupCode(code: string, hashedCodes: string[]): Promise<boolean> {
  const hashedInput = btoa(code.toUpperCase());
  return hashedCodes.includes(hashedInput);
}

/**
 * Remove used backup code from the list
 * @param code - Used backup code
 * @param hashedCodes - Array of hashed backup codes
 */
export async function removeUsedBackupCode(code: string, hashedCodes: string[]): Promise<string[]> {
  const hashedInput = btoa(code.toUpperCase());
  return hashedCodes.filter(c => c !== hashedInput);
}

/**
 * Validate TOTP token format (6 digits)
 * @param token - TOTP token to validate
 */
export function validateTOTPFormat(token: string): boolean {
  return /^\d{6}$/.test(token);
}

/**
 * Validate backup code format (8 alphanumeric characters)
 * @param code - Backup code to validate
 */
export function validateBackupCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code.toUpperCase());
}
