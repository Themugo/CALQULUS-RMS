/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logError, logWarning } from '@/shared/lib/errorLogger';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { signupRedirectPath } from '@/features/auth/lib/authFlow';

export type AppRole = 'manager' | 'tenant' | 'webhost' | 'submanager' | 'landlord' | 'agency';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type AdminLevel = 'super_admin' | 'admin' | 'limited_admin';
export type PlatformAdminType = 'owner' | 'business' | 'admin';

export interface PlatformAdminInfo {
  id: string;
  user_id: string;
  admin_type: PlatformAdminType;
  display_name: string;
  email: string;
  can_create_admins: boolean;
  can_manage_managers: boolean;
  can_manage_billing: boolean;
  can_manage_properties: boolean;
  can_manage_landlords: boolean;
  can_view_activity_logs: boolean;
  can_manage_platform_settings: boolean;
  is_immutable: boolean;
  suspended: boolean;
}

export interface UserRole {
  role: AppRole;
  tenant_id: string | null;
  approval_status: ApprovalStatus;
}

export interface WebhostPermissions {
  admin_level: AdminLevel;
  can_create_webhosts: boolean;
  can_manage_managers: boolean;
  can_manage_billing: boolean;
  can_manage_properties: boolean;
  can_manage_system_landlords: boolean;
  can_view_activity_logs: boolean;
}

export interface SubmanagerPermissions {
  can_view_properties: boolean;
  can_view_tenants: boolean;
  can_view_leases: boolean;
  can_view_invoices: boolean;
  can_view_maintenance: boolean;
  can_view_contracts: boolean;
  can_view_activity_logs: boolean;
  restrict_to_assigned_properties: boolean;
  can_record_payments: boolean;
  can_edit_tenants: boolean;
  can_manage_maintenance: boolean;
  can_create_invoices: boolean;
  can_approve_moveouts: boolean;
  can_send_notices: boolean;
  can_upload_documents: boolean;
  assigned_property_ids: string[];
  manager_id: string | null;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  isManager: boolean;
  isTenant: boolean;
  isSubmanager: boolean;
  isLandlord: boolean;
  isAgency: boolean;
  isWebhost: boolean;
  isSuperAdmin: boolean;
  platformAdminInfo: PlatformAdminInfo | null;
  isPlatformOwner: boolean;
  isPlatformBusiness: boolean;
  isPlatformAdmin: boolean;
  webhostPermissions: WebhostPermissions | null;
  submanagerPermissions: SubmanagerPermissions | null;
  /** Property IDs linked to the landlord account (owner portal) */
  landlordPropertyIds: string[];
  hasWebhostPermission: (key: keyof WebhostPermissions) => boolean;
  canSubmanager: (key: keyof Omit<SubmanagerPermissions, 'assigned_property_ids' | 'manager_id' | 'restrict_to_assigned_properties'>) => boolean;
  canWrite: (key: keyof Omit<SubmanagerPermissions, 'assigned_property_ids' | 'manager_id' | 'restrict_to_assigned_properties'>) => boolean;
  canAccessProperty: (propertyId: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole, tenantId?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

interface AdminPermissionsRow {
  admin_level: AdminLevel;
  can_create_webhosts: boolean;
  can_manage_managers: boolean;
  can_manage_billing: boolean;
  can_manage_properties: boolean;
  can_manage_system_landlords: boolean;
  can_view_activity_logs: boolean;
}

interface SubmanagerPermissionsRow {
  can_view_properties: boolean;
  can_view_tenants: boolean;
  can_view_leases: boolean;
  can_view_invoices: boolean;
  can_view_maintenance: boolean;
  can_view_contracts: boolean;
  can_view_activity_logs: boolean;
  restrict_to_assigned_properties: boolean;
  can_record_payments: boolean;
  can_edit_tenants: boolean;
  can_manage_maintenance: boolean;
  can_create_invoices: boolean;
  can_approve_moveouts: boolean;
  can_send_notices: boolean;
  can_upload_documents: boolean;
  manager_id: string | null;
}

interface PropertyAssignmentRow {
  property_id: string;
}

const defaultSubmanagerPermissions: SubmanagerPermissions = {
  can_view_properties: true,
  can_view_tenants: false,
  can_view_leases: false,
  can_view_invoices: false,
  can_view_maintenance: true,
  can_view_contracts: false,
  can_view_activity_logs: false,
  restrict_to_assigned_properties: true,
  can_record_payments: false,
  can_edit_tenants: false,
  can_manage_maintenance: false,
  can_create_invoices: false,
  can_approve_moveouts: false,
  can_send_notices: false,
  can_upload_documents: true,
  assigned_property_ids: [],
  manager_id: null,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [webhostPermissions, setWebhostPermissions] = useState<WebhostPermissions | null>(null);
  const [submanagerPermissions, setSubmanagerPermissions] = useState<SubmanagerPermissions | null>(null);
  const [platformAdminInfo, setPlatformAdminInfo] = useState<PlatformAdminInfo | null>(null);
  const [landlordPropertyIds, setLandlordPropertyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const authTimeoutMs = Number(import.meta.env.VITE_AUTH_TIMEOUT_MS ?? 8000);

  const pickRoleForPath = useCallback((roles: UserRole[], pathname: string): UserRole => {
    const byRole = new Map<AppRole, UserRole>();
    for (const r of roles) byRole.set(r.role, r);
    if (pathname.startsWith('/landlord/dashboard')) {
      const l = byRole.get('landlord'); if (l) return l;
    }
    if (pathname.startsWith('/webhost')) {
      const w = byRole.get('webhost'); if (w) return w;
    }
    if (pathname.startsWith('/agency')) {
      const a = byRole.get('agency'); if (a) return a;
    }
    if (pathname.startsWith('/portal') || pathname.startsWith('/tenant')) {
      const t = byRole.get('tenant'); if (t) return t;
    }
    const managerPaths = ['/', '/properties', '/tenants', '/billing', '/settings',
      '/maintenance', '/contracts', '/leases', '/vacation-notices', '/payments',
      '/platform-billing', '/water-billing', '/reports',
      '/communications', '/landlord', '/invites', '/statements', '/services'];
    if (managerPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
      const m = byRole.get('manager'); if (m) return m;
      const s = byRole.get('submanager'); if (s) return s;
    }
    const priority: AppRole[] = ['manager', 'submanager', 'agency', 'webhost', 'landlord', 'tenant'];
    return [...roles].sort((a, b) => priority.indexOf(a.role) - priority.indexOf(b.role))[0];
  }, []);

  const fetchWebhostPermissions = useCallback(async (userId: string): Promise<WebhostPermissions | null> => {
    const { data } = await supabase
      .from('admin_permissions')
      .select('admin_level, can_create_webhosts, can_manage_managers, can_manage_billing, can_manage_properties, can_manage_system_landlords, can_view_activity_logs')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) return null;
    const row = data as AdminPermissionsRow;
    return {
      admin_level:                row.admin_level,
      can_create_webhosts:        row.can_create_webhosts ?? false,
      can_manage_managers:        row.can_manage_managers ?? false,
      can_manage_billing:         row.can_manage_billing ?? false,
      can_manage_properties:      row.can_manage_properties ?? false,
      can_manage_system_landlords:row.can_manage_system_landlords ?? false,
      can_view_activity_logs:     row.can_view_activity_logs ?? false,
    };
  }, []);

  const fetchSubmanagerPermissions = useCallback(async (userId: string): Promise<SubmanagerPermissions | null> => {
    const { data: perms } = await supabase
      .from('submanager_permissions')
      .select('can_view_properties, can_view_tenants, can_view_leases, can_view_invoices, can_view_maintenance, can_view_contracts, can_view_activity_logs, restrict_to_assigned_properties, can_record_payments, can_edit_tenants, can_manage_maintenance, can_create_invoices, can_approve_moveouts, can_send_notices, can_upload_documents, manager_id')
      .eq('submanager_user_id', userId)
      .maybeSingle();
    const { data: assignments } = await supabase
      .from('submanager_property_assignments')
      .select('property_id')
      .eq('submanager_user_id', userId);
    const assignedPropertyIds = (assignments || []).map((a: PropertyAssignmentRow) => a.property_id);
    if (!perms) {
      return { ...defaultSubmanagerPermissions, assigned_property_ids: assignedPropertyIds };
    }
    const row = perms as SubmanagerPermissionsRow;
    return {
      can_view_properties:           row.can_view_properties ?? true,
      can_view_tenants:               row.can_view_tenants ?? false,
      can_view_leases:                row.can_view_leases ?? false,
      can_view_invoices:              row.can_view_invoices ?? false,
      can_view_maintenance:           row.can_view_maintenance ?? true,
      can_view_contracts:             row.can_view_contracts ?? false,
      can_view_activity_logs:         row.can_view_activity_logs ?? false,
      restrict_to_assigned_properties:row.restrict_to_assigned_properties ?? true,
      can_record_payments:            row.can_record_payments ?? false,
      can_edit_tenants:               row.can_edit_tenants ?? false,
      can_manage_maintenance:         row.can_manage_maintenance ?? false,
      can_create_invoices:            row.can_create_invoices ?? false,
      can_approve_moveouts:           row.can_approve_moveouts ?? false,
      can_send_notices:               row.can_send_notices ?? false,
      can_upload_documents:           row.can_upload_documents ?? true,
      assigned_property_ids:          assignedPropertyIds,
      manager_id:                     row.manager_id ?? null,
    };
  }, []);

  const fetchPlatformAdminInfo = useCallback(async (userId: string): Promise<PlatformAdminInfo | null> => {
    const { data } = await supabase
      .from('platform_admins')
      .select('id, user_id, admin_type, display_name, email, can_create_admins, can_manage_managers, can_manage_billing, can_manage_properties, can_manage_landlords, can_view_activity_logs, can_manage_platform_settings, is_immutable, suspended')
      .eq('user_id', userId)
      .maybeSingle();
    return data as PlatformAdminInfo | null;
  }, []);

  const fetchLandlordPropertyIds = useCallback(async (userId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('property_landlords')
      .select('property_id')
      .eq('landlord_user_id', userId);
    return (data || []).map((r: { property_id: string }) => r.property_id);
  }, []);

  const fetchUserRole = useCallback(async (userId: string, retryCount = 0, pathnameOverride?: string): Promise<UserRole | null> => {
    const { data, error } = await supabase.from('user_roles').select('role, tenant_id, approval_status').eq('user_id', userId);
    if (error) {
      logError('AuthContext.fetchUserRole', error);
      // Retry with exponential backoff up to 3 times. Single-retry was too
      // tight for fresh signups where replication lag on a read replica can
      // exceed 500ms, leaving brand-new managers stuck on the role-resolve
      // screen and getting bounced to /auth.
      if (retryCount < 3) {
        const delay = 400 * Math.pow(2, retryCount); // 400ms, 800ms, 1600ms
        await new Promise(r => setTimeout(r, delay));
        return fetchUserRole(userId, retryCount + 1, pathnameOverride);
      }
      return null;
    }
    if (!data || data.length === 0) return null;
    const roles = data as UserRole[];
    const pathname = pathnameOverride ?? location.pathname ?? window.location.pathname ?? '/';
    const picked = pickRoleForPath(roles, pathname);
    if (picked.role === 'webhost') {
      fetchWebhostPermissions(userId).then(setWebhostPermissions);
      fetchPlatformAdminInfo(userId).then(setPlatformAdminInfo);
    } else {
      setWebhostPermissions(null);
      setPlatformAdminInfo(null);
    }
    if (picked.role === 'submanager') fetchSubmanagerPermissions(userId).then(setSubmanagerPermissions);
    else setSubmanagerPermissions(null);
    if (picked.role === 'landlord') {
      fetchLandlordPropertyIds(userId).then(setLandlordPropertyIds);
    } else {
      setLandlordPropertyIds([]);
    }
    return picked;
  }, [location.pathname, pickRoleForPath, fetchWebhostPermissions, fetchSubmanagerPermissions, fetchLandlordPropertyIds, fetchPlatformAdminInfo]);

  useEffect(() => {
    // Safety valve: if loading hasn't resolved within 8 s (was 5 s — too
    // aggressive for slower 3G), unblock the UI so the user can act. We
    // surface a toast so they understand why their session might appear
    // stale; the alternative was a silent spinner-then-redirect-to-login
    // loop that left users guessing.
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          logWarning('AuthContext', 'timeout');
          return false;
        }
        return prev;
      });
    }, Number.isFinite(authTimeoutMs) && authTimeoutMs > 0 ? authTimeoutMs : 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setLoading(true);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setUserRole(null);
        fetchUserRole(session.user.id).then(setUserRole).finally(() => setLoading(false));
      } else {
        setUserRole(null); setWebhostPermissions(null); setSubmanagerPermissions(null); setPlatformAdminInfo(null);
        setLandlordPropertyIds([]); setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id)
          .then(setUserRole)
          .catch((err) => {
            logError('AuthContext', `Failed to fetch user role: ${err}`);
            setUserRole(null);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      logError('AuthContext', `Failed to get session: ${err}`);
      setLoading(false);
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
    // `fetchUserRole` is memoised with useCallback. `loading` is intentionally
    // excluded — including it would cause this effect to re-run (and re-subscribe)
    // every time loading flips, creating a subscription leak / re-render loop.
  }, [fetchUserRole, authTimeoutMs]);

  // Route-change role re-pick: only needed for users with multiple roles
  // (e.g. someone who is both a manager AND a landlord) so we select the right
  // role for the current portal. We do NOT re-fetch from the DB on every
  // navigation — `location.pathname` alone triggers a local re-pick from the
  // already-loaded `userRole`, keeping navigation instant and query-free.
  useEffect(() => {
    if (!user?.id || !userRole) return;
    // Re-pick from cached roles without hitting the DB.
    // fetchUserRole is only called here when the pathname changes to a portal
    // the current role doesn't own (multi-role users crossing portals).
    const roleMatchesPath = (
      (userRole.role === 'manager'    && !location.pathname.startsWith('/portal') && !location.pathname.startsWith('/landlord/dashboard') && !location.pathname.startsWith('/webhost') && !location.pathname.startsWith('/agency')) ||
      (userRole.role === 'tenant'     && location.pathname.startsWith('/portal')) ||
      (userRole.role === 'landlord'   && location.pathname.startsWith('/landlord/dashboard')) ||
      (userRole.role === 'webhost'    && location.pathname.startsWith('/webhost')) ||
      (userRole.role === 'submanager' && !location.pathname.startsWith('/portal') && !location.pathname.startsWith('/landlord/dashboard') && !location.pathname.startsWith('/webhost') && !location.pathname.startsWith('/agency')) ||
      (userRole.role === 'agency'     && location.pathname.startsWith('/agency'))
    );
    if (!roleMatchesPath) {
      // User navigated to a different portal — re-fetch once to pick the right role.
      fetchUserRole(user.id).then(setUserRole);
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string, role: AppRole, tenantId?: string) => {
    const redirectPath = signupRedirectPath(role);
    const { data, error } = await supabase.auth.signUp({ email, password,
      options: { emailRedirectTo: `${window.location.origin}${redirectPath}`, data: { full_name: fullName, role } } });
    if (error) return { error: new Error(error.message) };
    if (data.user) {
      const { error: roleError } = await supabase.from('user_roles').upsert({
        user_id: data.user.id, role, tenant_id: role === 'tenant' ? tenantId : null,
        approval_status: role === 'manager' || role === 'agency' ? 'pending' : 'approved',
      }, {
        onConflict: 'user_id,role',
      });
      if (roleError) { logError('AuthContext.signUp', roleError); return { error: new Error('Failed to create role') }; }
      if (role === 'manager' || role === 'agency' || role === 'landlord') {
        supabase.functions.invoke('notify-new-manager-signup', {
          body: { managerEmail: email, managerName: fullName, role },
        }).catch((e: unknown) => logWarning('notify-new-signup failed:', e as Error));
      }
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Clear ALL cached queries so next user never sees previous user's data
    queryClient.clear();
    setUser(null); setSession(null); setUserRole(null);
    setWebhostPermissions(null); setSubmanagerPermissions(null); setPlatformAdminInfo(null); setLandlordPropertyIds([]);
  };

  const isManager    = userRole?.role === 'manager';
  const isTenant     = userRole?.role === 'tenant';
  const isWebhost    = userRole?.role === 'webhost';
  const isSubmanager = userRole?.role === 'submanager';
  const isLandlord   = userRole?.role === 'landlord';
  const isAgency     = userRole?.role === 'agency';
  const isSuperAdmin = isWebhost && webhostPermissions?.admin_level === 'super_admin';
  const isPlatformOwner = isWebhost && platformAdminInfo?.admin_type === 'owner';
  const isPlatformBusiness = isWebhost && platformAdminInfo?.admin_type === 'business';
  const isPlatformAdmin = isWebhost && platformAdminInfo?.admin_type === 'admin';

  const hasWebhostPermission = (key: keyof WebhostPermissions): boolean => {
    if (!isWebhost || !webhostPermissions) return false;
    if (isSuperAdmin) return true;
    return !!webhostPermissions[key];
  };

  const canSubmanager = (key: keyof Omit<SubmanagerPermissions, 'assigned_property_ids' | 'manager_id' | 'restrict_to_assigned_properties'>): boolean => {
    if (!isSubmanager || !submanagerPermissions) return false;
    return !!submanagerPermissions[key];
  };

  // canWrite: managers always true; submanagers check write flags
  const canWrite = (key: keyof Omit<SubmanagerPermissions, 'assigned_property_ids' | 'manager_id' | 'restrict_to_assigned_properties'>): boolean => {
    if (isManager) return true;
    if (!isSubmanager || !submanagerPermissions) return false;
    return !!submanagerPermissions[key];
  };

  const canAccessProperty = (propertyId: string): boolean => {
    if (isManager) return true;
    if (isLandlord && landlordPropertyIds.length > 0) {
      return landlordPropertyIds.includes(propertyId);
    }
    if (!isSubmanager || !submanagerPermissions) return false;
    if (!submanagerPermissions.restrict_to_assigned_properties) return true;
    return submanagerPermissions.assigned_property_ids.includes(propertyId);
  };

  return (
    <AuthContext.Provider value={{
      user, session, userRole, loading,
      isManager, isTenant, isWebhost, isSubmanager, isLandlord, isAgency, isSuperAdmin,
      platformAdminInfo, isPlatformOwner, isPlatformBusiness, isPlatformAdmin,
      webhostPermissions, submanagerPermissions, landlordPropertyIds,
      hasWebhostPermission, canSubmanager, canWrite, canAccessProperty,
      signIn, signUp, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
