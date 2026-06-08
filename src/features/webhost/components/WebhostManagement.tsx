import { format } from "date-fns";
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/features/auth/AuthContext';
import { Trash2, UserPlus, Mail, Shield, Crown, User, Settings, ArrowRightLeft } from 'lucide-react';
import { signupSchema, formatValidationErrors } from '@/shared/lib/validations';
import { useAdminPermissions } from '@/shared/hooks/useAdminPermissions';
import { useActivityLog } from '@/shared/hooks/useActivityLog';
import AdminPermissionsEditor from './AdminPermissionsEditor';

interface Webhost {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  permissions?: AdminPermissions | null;
}

const WebhostManagement = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<Webhost | null>(null);
  const [selectedWebhost, setSelectedWebhost] = useState<Webhost | null>(null);
  const [newWebhost, setNewWebhost] = useState({ email: '', password: '', fullName: '' });
  const [newPermissions, setNewPermissions] = useState<{
    admin_level: 'super_admin' | 'admin' | 'limited_admin';
    can_manage_managers: boolean;
    can_manage_billing: boolean;
    can_manage_properties: boolean;
    can_manage_system_landlords: boolean;
    can_view_activity_logs: boolean;
    can_create_webhosts: boolean;
  }>({
    admin_level: 'limited_admin',
    can_manage_managers: false,
    can_manage_billing: false,
    can_manage_properties: false,
    can_manage_system_landlords: false,
    can_view_activity_logs: true,
    can_create_webhosts: false,
  });

  const { logActivity } = useActivityLog();
  const { isSuperAdmin, webhostPermissions: myPermissions } = useAuth();
  const isLoadingMyPermissions = false; // permissions now come from AuthContext on login

  // Keep createPermissions/updatePermissions from the hook for write operations
  const { createPermissions, updatePermissions, bootstrapSuperAdmin } = useAdminPermissions();

  // Bootstrap super admin for first webhost only when no permission row exists.
  useEffect(() => {
    if (!isLoadingMyPermissions && user?.id && !myPermissions) {
      bootstrapSuperAdmin.mutate();
    }
  }, [isLoadingMyPermissions, myPermissions, bootstrapSuperAdmin, user?.id]);

  const { data: webhosts, isLoading } = useQuery({
    queryKey: ['webhost-webhosts'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('id, user_id, created_at')
        .eq('role', 'webhost');

      if (error) throw error;

      const webhostsWithProfiles = await Promise.all(
        (roles || []).map(async (role) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', role.user_id)
            .single();

          // Fetch permissions for each webhost
          const { data: permissions } = await supabase
            .from('admin_permissions')
            .select('*')
            .eq('user_id', role.user_id)
            .maybeSingle();

          return {
            id: role.id,
            user_id: role.user_id,
            email: profile?.email || 'Unknown',
            full_name: profile?.full_name || null,
            created_at: role.created_at,
            permissions: permissions as unknown as AdminPermissions | null,
          };
        })
      );

      return webhostsWithProfiles as Webhost[];
    },
  });

  const createWebhost = useMutation({
    mutationFn: async (data: { email: string; password: string; fullName: string }) => {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: data.fullName },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'webhost',
          approval_status: 'approved',
        });

      if (roleError) throw roleError;

      // Create admin permissions
      await createPermissions.mutateAsync({
        user_id: authData.user.id,
        ...newPermissions,
      });

      return { user: authData.user, email: data.email, fullName: data.fullName };
    },
    onSuccess: (result) => {
      // Log activity for new webhost creation
      logActivity({
        action: 'Created Webhost',
        entityType: 'admin_permissions',
        entityId: result.user.id,
        details: {
          email: result.email,
          name: result.fullName,
          admin_level: newPermissions.admin_level,
          permissions: newPermissions,
        },
      });
      toast({ title: 'Webhost account created successfully' });
      queryClient.invalidateQueries({ queryKey: ['webhost-webhosts'] });
      queryClient.invalidateQueries({ queryKey: ['webhost-stats'] });
      setIsDialogOpen(false);
      setNewWebhost({ email: '', password: '', fullName: '' });
      setNewPermissions({
        admin_level: 'limited_admin',
        can_manage_managers: false,
        can_manage_billing: false,
        can_manage_properties: false,
        can_manage_system_landlords: false,
        can_view_activity_logs: true,
        can_create_webhosts: false,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create webhost',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteWebhost = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Webhost role removed' });
      queryClient.invalidateQueries({ queryKey: ['webhost-webhosts'] });
      queryClient.invalidateQueries({ queryKey: ['webhost-stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove webhost',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateWebhost = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signupSchema.safeParse({
      email: newWebhost.email,
      password: newWebhost.password,
      fullName: newWebhost.fullName,
    });

    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: formatValidationErrors(validation.error),
        variant: 'destructive',
      });
      return;
    }

    createWebhost.mutate(newWebhost);
  };

  const handleEditPermissions = (webhost: Webhost) => {
    setSelectedWebhost(webhost);
    setIsPermissionsDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedWebhost?.permissions?.id) return;

    await updatePermissions.mutateAsync({
      id: selectedWebhost.permissions.id,
      admin_level: selectedWebhost.permissions.admin_level,
      can_manage_managers: selectedWebhost.permissions.can_manage_managers,
      can_manage_billing: selectedWebhost.permissions.can_manage_billing,
      can_manage_properties: selectedWebhost.permissions.can_manage_properties,
      can_manage_system_landlords: selectedWebhost.permissions.can_manage_system_landlords,
      can_view_activity_logs: selectedWebhost.permissions.can_view_activity_logs,
      can_create_webhosts: selectedWebhost.permissions.can_create_webhosts,
    });

    // Log activity for permission update
    logActivity({
      action: 'Updated Admin Permissions',
      entityType: 'admin_permissions',
      entityId: selectedWebhost.permissions.id,
      details: {
        target_email: selectedWebhost.email,
        target_name: selectedWebhost.full_name,
        new_admin_level: selectedWebhost.permissions.admin_level,
        permissions: {
          can_manage_managers: selectedWebhost.permissions.can_manage_managers,
          can_manage_billing: selectedWebhost.permissions.can_manage_billing,
          can_manage_properties: selectedWebhost.permissions.can_manage_properties,
          can_manage_system_landlords: selectedWebhost.permissions.can_manage_system_landlords,
          can_view_activity_logs: selectedWebhost.permissions.can_view_activity_logs,
          can_create_webhosts: selectedWebhost.permissions.can_create_webhosts,
        },
      },
    });

    queryClient.invalidateQueries({ queryKey: ['webhost-webhosts'] });
    setIsPermissionsDialogOpen(false);
    setSelectedWebhost(null);
  };

  // Transfer super admin rights mutation
  const transferSuperAdmin = useMutation({
    mutationFn: async (targetWebhost: Webhost) => {
      if (!myPermissions?.id || !targetWebhost.permissions?.id) {
        throw new Error('Missing permission records');
      }

      // Demote current super admin to admin
      const { error: demoteError } = await supabase
        .from('admin_permissions')
        .update({
          admin_level: 'admin',
          can_create_webhosts: false,
        })
        .eq('id', myPermissions.id);

      if (demoteError) throw demoteError;

      // Promote target to super admin
      const { error: promoteError } = await supabase
        .from('admin_permissions')
        .update({
          admin_level: 'super_admin',
          can_manage_managers: true,
          can_manage_billing: true,
          can_manage_properties: true,
          can_manage_system_landlords: true,
          can_view_activity_logs: true,
          can_create_webhosts: true,
        })
        .eq('id', targetWebhost.permissions.id);

      if (promoteError) throw promoteError;

      return targetWebhost;
    },
    onSuccess: (targetWebhost) => {
      // Log activity for super admin transfer
      logActivity({
        action: 'Transferred Super Admin Rights',
        entityType: 'admin_permissions',
        entityId: targetWebhost.permissions?.id,
        details: {
          new_super_admin_email: targetWebhost.email,
          new_super_admin_name: targetWebhost.full_name,
        },
      });
      toast({ 
        title: 'Super Admin rights transferred',
        description: `${targetWebhost.full_name || targetWebhost.email} is now the Super Admin`,
      });
      queryClient.invalidateQueries({ queryKey: ['webhost-webhosts'] });
      queryClient.invalidateQueries({ queryKey: ['my-admin-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['all-admin-permissions'] });
      setIsTransferDialogOpen(false);
      setTransferTarget(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to transfer super admin rights',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleTransferClick = (webhost: Webhost) => {
    setTransferTarget(webhost);
    setIsTransferDialogOpen(true);
  };

  const handleConfirmTransfer = () => {
    if (transferTarget) {
      transferSuperAdmin.mutate(transferTarget);
    }
  };

  const getLevelBadge = (level?: string) => {
    switch (level) {
      case 'super_admin':
        return (
          <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">
            <Crown className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-600/20 text-slate-400 border-slate-600/30">
            <User className="h-3 w-3 mr-1" />
            Limited
          </Badge>
        );
    }
  };

  const canCreateWebhosts = isSuperAdmin || myPermissions?.can_create_webhosts;

  return (
    <Card className="bg-slate-800/50 border-purple-800/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            Webhost Accounts
          </CardTitle>
          <CardDescription className="text-purple-300">
            Create and manage admin webhost accounts with different permission levels
          </CardDescription>
        </div>
        {canCreateWebhosts && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Webhost
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-purple-800/50 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Webhost</DialogTitle>
                <DialogDescription className="text-purple-300">
                  Create a new webhost account and assign permissions
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateWebhost} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-purple-200">Full Name</Label>
                    <Input
                      id="fullName"
                      value={newWebhost.fullName}
                      onChange={(e) => setNewWebhost({ ...newWebhost, fullName: e.target.value })}
                      required
                      className="bg-slate-700 border-purple-700/50 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-purple-200">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newWebhost.email}
                      onChange={(e) => setNewWebhost({ ...newWebhost, email: e.target.value })}
                      required
                      className="bg-slate-700 border-purple-700/50 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-purple-200">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newWebhost.password}
                    onChange={(e) => setNewWebhost({ ...newWebhost, password: e.target.value })}
                    required
                    minLength={8}
                    className="bg-slate-700 border-purple-700/50 text-white"
                  />
                </div>

                <div className="border-t border-purple-700/30 pt-4">
                  <h4 className="text-white font-medium mb-4">Admin Permissions</h4>
                  <AdminPermissionsEditor
                    permissions={newPermissions}
                    onChange={setNewPermissions}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={createWebhost.isPending}
                >
                  {createWebhost.isPending ? 'Creating...' : 'Create Webhost Account'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-slate-700 rounded"></div>
            ))}
          </div>
        ) : webhosts && webhosts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-purple-800/30 hover:bg-transparent">
                <TableHead className="text-purple-300">Name</TableHead>
                <TableHead className="text-purple-300">Email</TableHead>
                <TableHead className="text-purple-300">Level</TableHead>
                <TableHead className="text-purple-300">Created</TableHead>
                <TableHead className="text-purple-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhosts.map((webhost) => (
                <TableRow key={webhost.id} className="border-purple-800/30 hover:bg-purple-900/20">
                  <TableCell className="text-white font-medium">
                    <div className="flex items-center gap-2">
                      {webhost.permissions?.admin_level === 'super_admin' ? (
                        <Crown className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <Shield className="h-4 w-4 text-purple-400" />
                      )}
                      {webhost.full_name || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="text-purple-200">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {webhost.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getLevelBadge(webhost.permissions?.admin_level)}
                  </TableCell>
                  <TableCell className="text-purple-300">
                    {format(new Date(webhost.created_at), 'dd/MM/yy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isSuperAdmin && webhost.permissions && webhost.user_id !== user?.id && webhost.permissions.admin_level !== 'super_admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTransferClick(webhost)}
                          className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20"
                          title="Transfer Super Admin rights"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      )}
                      {isSuperAdmin && webhost.permissions && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPermissions(webhost)}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                          title="Edit permissions"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteWebhost.mutate(webhost.id)}
                        disabled={deleteWebhost.isPending || webhosts.length === 1 || webhost.permissions?.admin_level === 'super_admin'}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 disabled:opacity-50"
                        title={
                          webhosts.length === 1 
                            ? "Cannot delete the last webhost" 
                            : webhost.permissions?.admin_level === 'super_admin'
                            ? "Cannot delete super admin"
                            : "Remove webhost role"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-purple-300">
            No webhost accounts found.
          </div>
        )}
      </CardContent>

      {/* Edit Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="bg-slate-800 border-purple-800/50 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Permissions</DialogTitle>
            <DialogDescription className="text-purple-300">
              Update permissions for {selectedWebhost?.full_name || selectedWebhost?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedWebhost?.permissions && (
            <div className="space-y-6">
              <AdminPermissionsEditor
                permissions={{
                  admin_level: selectedWebhost.permissions.admin_level,
                  can_manage_managers: selectedWebhost.permissions.can_manage_managers,
                  can_manage_billing: selectedWebhost.permissions.can_manage_billing,
                  can_manage_properties: selectedWebhost.permissions.can_manage_properties,
                  can_manage_system_landlords: selectedWebhost.permissions.can_manage_system_landlords,
                  can_view_activity_logs: selectedWebhost.permissions.can_view_activity_logs,
                  can_create_webhosts: selectedWebhost.permissions.can_create_webhosts,
                }}
                onChange={(perms) => setSelectedWebhost({
                  ...selectedWebhost,
                  permissions: {
                    ...selectedWebhost.permissions!,
                    ...perms,
                  },
                })}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsPermissionsDialogOpen(false)}
                  className="flex-1 border-purple-700 text-purple-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePermissions}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  disabled={updatePermissions.isPending}
                >
                  {updatePermissions.isPending ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer Super Admin Confirmation Dialog */}
      <AlertDialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-purple-800/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              Transfer Super Admin Rights
            </AlertDialogTitle>
            <AlertDialogDescription className="text-purple-300">
              Are you sure you want to transfer Super Admin rights to{' '}
              <span className="font-semibold text-white">
                {transferTarget?.full_name || transferTarget?.email}
              </span>
              ?
              <div className="mt-4 p-3 rounded-lg bg-amber-900/30 border border-amber-700/50">
                <p className="text-amber-300 text-sm">
                  ⚠️ <strong>Warning:</strong> This action will demote you to Admin level. 
                  You will lose the ability to create webhosts and transfer super admin rights.
                  This action cannot be undone by you.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-purple-700 text-purple-300 hover:bg-purple-900/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmTransfer}
              disabled={transferSuperAdmin.isPending}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {transferSuperAdmin.isPending ? 'Transferring...' : 'Transfer Super Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default WebhostManagement;