import { format } from 'date-fns';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth, type PlatformAdminInfo, type PlatformAdminType } from '@/features/auth/AuthContext';
import { Crown, Shield, User, UserPlus, Ban, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useActivityLog } from '@/shared/hooks/useActivityLog';

const ADMIN_TYPE_LABELS: Record<PlatformAdminType, string> = {
  owner: 'Owner',
  business: 'Business',
  admin: 'Admin',
};

const ADMIN_TYPE_BADGES: Record<PlatformAdminType, React.ReactNode> = {
  owner: <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><Crown className="h-3 w-3 mr-1" />Owner</Badge>,
  business: <Badge className="bg-blue-100 text-blue-800 border-blue-300"><Shield className="h-3 w-3 mr-1" />Business</Badge>,
  admin: <Badge variant="outline" className="border-purple-300 text-purple-700"><User className="h-3 w-3 mr-1" />Admin</Badge>,
};

const SUSPENSION_RULES = {
  owner: 'Cannot be suspended (immutable)',
  business: 'Can be suspended by Owner only',
  admin: 'Can be suspended by Owner or Business',
};

const PlatformAdminManagement = () => {
  const { toast } = useToast();
  const { user: currentUser, isPlatformOwner, isPlatformBusiness, platformAdminInfo } = useAuth();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<PlatformAdminInfo | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    displayName: '',
    adminType: 'admin' as PlatformAdminType,
  });

  const canManage = isPlatformOwner || isPlatformBusiness;
  const canCreateOwner = isPlatformOwner;

  const { data: admins, isLoading } = useQuery({
    queryKey: ['platform-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_admins')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as PlatformAdminInfo[];
    },
    enabled: canManage,
  });

  const canSuspend = (admin: PlatformAdminInfo): boolean => {
    if (admin.is_immutable) return false;
    if (isPlatformOwner) return true;
    if (isPlatformBusiness && admin.admin_type !== 'owner') return true;
    return false;
  };

  const createAdmin = useMutation({
    mutationFn: async () => {
      const redirectUrl = `${window.location.origin}/webhost/dashboard`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newAdmin.email,
        password: newAdmin.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: newAdmin.displayName },
        },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: authData.user.id, role: 'webhost', approval_status: 'approved' });
      if (roleError) throw roleError;
      const { error: permError } = await supabase
        .from('admin_permissions')
        .insert({
          user_id: authData.user.id,
          admin_level: newAdmin.adminType === 'owner' ? 'super_admin' : newAdmin.adminType === 'business' ? 'super_admin' : 'admin',
          can_manage_managers: true,
          can_manage_billing: true,
          can_manage_properties: true,
          can_create_webhosts: newAdmin.adminType === 'owner',
          can_manage_system_landlords: true,
          can_view_activity_logs: true,
          created_by: currentUser?.id,
        });
      if (permError) throw permError;
      const { error } = await supabase
        .from('platform_admins')
        .insert({
          user_id: authData.user.id,
          admin_type: newAdmin.adminType,
          display_name: newAdmin.displayName,
          email: newAdmin.email,
          can_create_admins: newAdmin.adminType === 'owner' || newAdmin.adminType === 'business',
          can_manage_managers: true,
          can_manage_billing: true,
          can_manage_properties: true,
          can_manage_landlords: true,
          can_view_activity_logs: true,
          can_manage_platform_settings: newAdmin.adminType === 'owner' || newAdmin.adminType === 'business',
          is_immutable: newAdmin.adminType === 'owner',
          created_by: currentUser?.id,
        });
      if (error) throw error;
      logActivity({
        action: 'Created Platform Admin',
        entityType: 'platform_admins',
        entityId: authData.user.id,
        metadata: { email: newAdmin.email, adminType: newAdmin.adminType, name: newAdmin.displayName },
      });
    },
    onSuccess: () => {
      toast({ title: 'Platform admin created' });
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      setIsDialogOpen(false);
      setNewAdmin({ email: '', password: '', displayName: '', adminType: 'admin' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  const toggleSuspend = useMutation({
    mutationFn: async ({ admin, reason }: { admin: PlatformAdminInfo; reason: string }) => {
      if (!canSuspend(admin)) throw new Error('You do not have permission to suspend this admin');
      const newSuspended = !admin.suspended;
      const { error } = await supabase
        .from('platform_admins')
        .update({
          suspended: newSuspended,
          suspended_at: newSuspended ? new Date().toISOString() : null,
          suspended_by: newSuspended ? currentUser?.id : null,
          suspension_reason: newSuspended ? reason : null,
          updated_by: currentUser?.id,
        })
        .eq('id', admin.id);
      if (error) throw error;
      // Also suspend/unsuspend admin_permissions for admin type
      if (admin.admin_type === 'admin') {
        await supabase.from('admin_permissions').update({ admin_level: newSuspended ? 'limited_admin' : 'admin' }).eq('user_id', admin.user_id);
      }
      logActivity({
        action: newSuspended ? 'Suspended Platform Admin' : 'Unsuspended Platform Admin',
        entityType: 'platform_admins',
        entityId: admin.id,
        metadata: { email: admin.email, reason, by: currentUser?.email },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      setSuspendTarget(null);
      setSuspendReason('');
      toast({ title: 'Updated' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteAdmin = useMutation({
    mutationFn: async (admin: PlatformAdminInfo) => {
      if (admin.is_immutable) throw new Error('Cannot delete immutable admin');
      // Remove platform_admin record, admin_permissions, and user_role
      await supabase.from('platform_admins').delete().eq('id', admin.id);
      await supabase.from('admin_permissions').delete().eq('user_id', admin.user_id);
      await supabase.from('user_roles').delete().eq('user_id', admin.user_id).eq('role', 'webhost');
      logActivity({
        action: 'Deleted Platform Admin',
        entityType: 'platform_admins',
        entityId: admin.id,
        metadata: { email: admin.email, adminType: admin.admin_type },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      toast({ title: 'Admin removed' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Platform Admin Hierarchy
            </CardTitle>
            <CardDescription>
              Manage owner, business, and admin accounts with suspension rules.
              {canCreateOwner && (
                <span className="block mt-1 text-xs text-muted-foreground">
                  Owner is immutable — cannot be suspended or deleted. Business can be suspended by Owner only.
                  Admin can be suspended by Owner or Business.
                </span>
              )}
            </CardDescription>
          </div>
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Platform Admin</DialogTitle>
                  <DialogDescription>
                    {canCreateOwner ? 'You can create owner, business, or admin accounts.' : 'You can create admin accounts only.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Admin Type</Label>
                    <Select
                      value={newAdmin.adminType}
                      onValueChange={(v: PlatformAdminType) => setNewAdmin(prev => ({ ...prev, adminType: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {canCreateOwner && <SelectItem value="owner">Owner (immutable)</SelectItem>}
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input value={newAdmin.displayName} onChange={e => setNewAdmin(prev => ({ ...prev, displayName: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={newAdmin.email} onChange={e => setNewAdmin(prev => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={newAdmin.password} onChange={e => setNewAdmin(prev => ({ ...prev, password: e.target.value }))} />
                  </div>
                  {newAdmin.adminType === 'owner' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>Owner accounts are immutable and cannot be suspended or deleted. Only one owner should exist.</span>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => createAdmin.mutate()}
                    disabled={createAdmin.isPending || !newAdmin.email || !newAdmin.password || !newAdmin.displayName}
                  >
                    {createAdmin.isPending ? 'Creating...' : 'Create Admin'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !canManage ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Only platform owners and business admins can manage the admin hierarchy.</p>
          </div>
        ) : !admins || admins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No platform admins configured yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map(admin => (
                <TableRow key={admin.id} className={admin.suspended ? 'opacity-60' : ''}>
                  <TableCell>{ADMIN_TYPE_BADGES[admin.admin_type]}</TableCell>
                  <TableCell className="font-medium">{admin.display_name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    {admin.suspended ? (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <Ban className="h-3 w-3" /> Suspended
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit bg-green-100 text-green-800 border-green-300">
                        <CheckCircle className="h-3 w-3" /> Active
                      </Badge>
                    )}
                    {admin.is_immutable && (
                      <Badge variant="outline" className="ml-1 border-yellow-300 text-yellow-700">
                        <Crown className="h-3 w-3 mr-1" />Immutable
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {'created_at' in admin ? format(new Date((admin as any).created_at), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canSuspend(admin) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSuspendTarget(admin);
                            setSuspendReason('');
                          }}
                        >
                          {admin.suspended ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          <span className="ml-1">{admin.suspended ? 'Unsuspend' : 'Suspend'}</span>
                        </Button>
                      )}
                      {isPlatformOwner && !admin.is_immutable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm(`Remove ${admin.display_name} as platform admin?`)) {
                              deleteAdmin.mutate(admin);
                            }
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Suspend dialog */}
      <AlertDialog open={!!suspendTarget} onOpenChange={v => !v && setSuspendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendTarget?.suspended ? 'Unsuspend' : 'Suspend'} {suspendTarget?.display_name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendTarget?.suspended ? (
                'Re-activate this admin account.'
              ) : (
                <>
                  <p className="mb-2">This will restrict {suspendTarget?.admin_type} access to the platform.</p>
                  {suspendTarget && (
                    <span className="text-xs text-muted-foreground block">
                      {SUSPENSION_RULES[suspendTarget.admin_type]}
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!suspendTarget?.suspended && (
            <div className="space-y-2">
              <Label>Reason for suspension</Label>
              <Input value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Required" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (suspendTarget) toggleSuspend.mutate({ admin: suspendTarget, reason: suspendReason });
              }}
              disabled={!suspendTarget?.suspended && !suspendReason}
            >
              {suspendTarget?.suspended ? 'Unsuspend' : 'Suspend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PlatformAdminManagement;
