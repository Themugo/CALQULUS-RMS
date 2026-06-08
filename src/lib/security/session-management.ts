/**
 * Device and Session Management System
 * 
 * Implements comprehensive session management with:
 * - Device registration and tracking
 * - Session lifecycle management
 * - Concurrent session limits
 * - Session security policies
 * - Device fingerprinting
 * - Session analytics
 */

// Session status
export enum SessionStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  TERMINATED = 'terminated',
}

// Device type
export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  UNKNOWN = 'unknown',
}

// Session
export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  token: string;
  refreshToken?: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
  status: SessionStatus;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokedReason?: string;
  metadata?: Record<string, unknown>;
}

// Device
export interface Device {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  os: string;
  browser: string;
  browserVersion: string;
  screenResolution?: string;
  language: string;
  timezone: string;
  isTrusted: boolean;
  isBlocked: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastIpAddress: string;
  locationHistory: Array<{
    ipAddress: string;
    location?: {
      latitude: number;
      longitude: number;
      city: string;
      country: string;
    };
    seenAt: Date;
  }>;
}

// Session policy
export interface SessionPolicy {
  id: string;
  name: string;
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  absoluteTimeoutMinutes: number;
  requireDeviceApproval: boolean;
  allowRememberDevice: boolean;
  rememberDeviceDays: number;
  enforceIPBinding: boolean;
  enforceGeoFencing: boolean;
  allowedCountries: string[];
  isActive: boolean;
}

// Device fingerprint
export interface DeviceFingerprint {
  deviceId: string;
  fingerprint: string;
  components: {
    userAgent: string;
    screenResolution: string;
    timezone: string;
    language: string;
    platform: string;
    hardwareConcurrency?: number;
    deviceMemory?: number;
    touchSupport: boolean;
    webGL?: string;
    canvas?: string;
  };
}

/**
 * Generate session token
 */
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(): string {
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate device ID
 */
export function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create session
 */
export function createSession(
  userId: string,
  deviceId: string,
  ipAddress: string,
  userAgent: string,
  policy: SessionPolicy,
  metadata?: Record<string, unknown>,
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  }
): Session {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + policy.sessionTimeoutMinutes * 60 * 1000);
  
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    deviceId,
    token: generateSessionToken(),
    refreshToken: generateRefreshToken(),
    ipAddress,
    userAgent,
    location,
    status: SessionStatus.ACTIVE,
    createdAt: now,
    lastActivityAt: now,
    expiresAt,
    metadata,
  };
}

/**
 * Refresh session
 */
export function refreshSession(
  session: Session,
  policy: SessionPolicy
): Session {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + policy.sessionTimeoutMinutes * 60 * 1000);
  
  return {
    ...session,
    token: generateSessionToken(),
    refreshToken: generateRefreshToken(),
    lastActivityAt: now,
    expiresAt,
  };
}

/**
 * Revoke session
 */
export function revokeSession(session: Session): Session {
  return {
    ...session,
    status: SessionStatus.REVOKED,
    revokedAt: new Date(),
    revokedReason: 'Session revoked',
  };
}

/**
 * Terminate session
 */
export function terminateSession(session: Session): Session {
  return {
    ...session,
    status: SessionStatus.TERMINATED,
    revokedAt: new Date(),
    revokedReason: 'User terminated',
  };
}

/**
 * Check if session is expired
 */
export function isSessionExpired(session: Session): boolean {
  return new Date() > session.expiresAt;
}

/**
 * Check if session is idle
 */
export function isSessionIdle(session: Session, idleTimeoutMinutes: number): boolean {
  const now = new Date();
  const idleTime = now.getTime() - session.lastActivityAt.getTime();
  const idleTimeoutMs = idleTimeoutMinutes * 60 * 1000;
  
  return idleTime > idleTimeoutMs;
}

/**
 * Update session activity
 */
export function updateSessionActivity(session: Session): Session {
  return {
    ...session,
    lastActivityAt: new Date(),
    status: SessionStatus.ACTIVE,
  };
}

/**
 * Create device
 */
export function createDevice(
  userId: string,
  deviceId: string,
  userAgent: string,
  ipAddress: string,
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  }
): Device {
  const deviceInfo = parseUserAgent(userAgent);
  
  return {
    id: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    deviceId,
    deviceName: generateDeviceName(deviceInfo),
    deviceType: deviceInfo.type,
    os: deviceInfo.os,
    browser: deviceInfo.browser,
    browserVersion: deviceInfo.version,
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isTrusted: false,
    isBlocked: false,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    lastIpAddress: ipAddress,
    locationHistory: location ? [{
      ipAddress,
      location,
      seenAt: new Date(),
    }] : [],
  };
}

/**
 * Parse user agent
 */
function parseUserAgent(userAgent: string): {
  type: DeviceType;
  os: string;
  browser: string;
  version: string;
} {
  const ua = userAgent.toLowerCase();
  
  let type = DeviceType.DESKTOP;
  let os = 'Unknown';
  let browser = 'Unknown';
  let version = 'Unknown';
  
  // Detect OS
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os x')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios')) os = 'iOS';
  
  // Detect browser
  if (ua.includes('chrome')) {
    browser = 'Chrome';
    const match = ua.match(/chrome\/(\d+\.\d+\.\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
    const match = ua.match(/firefox\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
    const match = ua.match(/version\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (ua.includes('edge')) {
    browser = 'Edge';
    const match = ua.match(/edge\/(\d+\.\d+\.\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
  }
  
  // Detect device type
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    type = DeviceType.MOBILE;
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    type = DeviceType.TABLET;
  }
  
  return { type, os, browser, version };
}

/**
 * Generate device name
 */
function generateDeviceName(deviceInfo: {
  type: DeviceType;
  os: string;
  browser: string;
  version: string;
}): string {
  return `${deviceInfo.os} - ${deviceInfo.browser} ${deviceInfo.version}`;
}

/**
 * Update device last seen
 */
export function updateDeviceLastSeen(
  device: Device,
  ipAddress: string,
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  }
): Device {
  return {
    ...device,
    lastSeenAt: new Date(),
    lastIpAddress: ipAddress,
    locationHistory: location ? [
      ...device.locationHistory,
      {
        ipAddress,
        location,
        seenAt: new Date(),
      },
    ] : device.locationHistory,
  };
}

/**
 * Trust device
 */
export function trustDevice(device: Device): Device {
  return {
    ...device,
    isTrusted: true,
  };
}

/**
 * Block device
 */
export function blockDevice(device: Device, _reason?: string): Device {
  return {
    ...device,
    isBlocked: true,
  };
}

/**
 * Unblock device
 */
export function unblockDevice(device: Device): Device {
  return {
    ...device,
    isBlocked: false,
  };
}

/**
 * Check concurrent session limit
 */
export function checkConcurrentSessionLimit(
  userId: string,
  sessions: Session[],
  policy: SessionPolicy
): {
  withinLimit: boolean;
  currentCount: number;
  limit: number;
  sessionsToRevoke: Session[];
} {
  const userSessions = sessions.filter(s => s.userId === userId && s.status === SessionStatus.ACTIVE);
  const currentCount = userSessions.length;
  
  if (currentCount <= policy.maxConcurrentSessions) {
    return {
      withinLimit: true,
      currentCount,
      limit: policy.maxConcurrentSessions,
      sessionsToRevoke: [],
    };
  }
  
  // Revoke oldest sessions
  const sessionsToRevoke = userSessions
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, currentCount - policy.maxConcurrentSessions);
  
  return {
    withinLimit: false,
    currentCount,
    limit: policy.maxConcurrentSessions,
    sessionsToRevoke,
  };
}

/**
 * Check IP binding
 */
export function checkIPBinding(
  session: Session,
  currentIpAddress: string,
  policy: SessionPolicy
): boolean {
  if (!policy.enforceIPBinding) {
    return true;
  }
  
  return session.ipAddress === currentIpAddress;
}

/**
 * Check geo-fencing
 */
export function checkGeoFencing(
  session: Session,
  policy: SessionPolicy,
  currentLocation?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  }
): boolean {
  if (!policy.enforceGeoFencing) {
    return true;
  }
  
  if (!session.location || !currentLocation) {
    return false;
  }
  
  // Check if country is allowed
  if (policy.allowedCountries.length > 0) {
    return policy.allowedCountries.includes(currentLocation.country);
  }
  
  // Check if within reasonable distance (100km)
  const distance = calculateDistance(
    session.location.latitude,
    session.location.longitude,
    currentLocation.latitude,
    currentLocation.longitude
  );
  
  return distance <= 100;
}

/**
 * Calculate distance between two points
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Generate device fingerprint
 */
export async function generateDeviceFingerprint(components: DeviceFingerprint['components']): Promise<string> {
  const data = JSON.stringify(components);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Get default session policy
 */
export function getDefaultSessionPolicy(): Omit<SessionPolicy, 'id'> {
  return {
    name: 'Default Session Policy',
    maxConcurrentSessions: 5,
    sessionTimeoutMinutes: 60,
    idleTimeoutMinutes: 30,
    absoluteTimeoutMinutes: 480, // 8 hours
    requireDeviceApproval: false,
    allowRememberDevice: true,
    rememberDeviceDays: 30,
    enforceIPBinding: false,
    enforceGeoFencing: false,
    allowedCountries: [],
    isActive: true,
  };
}

/**
 * Get session status label
 */
export function getSessionStatusLabel(status: SessionStatus): string {
  const labels: Record<SessionStatus, string> = {
    [SessionStatus.ACTIVE]: 'Active',
    [SessionStatus.IDLE]: 'Idle',
    [SessionStatus.EXPIRED]: 'Expired',
    [SessionStatus.REVOKED]: 'Revoked',
    [SessionStatus.TERMINATED]: 'Terminated',
  };

  return labels[status];
}

/**
 * Get device type label
 */
export function getDeviceTypeLabel(type: DeviceType): string {
  const labels: Record<DeviceType, string> = {
    [DeviceType.DESKTOP]: 'Desktop',
    [DeviceType.MOBILE]: 'Mobile',
    [DeviceType.TABLET]: 'Tablet',
    [DeviceType.UNKNOWN]: 'Unknown',
  };

  return labels[type];
}

/**
 * Get session analytics
 */
export function getSessionAnalytics(sessions: Session[]): {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  revokedSessions: number;
  averageSessionDuration: number;
  byDeviceType: Record<DeviceType, number>;
  byCountry: Record<string, number>;
} {
  const active = sessions.filter(s => s.status === SessionStatus.ACTIVE).length;
  const expired = sessions.filter(s => s.status === SessionStatus.EXPIRED).length;
  const revoked = sessions.filter(s => s.status === SessionStatus.REVOKED).length;
  
  // Calculate average session duration
  const completedSessions = sessions.filter(s => s.revokedAt || isSessionExpired(s));
  const durations = completedSessions.map(s => {
    const endTime = s.revokedAt || (isSessionExpired(s) ? s.expiresAt : new Date());
    return endTime.getTime() - s.createdAt.getTime();
  });
  const averageDuration = durations.length > 0 
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
    : 0;
  
  // By device type (would need device info)
  const byDeviceType: Record<DeviceType, number> = {
    [DeviceType.DESKTOP]: 0,
    [DeviceType.MOBILE]: 0,
    [DeviceType.TABLET]: 0,
    [DeviceType.UNKNOWN]: 0,
  };
  
  // By country
  const byCountry: Record<string, number> = {};
  for (const session of sessions) {
    if (session.location) {
      byCountry[session.location.country] = (byCountry[session.location.country] || 0) + 1;
    }
  }
  
  return {
    totalSessions: sessions.length,
    activeSessions: active,
    expiredSessions: expired,
    revokedSessions: revoked,
    averageSessionDuration: averageDuration / (1000 * 60), // Convert to minutes
    byDeviceType,
    byCountry,
  };
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(sessions: Session[]): Session[] {
  return sessions.filter(session => !isSessionExpired(session));
}

/**
 * Get active sessions for user
 */
export function getActiveSessionsForUser(
  userId: string,
  sessions: Session[]
): Session[] {
  return sessions.filter(s => s.userId === userId && s.status === SessionStatus.ACTIVE);
}

/**
 * Revoke all sessions for user
 */
export function revokeAllSessionsForUser(
  userId: string,
  sessions: Session[],
  _reason: string
): Session[] {
  return sessions.map(session => {
    if (session.userId === userId && session.status === SessionStatus.ACTIVE) {
      return revokeSession(session);
    }
    return session;
  });
}
