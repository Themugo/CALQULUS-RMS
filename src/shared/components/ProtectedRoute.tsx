import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, AppRole, AdminLevel, WebhostPermissions } from '@/features/auth/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  /** For webhost routes: require at least this admin_level */
  minAdminLevel?: AdminLevel;
  /** For webhost routes: require this specific permission */
  requirePermission?: keyof WebhostPermissions;
}

/** Ordered so we can compare: super_admin > admin > limited_admin */
const ADMIN_LEVEL_ORDER: Record<AdminLevel, number> = {
  super_admin:   3,
  admin:         2,
  limited_admin: 1,
};

const ROLE_HOME: Record<AppRole, string> = {
  tenant:     '/portal',
  webhost:    '/webhost',
  submanager: '/',
  manager:    '/',
  landlord:   '/landlord/dashboard',
  agency:     '/agency',
};

const LOGIN_PATH: Record<AppRole, string> = {
  tenant:     '/tenant/login',
  webhost:    '/webhost/login',
  submanager: '/landlord',
  manager:    '/landlord',
  landlord:   '/landlord/login',
  agency:     '/agency/login',
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  minAdminLevel,
  requirePermission,
}) => {
  const { user, userRole, loading, webhostPermissions, isSuperAdmin } = useAuth();

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ── Not authenticated ────────────────────────────────────────────
  if (!user) {
    // Pick login path based on what role this route requires
    const targetRole = allowedRoles?.[0] ?? 'manager';
    return <Navigate to={LOGIN_PATH[targetRole] ?? '/landlord'} replace />;
  }

  // ── Role not resolved yet ────────────────────────────────────────
  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const effectiveRole = userRole.role;

  // ── Pending manager ──────────────────────────────────────────────
  // Note: App.tsx routes pending managers to /pending-approval at the
  // top level. We mirror that here so this guard cannot accidentally
  // grant a pending manager access to a manager-only page if App-level
  // routing is ever bypassed (defence in depth).
  if (effectiveRole === 'manager' && userRole.approval_status === 'pending') {
    return <Navigate to="/" replace />;
  }
  if (effectiveRole === 'manager' && userRole.approval_status === 'rejected') {
    return <Navigate to="/" replace />;
  }

  // ── Role check ───────────────────────────────────────────────────
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(effectiveRole)) {
    return <Navigate to={ROLE_HOME[effectiveRole] ?? '/auth'} replace />;
  }

  // ── Webhost: admin level check ───────────────────────────────────
  if (effectiveRole === 'webhost' && minAdminLevel && webhostPermissions) {
    const required = ADMIN_LEVEL_ORDER[minAdminLevel] ?? 0;
    const actual   = ADMIN_LEVEL_ORDER[webhostPermissions.admin_level] ?? 0;
    if (actual < required) {
      return <Navigate to="/webhost" replace />;
    }
  }

  // ── Webhost: specific permission check ──────────────────────────
  if (effectiveRole === 'webhost' && requirePermission && !isSuperAdmin) {
    if (!webhostPermissions || !webhostPermissions[requirePermission]) {
      return <Navigate to="/webhost" replace />;
    }
  }

  // ── Webhost: HARD BLOCK from any tenant/manager route ───────────
  // This is a defence-in-depth check. Routes are already separated
  // by role in App.tsx, but this catches any misconfiguration.
  if (effectiveRole === 'webhost') {
    const blockedPrefixes = ['/portal', '/tenant', '/tenants', '/properties', '/leases', '/billing', '/contracts'];
    const currentPath = window.location.pathname;
    if (blockedPrefixes.some(p => currentPath.startsWith(p))) {
      return <Navigate to="/webhost" replace />;
    }
  }

  // ── Landlord: HARD BLOCK from manager/tenant routes ─────────────
  if (effectiveRole === 'landlord') {
    const blockedPrefixes = ['/portal', '/tenant', '/', '/properties'];
    const currentPath = window.location.pathname;
    if (blockedPrefixes.some(p => currentPath === p) ||
        currentPath.startsWith('/portal') || currentPath.startsWith('/tenant/')) {
      return <Navigate to="/landlord/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
