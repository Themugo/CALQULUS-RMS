import { format } from "date-fns";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Input } from '@/shared/components/ui/input';
import {
  Home, Search, CheckCircle, Clock, XCircle,
  Banknote, Building, Info, AlertTriangle
} from 'lucide-react';

// System landlords are landlords whose property_landlords.manager_id IS NULL
// These landlords are NOT under any manager/agency — they fall under webhost oversight.
// Managed landlords (manager_id IS NOT NULL) are NEVER shown here.

interface SystemLandlord {
  id: string;
  landlord_user_id: string;
  property_id: string;
  property_name: string;
  property_address: string;
  revenue_share_pct: number;
  assigned_at: string;
  profile: { full_name: string | null; email: string; phone: string | null } | null;
}

interface PayoutRequest {
  id: string;
  property_id: string;
  property_name: string;
  landlord_user_id: string;
  landlord_email: string;
  amount: number;
  period_start: string;
  period_end: string;
  notes: string | null;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  created_at: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  paid: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

const SystemLandlordManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'landlords' | 'payouts'>('landlords');

  // ── Fetch system landlords (manager_id IS NULL only) ─────────────
  const { data: landlords = [], isLoading } = useQuery({
    queryKey: ['system-landlords'],
    queryFn: async () => {
      // CRITICAL: Only fetch where manager_id IS NULL
      const { data: links, error } = await supabase
        .from('property_landlords')
        .select('id, landlord_user_id, property_id, revenue_share_pct, assigned_at')
        .is('manager_id', null);

      if (error) throw error;
      if (!links || links.length === 0) return [];

      const propIds = (links as { property_id: string }[]).map(l => l.property_id);
      const userIds = (links as { landlord_user_id: string }[]).map(l => l.landlord_user_id);

      const [propertiesRes, profilesRes] = await Promise.all([
        supabase.from('properties').select('id, name, address').in('id', propIds),
        supabase.from('profiles').select('id, full_name, email, phone').in('id', userIds),
      ]);

      const propMap = new Map((propertiesRes.data || []).map((p: { id: string; name: string; address: string }) => [p.id, p]));
      const profileMap = new Map((profilesRes.data || []).map((p: { id: string; full_name: string | null; email: string; phone: string | null }) => [p.id, p]));

      return (links as { id: string; landlord_user_id: string; property_id: string; revenue_share_pct: number; assigned_at: string }[]).map(link => ({
        id: link.id,
        landlord_user_id: link.landlord_user_id,
        property_id: link.property_id,
        property_name: propMap.get(link.property_id)?.name ?? 'Unknown property',
        property_address: propMap.get(link.property_id)?.address ?? '',
        revenue_share_pct: link.revenue_share_pct,
        assigned_at: link.assigned_at,
        profile: profileMap.get(link.landlord_user_id) ?? null,
      })) as SystemLandlord[];
    },
  });

  // ── Fetch payout requests routed to webhost ───────────────────────
  const { data: payouts = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ['webhost-payout-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('recipient_type', 'webhost')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data || []) as { id: string; property_id: string; landlord_user_id: string; amount: number; period_start: string; period_end: string; notes: string | null; status: 'pending' | 'approved' | 'paid' | 'rejected'; created_at: string }[];

      const propIds = [...new Set(rows.map(r => r.property_id))];
      const landlordIds = [...new Set(rows.map(r => r.landlord_user_id))];

      const [propsRes, profilesRes] = await Promise.all([
        supabase.from('properties').select('id, name').in('id', propIds),
        supabase.from('profiles').select('id, email').in('id', landlordIds),
      ]);

      const propMap2 = new Map((propsRes.data || []).map((p: { id: string; name: string }) => [p.id, p.name]));
      const profileMap2 = new Map((profilesRes.data || []).map((p: { id: string; email: string }) => [p.id, p.email]));

      return rows.map(r => ({
        ...r,
        property_name: propMap2.get(r.property_id) ?? 'Property',
        landlord_email: profileMap2.get(r.landlord_user_id) ?? 'Unknown',
      })) as PayoutRequest[];
    },
  });

  // ── Approve / reject / mark paid payout ──────────────────────────
  const updatePayout = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: { status: string; approved_at?: string; paid_at?: string; approved_by?: string } = { status };
      if (status === 'approved') update.approved_at = new Date().toISOString();
      if (status === 'paid') { update.paid_at = new Date().toISOString(); update.approved_by = user?.id; }
      const { error } = await supabase
        .from('payout_requests')
        .update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['webhost-payout-requests'] });
      toast({ title: `Payout ${vars.status}` });
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const pendingPayouts = payouts.filter(p => p.status === 'pending').length;

  const filteredLandlords = landlords.filter(l => {
    const q = search.toLowerCase();
    return !q
      || l.profile?.email?.toLowerCase().includes(q)
      || l.profile?.full_name?.toLowerCase().includes(q)
      || l.property_name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Context banner */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Unlinked landlords only</p>
              <p className="text-xs text-amber-800 mt-0.5">
                You can only see unlinked landlords whose properties are not linked to any manager or agency.
                Landlords under a manager are managed exclusively by that manager — you have no visibility into them.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { key: 'landlords', label: `Unlinked Landlords (${landlords.length})` },
          { key: 'payouts', label: `Payout Requests${pendingPayouts > 0 ? ` (${pendingPayouts} pending)` : ''}` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'landlords' | 'payouts')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Landlords list ── */}
      {activeTab === 'landlords' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Unlinked landlords</CardTitle>
                <CardDescription>Property owners with no manager assigned</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search landlords..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 w-52"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filteredLandlords.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Home className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{search ? 'No landlords match your search' : 'No system landlords yet'}</p>
                <p className="text-xs mt-1 opacity-70">Landlords appear here when they are not linked to any manager</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Landlord</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Revenue share</TableHead>
                    <TableHead>Since</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLandlords.map(l => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{l.profile?.full_name || 'Landlord'}</p>
                          <p className="text-xs text-muted-foreground">{l.profile?.email}</p>
                          {l.profile?.phone && <p className="text-xs text-muted-foreground">{l.profile.phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{l.property_name}</p>
                          <p className="text-xs text-muted-foreground">{l.property_address}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                          {l.revenue_share_pct}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(l.assigned_at), 'dd/MM/yy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Payout requests ── */}
      {activeTab === 'payouts' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payout requests from system landlords</CardTitle>
            <CardDescription>Review and approve revenue payout requests</CardDescription>
          </CardHeader>
          <CardContent>
            {payoutsLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : payouts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Banknote className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No payout requests routed to you yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Landlord</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{p.landlord_email}</TableCell>
                      <TableCell className="text-sm font-medium">{p.property_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(p.period_start), 'dd/MM')}
                        {' – '}
                        {format(new Date(p.period_end), 'dd/MM/yy')}
                      </TableCell>
                      <TableCell className="font-semibold">{fmt(p.amount)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${STATUS_STYLES[p.status]}`}>
                          {p.status === 'paid' && <CheckCircle className="h-3 w-3" />}
                          {p.status === 'pending' && <Clock className="h-3 w-3" />}
                          {p.status === 'rejected' && <XCircle className="h-3 w-3" />}
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {p.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline"
                                className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                                onClick={() => updatePayout.mutate({ id: p.id, status: 'approved' })}
                                disabled={updatePayout.isPending}>
                                Approve
                              </Button>
                              <Button size="sm" variant="ghost"
                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => updatePayout.mutate({ id: p.id, status: 'rejected' })}
                                disabled={updatePayout.isPending}>
                                Reject
                              </Button>
                            </>
                          )}
                          {p.status === 'approved' && (
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={() => updatePayout.mutate({ id: p.id, status: 'paid' })}
                              disabled={updatePayout.isPending}>
                              Mark Paid
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
        </Card>
      )}
    </div>
  );
};

export default SystemLandlordManagement;
