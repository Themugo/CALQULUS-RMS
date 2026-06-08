import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Users, Building, Receipt, TrendingUp,
  Shield, CheckCircle, Clock,
  DollarSign, Home
} from 'lucide-react';

type ManagerInvoiceRow = { amount: number | null };
type PropertyRow = { id: string; name: string; address: string | null; manager_id: string | null; created_at: string };
type ProfileRow = { id: string; email: string | null; full_name: string | null };

// Formats KES amounts
const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

const WebhostOverview = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['webhost-overview-stats-v2'],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      // All queries are about managers, properties, platform billing — NEVER tenant personal data
      const [
        totalManagers,
        pendingManagers,
        approvedManagers,
        rejectedManagers,
        totalProperties,
        totalWebhosts,
        platformRevenueMTD,
        platformRevenueLM,
        pendingManagerInvoices,
        overdueManagerInvoices,
        systemLandlords,
        pendingPayouts,
      ] = await Promise.all([
        // Manager counts
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'manager'),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'manager').eq('approval_status', 'pending'),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'manager').eq('approval_status', 'approved'),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'manager').eq('approval_status', 'rejected'),
        // Property count
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        // Webhost admin count
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'webhost'),
        // Platform billing — manager subscription invoices only (NOT tenant rent)
        supabase.from('manager_invoices').select('amount').eq('status', 'paid').gte('paid_date', startOfMonth),
        supabase.from('manager_invoices').select('amount').eq('status', 'paid').gte('paid_date', startOfLastMonth).lte('paid_date', endOfLastMonth),
        supabase.from('manager_invoices').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('manager_invoices').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
        // System landlords only: manager_id IS NULL. Managed landlords are invisible to webhost.
        supabase.from('property_landlords').select('id', { count: 'exact', head: true }).is('manager_id', null),
        // Pending payout requests routed to webhost
        supabase.from('payout_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('recipient_type', 'webhost'),
      ]);

      const revenueRowsMTD = platformRevenueMTD.data as ManagerInvoiceRow[] | null;
      const revenueMTD = revenueRowsMTD?.reduce((s: number, i: ManagerInvoiceRow) => s + Number(i.amount), 0) ?? 0;
      const revenueRowsLM = platformRevenueLM.data as ManagerInvoiceRow[] | null;
      const revenueLM = revenueRowsLM?.reduce((s: number, i: ManagerInvoiceRow) => s + Number(i.amount), 0) ?? 0;
      const revenueChange = revenueLM > 0 ? Math.round(((revenueMTD - revenueLM) / revenueLM) * 100) : 0;

      return {
        totalManagers: totalManagers.count ?? 0,
        pendingManagers: pendingManagers.count ?? 0,
        approvedManagers: approvedManagers.count ?? 0,
        rejectedManagers: rejectedManagers.count ?? 0,
        totalProperties: totalProperties.count ?? 0,
        totalWebhosts: totalWebhosts.count ?? 0,
        revenueMTD,
        revenueLM,
        revenueChange,
        pendingManagerInvoices: pendingManagerInvoices.count ?? 0,
        overdueManagerInvoices: overdueManagerInvoices.count ?? 0,
        systemLandlords: systemLandlords.count ?? 0,
        pendingPayouts: pendingPayouts.count ?? 0,
      };
    },
  });

  const { data: latestProperties = [], isLoading: isLoadingProperties } = useQuery({
    queryKey: ['webhost-latest-properties-audit'],
    queryFn: async () => {
      const { data: props, error } = await supabase
        .from('properties')
        .select('id, name, address, manager_id, created_at')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      const typedProps = (props || []) as PropertyRow[];
      const managerIds = [...new Set(typedProps.map((p: PropertyRow) => p.manager_id).filter(Boolean))];
      const { data: profiles } = managerIds.length > 0
        ? await supabase.from('profiles').select('id, email, full_name').in('id', managerIds)
        : { data: [] as ProfileRow[] };
      const typedProfiles = (profiles || []) as ProfileRow[];
      const profileById = new Map(typedProfiles.map((p: ProfileRow) => [p.id, p]));
      return typedProps.map((p: PropertyRow) => ({
        ...p,
        manager_profile: p.manager_id ? profileById.get(p.manager_id) ?? null : null,
      }));
    },
  });

  const StatCard = ({
    label, value, icon: Icon, sub, color = 'text-foreground', badge
  }: {
    label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; sub?: string;
    color?: string; badge?: { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' };
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground/60" />
        </div>
        {isLoading ? (
          <Skeleton className="h-7 w-20 mt-1" />
        ) : (
          <div className="flex items-end gap-2 mt-1">
            <p className={`text-xl font-semibold ${color}`}>{value}</p>
            {badge && <Badge variant={badge.variant} className="text-xs h-5">{badge.label}</Badge>}
          </div>
        )}
        {sub && !isLoading && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Platform revenue */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Platform billing this month</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Subscription revenue MTD"
            value={isLoading ? '—' : fmt(stats?.revenueMTD ?? 0)}
            icon={DollarSign}
            color="text-green-700"
            sub={stats && stats.revenueChange !== 0 ? `${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange}% vs last month` : 'Same as last month'}
          />
          <StatCard
            label="Pending manager invoices"
            value={stats?.pendingManagerInvoices ?? 0}
            icon={Clock}
            color={stats?.pendingManagerInvoices ? 'text-amber-700' : undefined}
          />
          <StatCard
            label="Overdue manager invoices"
            value={stats?.overdueManagerInvoices ?? 0}
            icon={Receipt}
            color={stats?.overdueManagerInvoices ? 'text-red-700' : undefined}
          />
          <StatCard
            label="Platform revenue last month"
            value={isLoading ? '—' : fmt(stats?.revenueLM ?? 0)}
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* Manager stats */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Managers</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total managers" value={stats?.totalManagers ?? 0} icon={Users} />
          <StatCard
            label="Pending approval"
            value={stats?.pendingManagers ?? 0}
            icon={Clock}
            color={stats?.pendingManagers ? 'text-amber-700' : undefined}
            badge={stats?.pendingManagers ? { label: 'Action needed', variant: 'secondary' } : undefined}
          />
          <StatCard label="Approved" value={stats?.approvedManagers ?? 0} icon={CheckCircle} color="text-green-700" />
          <StatCard label="Total properties" value={stats?.totalProperties ?? 0} icon={Building} />
        </div>
      </div>

      {/* Landlord stats */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Landlords</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="System landlords"
            value={stats?.systemLandlords ?? 0}
            icon={Home}
            sub="Not under any manager — you oversee these"
            color="text-coral-700"
          />
          <StatCard
            label="Rejected managers"
            value={stats?.rejectedManagers ?? 0}
            icon={Users}
            sub="Kept as platform account status only"
          />
          <StatCard
            label="Pending payout requests"
            value={stats?.pendingPayouts ?? 0}
            icon={Receipt}
            color={stats?.pendingPayouts ? 'text-amber-700' : undefined}
            badge={stats?.pendingPayouts ? { label: 'Review needed', variant: 'secondary' } : undefined}
          />
          <StatCard label="Webhost admins" value={stats?.totalWebhosts ?? 0} icon={Shield} />
        </div>
      </div>

      {/* Access policy reminder */}
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Platform access policy</p>
              <p className="text-xs text-red-700 mt-1">
                Webhost admins have zero access to tenant data, rent payment records, or tenant personal information.
                Tenant management is exclusively within the property manager's domain.
                The stats above show only platform-level subscription billing — not rent collected from tenants.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6-month platform revenue trend */}
      <PlatformRevenueTrend />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent properties audit trail</CardTitle>
          <CardDescription>
            Last added properties with manager attribution (who added and account email).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProperties ? (
            <Skeleton className="h-28 w-full" />
          ) : latestProperties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No properties found.</p>
          ) : (
            <div className="space-y-2">
              {(latestProperties as (PropertyRow & { manager_profile: ProfileRow | null })[]).map((prop) => (
                <div key={prop.id} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{prop.name}</p>
                  <p className="text-xs text-muted-foreground">{prop.address}</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Added by: {prop.manager_profile?.full_name || 'Unknown manager'} ({prop.manager_profile?.email || 'no email'})
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const PlatformRevenueTrend: React.FC = () => {
  const { data: trend = [], isLoading } = useQuery({
    queryKey: ['platform-revenue-6mo'],
    queryFn: async () => {
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return d.toISOString().slice(0, 7);
      });
      return Promise.all(months.map(async (m) => {
        const start = `${m}-01`;
        const end = new Date(start); end.setMonth(end.getMonth() + 1);
        const { data } = await supabase
          .from('manager_invoices')
          .select('amount')
          .eq('status', 'paid')
          .gte('paid_date', start)
          .lt('paid_date', end.toISOString().slice(0, 10));
        const rows = (data as ManagerInvoiceRow[] | null) || [];
        const revenue = rows.reduce((s: number, i: ManagerInvoiceRow) => s + Number(i.amount), 0);
        return { month: m.slice(5), revenue };
      }));
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm font-medium mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-600" />
          Platform revenue — last 6 months
        </p>
        <div className="flex items-end gap-1 h-28">
          {trend.map((t, i) => {
            const max = Math.max(...trend.map(x => x.revenue), 1);
            const pct = (t.revenue / max) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-purple-300 font-medium">
                  {t.revenue > 0 ? `${Math.round(t.revenue / 1000)}K` : '—'}
                </span>
                <div className="w-full rounded-t-sm bg-purple-600/30 relative overflow-hidden" style={{ height: '72px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-purple-500 rounded-t-sm transition-all"
                    style={{ height: `${Math.max(2, pct)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">{t.month}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhostOverview;
