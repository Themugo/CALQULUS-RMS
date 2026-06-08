import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  UserCheck, UserX, Users, Building2, Home, Mail,
  AlertTriangle, CheckCircle, Clock, Ban, RefreshCw,
  ChevronDown, ChevronUp, UserPlus, Loader2,
  Activity, CreditCard
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:              { label: 'Pending',    color: 'bg-amber-100 text-amber-800 border-amber-200',   icon: Clock },
  approved:             { label: 'Active',     color: 'bg-green-100 text-green-800 border-green-200',   icon: CheckCircle },
  rejected:             { label: 'Rejected',   color: 'bg-red-100 text-red-800 border-red-200',         icon: UserX },
  suspended:            { label: 'Suspended',  color: 'bg-orange-100 text-orange-800 border-orange-200',icon: Ban },
  suspended_nonpayment: { label: 'Suspended — non-payment', color: 'bg-red-100 text-red-800 border-red-200', icon: Ban },
};

const TIER_BADGE: Record<string, string> = {
  starter:      'bg-slate-100 text-slate-700 border-slate-200',
  growth:       'bg-blue-100 text-blue-800 border-blue-200',
  professional: 'bg-purple-100 text-purple-800 border-purple-200',
  enterprise:   'bg-amber-100 text-amber-800 border-amber-200',
};

interface Manager {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  approval_status: string;
  property_count: number;
  unit_count: number;
  subscription_tier: string | null;
  agency_name: string | null;
  last_active_at: string | null;
  rejection_reason: string | null;
  suspension_reason: string | null;
}

interface ManagerProfile {
  status?: string;
  property_count?: number;
  unit_count?: number;
  subscription_tier?: string | null;
  last_active_at?: string | null;
  rejection_reason?: string | null;
  suspension_reason?: string | null;
}

interface StatusLogEntry {
  id: string;
  created_at: string;
  old_status: string | null;
  new_status: string;
  reason: string | null;
}

const ManagerManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [actionDialog, setActionDialog] = useState<{ type: string; manager: Manager } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionTier,   setActionTier]   = useState('starter');
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [addOpen,      setAddOpen]      = useState(false);
  const [newMgr,       setNewMgr]       = useState({ email: '', password: '', fullName: '' });

  const { data: managers = [], isLoading, refetch } = useQuery({
    queryKey: ['webhost-managers-rich'],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('id, user_id, created_at, approval_status')
        .eq('role', 'manager')
        .order('created_at', { ascending: false });
      if (!roles?.length) return [];
      return Promise.all((roles || []).map(async (role) => {
        const [profileRes, mpRes, agencyRes] = await Promise.all([
          supabase.from('profiles').select('email, full_name').eq('id', role.user_id).maybeSingle(),
          supabase.from('manager_profiles').select('*').eq('manager_user_id', role.user_id).maybeSingle(),
          supabase.from('agencies').select('name').eq('manager_id', role.user_id).maybeSingle(),
        ]);
        const mp = (mpRes as { data: ManagerProfile | null }).data;
        return {
          id: role.id, user_id: role.user_id,
          email: (profileRes.data as { email?: string; full_name?: string } | null)?.email ?? 'Unknown',
          full_name: (profileRes.data as { email?: string; full_name?: string } | null)?.full_name ?? null,
          created_at: role.created_at,
          approval_status: mp?.status ?? role.approval_status,
          property_count: mp?.property_count ?? 0,
          unit_count: mp?.unit_count ?? 0,
          subscription_tier: mp?.subscription_tier ?? null,
          agency_name: (agencyRes.data as { name?: string } | null)?.name ?? null,
          last_active_at: mp?.last_active_at ?? null,
          rejection_reason: mp?.rejection_reason ?? null,
          suspension_reason: mp?.suspension_reason ?? null,
        } as Manager;
      }));
    },
  });

  const pending   = managers.filter(m => m.approval_status === 'pending');
  const active    = managers.filter(m => m.approval_status === 'approved');
  const suspended = managers.filter(m => m.approval_status === 'suspended' || m.approval_status === 'suspended_nonpayment');
  const rejected  = managers.filter(m => m.approval_status === 'rejected');

  const executeAction = useMutation({
    mutationFn: async () => {
      if (!actionDialog) return;
      const { manager, type } = actionDialog;

      const logEntry = async (newStatus: string) => {
        try {
          await supabase.from('manager_status_log').insert({
            manager_user_id: manager.user_id, changed_by: user!.id, changed_by_role: 'webhost',
            old_status: manager.approval_status, new_status: newStatus, reason: actionReason || null,
          });
        } catch (_) { /* non-critical */ }
      };

      if (type === 'approve') {
        await supabase.from('user_roles').update({ approval_status: 'approved' }).eq('user_id', manager.user_id).eq('role', 'manager');
        await supabase.from('manager_profiles').upsert({ manager_user_id: manager.user_id, status: 'approved', approval_notes: actionReason || null, approved_at: new Date().toISOString(), approved_by: user!.id }, { onConflict: 'manager_user_id' });
        await logEntry('approved');
        await supabase.functions.invoke('send-manager-approval-notification', { body: { managerId: manager.user_id, status: 'approved', managerEmail: manager.email, managerName: manager.full_name, note: actionReason } }).catch(() => {});

        // Auto-create service agreement contract for newly approved manager
        try {
          await supabase.from('manager_contracts').insert({
            manager_user_id: manager.user_id,
            manager_email:   manager.email,
            manager_name:    manager.full_name || manager.email,
            title:           'RentFlow Platform Service Agreement',
            contract_type:   'service_agreement',
            description:     'Standard service agreement for RentFlow platform access',
            status:          'pending_signature',
            valid_from:      new Date().toISOString().slice(0, 10),
          });
        } catch (_) { /* non-critical */ }

        // Auto-generate registration invoice if not already exists
        try {
          const { data: existingInv } = await supabase.from('manager_invoices')
            .select('id').eq('manager_user_id', manager.user_id).eq('invoice_type', 'registration').maybeSingle();
          if (!existingInv) {
            const { data: settings } = await supabase.from('webhost_payment_settings').select('registration_fee').maybeSingle();
            const regFee = Number((settings as { registration_fee?: number } | null)?.registration_fee ?? 3000);
            if (regFee > 0) {
              const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
              await supabase.from('manager_invoices').insert({
                manager_user_id: manager.user_id,
                invoice_number:  `REG-${manager.user_id.slice(0, 8).toUpperCase()}`,
                amount:          regFee,
                description:     'One-time platform registration fee',
                due_date:        dueDate.toISOString().slice(0, 10),
                status:          'pending',
                invoice_type:    'registration',
              });
            }
          }
        } catch (_) { /* non-critical — table may not exist yet */ }
      } else if (type === 'reject') {
        if (!actionReason.trim()) throw new Error('Rejection reason is required');
        await supabase.from('user_roles').update({ approval_status: 'rejected' }).eq('user_id', manager.user_id).eq('role', 'manager');
        await supabase.from('manager_profiles').upsert({ manager_user_id: manager.user_id, status: 'rejected', rejection_reason: actionReason }, { onConflict: 'manager_user_id' });
        await logEntry('rejected');
        await supabase.functions.invoke('send-manager-approval-notification', { body: { managerId: manager.user_id, status: 'rejected', managerEmail: manager.email, reason: actionReason } }).catch(() => {});
      } else if (type === 'suspend') {
        if (!actionReason.trim()) throw new Error('Suspension reason is required');
        await supabase.from('user_roles').update({ approval_status: 'suspended' }).eq('user_id', manager.user_id).eq('role', 'manager');
        await supabase.from('manager_profiles').upsert({ manager_user_id: manager.user_id, status: 'suspended', suspension_reason: actionReason, suspended_at: new Date().toISOString(), suspended_by: user!.id }, { onConflict: 'manager_user_id' });
        await logEntry('suspended');
      } else if (type === 'unsuspend') {
        await supabase.from('user_roles').update({ approval_status: 'approved' }).eq('user_id', manager.user_id).eq('role', 'manager');
        await supabase.from('manager_profiles').update({ status: 'approved', suspension_reason: null, suspended_at: null }).eq('manager_user_id', manager.user_id);
        await logEntry('approved');
      } else if (type === 'set_tier') {
        const tierMap: Record<string, { max_properties: number; max_units: number; platform_rate: number }> = {
          starter: { max_properties: 5, max_units: 50, platform_rate: 500 },
          growth: { max_properties: 20, max_units: 200, platform_rate: 450 },
          professional: { max_properties: 50, max_units: 500, platform_rate: 400 },
          enterprise: { max_properties: 999, max_units: 9999, platform_rate: 350 },
        };
        await supabase.from('manager_profiles').upsert({ manager_user_id: manager.user_id, subscription_tier: actionTier, ...tierMap[actionTier] }, { onConflict: 'manager_user_id' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhost-managers-rich'] });
      const labels: Record<string, string> = { approve: 'Approved', reject: 'Rejected', suspend: 'Suspended', unsuspend: 'Reinstated', set_tier: 'Tier updated' };
      toast({ title: labels[actionDialog!.type] });
      setActionDialog(null); setActionReason('');
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const createManager = useMutation({
    mutationFn: async () => {
      const { data: authData, error } = await supabase.auth.signUp({
        email: newMgr.email,
        password: newMgr.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: newMgr.fullName, role: 'manager' },
        },
      });
      if (error) throw error;
      if (!authData.user) throw new Error('Failed to create user');
      await supabase.from('user_roles').upsert(
        { user_id: authData.user.id, role: 'manager', approval_status: 'approved' },
        { onConflict: 'user_id,role' },
      );
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['webhost-managers-rich'] }); toast({ title: 'Manager created' }); setAddOpen(false); setNewMgr({ email: '', password: '', fullName: '' }); },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const ManagerCard = ({ m }: { m: Manager }) => {
    const cfg = STATUS_CONFIG[m.approval_status] ?? STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    const expanded = expandedId === m.user_id;
    return (
      <Card className={`border ${m.approval_status === 'pending' ? 'border-amber-400/50 bg-amber-900/10' : m.approval_status.startsWith('suspend') ? 'border-orange-400/50 bg-orange-900/10' : 'border-purple-800/30 bg-slate-900/30'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-semibold text-sm text-white">{m.full_name || 'Unnamed'}</p>
                <Badge variant="outline" className={`text-xs ${cfg.color}`}><Icon className="h-3 w-3 mr-1" />{cfg.label}</Badge>
                {m.subscription_tier && <Badge variant="outline" className={`text-xs capitalize ${TIER_BADGE[m.subscription_tier] ?? ''}`}>{m.subscription_tier}</Badge>}
              </div>
              <p className="text-xs text-purple-300 flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</p>
              {m.agency_name && <p className="text-xs text-purple-300 mt-0.5 flex items-center gap-1"><Building2 className="h-3 w-3" />{m.agency_name}</p>}
              <div className="flex gap-3 mt-1.5 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{m.property_count}</span>
                <span className="flex items-center gap-1"><Home className="h-3 w-3" />{m.unit_count}</span>
                {m.last_active_at && <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{format(new Date(m.last_active_at), 'dd MMM')}</span>}
              </div>
              {(m.rejection_reason || m.suspension_reason) && (
                <p className="text-xs text-red-400 mt-1 flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{m.rejection_reason ?? m.suspension_reason}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
              {m.approval_status === 'pending' && (<>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs" onClick={() => { setActionDialog({ type: 'approve', manager: m }); setActionReason(''); }}><UserCheck className="h-3.5 w-3.5 mr-1" />Approve</Button>
                <Button size="sm" variant="outline" className="border-red-500 text-red-400 h-7 text-xs" onClick={() => { setActionDialog({ type: 'reject', manager: m }); setActionReason(''); }}><UserX className="h-3.5 w-3.5 mr-1" />Reject</Button>
              </>)}
              {m.approval_status === 'approved' && (<>
                <Button size="sm" variant="outline" className="border-purple-600 text-purple-300 h-7 text-xs" onClick={() => { setActionDialog({ type: 'set_tier', manager: m }); setActionTier(m.subscription_tier ?? 'starter'); }}><CreditCard className="h-3.5 w-3.5 mr-1" />Tier</Button>
                <Button size="sm" variant="outline" className="border-orange-500 text-orange-400 h-7 text-xs" onClick={() => { setActionDialog({ type: 'suspend', manager: m }); setActionReason(''); }}><Ban className="h-3.5 w-3.5 mr-1" />Suspend</Button>
              </>)}
              {(m.approval_status === 'suspended' || m.approval_status === 'suspended_nonpayment' || m.approval_status === 'rejected') && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs" onClick={() => { setActionDialog({ type: 'unsuspend', manager: m }); setActionReason(''); }}><UserCheck className="h-3.5 w-3.5 mr-1" />Reinstate</Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => setExpandedId(expanded ? null : m.user_id)}>
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          {expanded && (
            <div className="mt-3 pt-3 border-t border-purple-800/30">
              <StatusHistory managerId={m.user_id} />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const StatusHistory = ({ managerId }: { managerId: string }) => {
    const { data: logs = [] } = useQuery({
      queryKey: ['manager-status-log', managerId],
      queryFn: async () => {
        const { data } = await supabase.from('manager_status_log').select('*').eq('manager_user_id', managerId).order('created_at', { ascending: false }).limit(8);
        return (data || []) as StatusLogEntry[];
      },
    });
    if (!logs.length) return <p className="text-xs text-slate-500">No status history.</p>;
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Status history</p>
        {logs.map((l: StatusLogEntry) => (
          <div key={l.id} className="text-xs flex items-start gap-2 text-slate-400">
            <span className="shrink-0">{format(new Date(l.created_at), 'dd MMM HH:mm')}</span>
            <span className="font-medium text-white capitalize">{l.old_status ?? '—'} → {l.new_status}</span>
            {l.reason && <span>· {l.reason}</span>}
          </div>
        ))}
      </div>
    );
  };

  const TabList = ({ managers: list }: { managers: Manager[] }) => (
    <div className="space-y-3 mt-4">
      {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full bg-slate-800/50" />) :
       list.length === 0 ? <div className="py-10 text-center text-slate-500"><Users className="h-10 w-10 mx-auto mb-2 opacity-30" /><p className="text-sm">None</p></div> :
       list.map(m => <ManagerCard key={m.user_id} m={m} />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Managers</h2>
          <p className="text-slate-400 text-sm">{managers.length} total · {pending.length} pending · {active.length} active{suspended.length > 0 ? ` · ${suspended.length} suspended` : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-purple-700 text-purple-300 hover:bg-purple-900/30" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Add Manager</Button>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-400/50 bg-amber-900/20 text-amber-300">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{pending.length} manager{pending.length > 1 ? 's' : ''} awaiting approval</span>
        </div>
      )}

      <Tabs defaultValue="pending">
        <TabsList className="bg-slate-800/50 border border-slate-700/50 flex-wrap h-auto gap-1 p-1">
          {[['pending', `Pending (${pending.length})`], ['active', `Active (${active.length})`], ['suspended', `Suspended (${suspended.length})`], ['rejected', `Rejected (${rejected.length})`]].map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="text-slate-400 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs">{l}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="pending"><TabList managers={pending} /></TabsContent>
        <TabsContent value="active"><TabList managers={active} /></TabsContent>
        <TabsContent value="suspended"><TabList managers={suspended} /></TabsContent>
        <TabsContent value="rejected"><TabList managers={rejected} /></TabsContent>
      </Tabs>

      {/* Action dialog */}
      <Dialog open={!!actionDialog} onOpenChange={open => !open && setActionDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {{'approve':'Approve manager','reject':'Reject manager','suspend':'Suspend manager','unsuspend':'Reinstate manager','set_tier':'Set subscription tier'}[actionDialog?.type ?? ''] ?? ''}
            </DialogTitle>
            <DialogDescription>{actionDialog?.manager.full_name ?? actionDialog?.manager.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {actionDialog?.type === 'set_tier' && (
              <div>
                <Label>Subscription tier</Label>
                <Select value={actionTier} onValueChange={setActionTier}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[['starter','Starter — 5 props','KES 500/prop'],['growth','Growth — 20 props','KES 450/prop'],['professional','Professional — 50 props','KES 400/prop'],['enterprise','Enterprise — unlimited','KES 350/prop']].map(([v,l,p]) => (
                      <SelectItem key={v} value={v}><span>{l}</span><span className="text-xs text-muted-foreground ml-2">{p}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {actionDialog?.type !== 'set_tier' && (
              <div>
                <Label>{actionDialog?.type === 'approve' || actionDialog?.type === 'unsuspend' ? 'Note (optional)' : 'Reason (required)'}</Label>
                <Textarea value={actionReason} onChange={e => setActionReason(e.target.value)}
                  placeholder={actionDialog?.type === 'reject' ? 'This will be emailed to the manager.' : actionDialog?.type === 'suspend' ? 'Internal record.' : ''}
                  rows={3} className="mt-1 resize-none" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={() => executeAction.mutate()} disabled={executeAction.isPending}
              className={actionDialog?.type === 'approve' || actionDialog?.type === 'unsuspend' ? 'bg-green-600 hover:bg-green-700 text-white' : actionDialog?.type === 'reject' || actionDialog?.type === 'suspend' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}>
              {executeAction.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {{'approve':'Approve','reject':'Reject','suspend':'Suspend','unsuspend':'Reinstate','set_tier':'Save tier'}[actionDialog?.type ?? ''] ?? 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add manager */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Create manager account</DialogTitle><DialogDescription>Pre-approved and immediately active.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Full name</Label><Input value={newMgr.fullName} onChange={e => setNewMgr(p => ({...p, fullName: e.target.value}))} className="mt-1" /></div>
            <div><Label>Email</Label><Input type="email" value={newMgr.email} onChange={e => setNewMgr(p => ({...p, email: e.target.value}))} className="mt-1" /></div>
            <div><Label>Password</Label><Input type="password" value={newMgr.password} onChange={e => setNewMgr(p => ({...p, password: e.target.value}))} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => createManager.mutate()} disabled={createManager.isPending || !newMgr.email || !newMgr.password}>
              {createManager.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create manager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerManagement;
