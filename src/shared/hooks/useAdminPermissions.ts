import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';

export interface AdminPermissions {
  id: string;
  user_id: string;
  admin_level: 'super_admin' | 'admin' | 'limited_admin';
  can_manage_managers: boolean;
  can_manage_billing: boolean;
  can_manage_properties: boolean;
  can_create_webhosts: boolean;
  can_manage_system_landlords: boolean;
  can_view_activity_logs: boolean;

  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type WebhostPermissionKey = keyof Pick<AdminPermissions,
  | 'can_manage_managers'
  | 'can_manage_billing'
  | 'can_manage_properties'
  | 'can_create_webhosts'
  | 'can_manage_system_landlords'
  | 'can_view_activity_logs'
>;

export const useAdminPermissions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myPermissions, isLoading: isLoadingMyPermissions } = useQuery({
    queryKey: ['my-admin-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as AdminPermissions | null;
    },
    enabled: !!user?.id,
    retry: 2,
  });

  const { data: allPermissions, isLoading: isLoadingAllPermissions } = useQuery({
    queryKey: ['all-admin-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as AdminPermissions[];
    },
    enabled: myPermissions?.admin_level === 'super_admin',
  });

  const bootstrapSuperAdmin = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user logged in');
      const { data: existing } = await supabase
        .from('admin_permissions')
        .select('id').eq('admin_level', 'super_admin').limit(1);
      if (existing && existing.length > 0) throw new Error('A super admin already exists');
      const { data, error } = await supabase
        .from('admin_permissions')
        .insert({
          user_id: user.id,
          admin_level: 'super_admin',
          can_manage_managers: true,
          can_manage_billing: true,
          can_manage_properties: true,
          can_create_webhosts: true,
          can_manage_system_landlords: true,
          can_view_activity_logs: true,
        })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-admin-permissions'] });
      toast({ title: 'Super admin initialized' });
    },
    onError: (error: Error) => {
      if (!error.message.includes('duplicate') && !error.message.includes('already exists')) {
        toast({ title: 'Failed to initialize', variant: 'destructive' });
      }
    },
  });

  const createPermissions = useMutation({
    mutationFn: async (permissions: Partial<AdminPermissions> & { user_id: string }) => {
      const { data, error } = await supabase
        .from('admin_permissions')
        .insert({
          user_id: permissions.user_id,
          admin_level: permissions.admin_level || 'limited_admin',
          can_manage_managers: permissions.can_manage_managers ?? false,
          can_manage_billing: permissions.can_manage_billing ?? false,
          can_manage_properties: permissions.can_manage_properties ?? false,
          can_create_webhosts: false,
          can_manage_system_landlords: permissions.can_manage_system_landlords ?? false,
          can_view_activity_logs: permissions.can_view_activity_logs ?? true,
          created_by: user?.id,
        })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-admin-permissions'] });
      toast({ title: 'Permissions created' });
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const updatePermissions = useMutation({
    mutationFn: async ({ id, ...permissions }: Partial<AdminPermissions> & { id: string }) => {
      const sanitized = { ...permissions };
      if (myPermissions?.admin_level !== 'super_admin') sanitized.can_create_webhosts = false;
      const { data, error } = await supabase
        .from('admin_permissions')
        .update(sanitized).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-admin-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['my-admin-permissions'] });
      toast({ title: 'Permissions updated' });
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const deletePermissions = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('admin_permissions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-admin-permissions'] });
      toast({ title: 'Permissions removed' });
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const hasPermission = (permission: WebhostPermissionKey): boolean => {
    if (!myPermissions) return false;
    if (myPermissions.admin_level === 'super_admin') return true;
    return myPermissions[permission] as boolean;
  };

  return {
    myPermissions,
    allPermissions,
    isLoadingMyPermissions,
    isLoadingAllPermissions,
    isSuperAdmin: myPermissions?.admin_level === 'super_admin',
    isWebhostAdmin: !!myPermissions && myPermissions.admin_level !== 'super_admin',
    hasPermission,
    bootstrapSuperAdmin,
    createPermissions,
    updatePermissions,
    deletePermissions,
  };
};
