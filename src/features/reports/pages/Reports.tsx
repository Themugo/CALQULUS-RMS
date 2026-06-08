import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { Layout } from '@/shared/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { useCurrency } from '@/shared/hooks/useCurrency';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Building2, Users, CreditCard,
  AlertTriangle, BarChart3, PieChartIcon, Activity, Home
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

const Reports: React.FC = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [period, setPeriod] = useState('6');

  // ── Revenue trend ──────────────────────────────────────────
  const { data: revenueTrend = [], isLoading: revLoading } = useQuery({
    queryKey: ['reports-revenue-trend', user?.id, period],
    queryFn: async () => {
      const months = parseInt(period);
      return Promise.all(
        Array.from({ length: months }, (_, i) => {
          const d = subMonths(new Date(), months - 1 - i);
          const start = startOfMonth(d).toISOString();
          const end   = endOfMonth(d).toISOString();
          return supabase
            .from('invoices')
            .select('amount, paid_amount, status')
            .eq('manager_id', user!.id)
            .gte('due_date', start)
            .lte('due_date', end)
            .then(({ data }) => {
              const billed    = (data || []).reduce((s, i) => s + Number(i.amount), 0);
              const collected = (data || []).reduce((s, i) => s + Number(i.paid_amount ?? 0), 0);
              const arrears   = (data || []).filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0);
              return { month: format(d, 'MMM yy'), billed, collected, arrears };
            });
        })
      );
    },
    enabled: !!user?.id,
  });

  // ── Occupancy trend ────────────────────────────────────────
  const { data: occupancySummary, isLoading: occLoading } = useQuery({
    queryKey: ['reports-occupancy', user?.id],
    queryFn: async () => {
      const { data: props } = await supabase
        .from('properties')
        .select('id, name, units, occupied')
        .eq('manager_id', user!.id)
        .eq('status', 'active')
        .order('name');

      const items = (props || []).map(p => ({
        name: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name,
        occupied: p.occupied ?? 0,
        vacant: (p.units ?? 0) - (p.occupied ?? 0),
        total: p.units ?? 0,
        rate: p.units > 0 ? Math.round((p.occupied / p.units) * 100) : 0,
      }));

      const totalUnits    = items.reduce((s, p) => s + p.total, 0);
      const totalOccupied = items.reduce((s, p) => s + p.occupied, 0);
      return { items, totalUnits, totalOccupied, overallRate: totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0 };
    },
    enabled: !!user?.id,
  });

  // ── Arrears aging ──────────────────────────────────────────
  const { data: arrearsAging = [], isLoading: arrearsLoading } = useQuery({
    queryKey: ['reports-arrears', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('balance_due, due_date, tenants(name), leases(property, unit)')
        .eq('manager_id', user!.id)
        .eq('status', 'overdue')
        .order('due_date');

      const now = new Date();
      const buckets = { '1-30 days': 0, '31-60 days': 0, '61-90 days': 0, '90+ days': 0 };
      for (const inv of (data || []) as any[]) {
        const days = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000);
        const amt  = Number(inv.balance_due ?? 0);
        if (days <= 30) buckets['1-30 days'] += amt;
        else if (days <= 60) buckets['31-60 days'] += amt;
        else if (days <= 90) buckets['61-90 days'] += amt;
        else buckets['90+ days'] += amt;
      }
      return Object.entries(buckets).map(([name, value]) => ({ name, value }));
    },
    enabled: !!user?.id,
  });

  // ── Revenue by property ────────────────────────────────────
  const { data: revenueByProp = [], isLoading: propRevLoading } = useQuery({
    queryKey: ['reports-revenue-by-property', user?.id, period],
    queryFn: async () => {
      const months = parseInt(period);
      const start  = startOfMonth(subMonths(new Date(), months - 1)).toISOString();

      const { data: props } = await supabase
        .from('properties')
        .select('id, name')
        .eq('manager_id', user!.id)
        .eq('status', 'active');

      return Promise.all((props || []).map(async (p) => {
        const { data: invs } = await supabase
          .from('invoices')
          .select('paid_amount')
          .eq('property_id', p.id)
          .eq('status', 'paid')
          .gte('paid_date', start);

        const total = (invs || []).reduce((s, i) => s + Number(i.paid_amount ?? 0), 0);
        return { name: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name, revenue: total };
      }));
    },
    enabled: !!user?.id,
  });

  const totalArrears = arrearsAging.reduce((s, b) => s + b.value, 0);

  return (
    <Layout title="Reports" subtitle="Revenue, occupancy, arrears and performance insights">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {occupancySummary && (
              <>
                <span className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  {occupancySummary.totalUnits} units
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {occupancySummary.totalOccupied} occupied
                </span>
                <Badge variant="outline" className={`${occupancySummary.overallRate >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {occupancySummary.overallRate}% occupancy
                </Badge>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="revenue">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="revenue" className="gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" />Revenue trend
            </TabsTrigger>
            <TabsTrigger value="occupancy" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />Occupancy
            </TabsTrigger>
            <TabsTrigger value="arrears" className="gap-1.5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />Arrears aging
            </TabsTrigger>
            <TabsTrigger value="by-property" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />By property
            </TabsTrigger>
          </TabsList>

          {/* Revenue trend */}
          <TabsContent value="revenue" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue — billed vs collected vs arrears</CardTitle>
                <CardDescription>Last {period} months across all properties</CardDescription>
              </CardHeader>
              <CardContent>
                {revLoading ? <Skeleton className="h-64 w-full" /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={revenueTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v / 1000)}K`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="billed"    name="Billed"    fill="#94a3b8" radius={[3,3,0,0]} />
                      <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[3,3,0,0]} />
                      <Bar dataKey="arrears"   name="Arrears"   fill="#ef4444" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {!revLoading && revenueTrend.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: 'Total billed', val: revenueTrend.reduce((s, r) => s + r.billed, 0), color: 'text-slate-600' },
                      { label: 'Total collected', val: revenueTrend.reduce((s, r) => s + r.collected, 0), color: 'text-green-700' },
                      { label: 'Total arrears', val: revenueTrend.reduce((s, r) => s + r.arrears, 0), color: 'text-red-700' },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg bg-muted/40 p-2">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className={`text-sm font-semibold ${s.color}`}>{fmt(s.val)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Occupancy */}
          <TabsContent value="occupancy" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Occupancy by property</CardTitle>
                <CardDescription>Current occupied vs vacant units per property</CardDescription>
              </CardHeader>
              <CardContent>
                {occLoading ? <Skeleton className="h-64 w-full" /> : !occupancySummary?.items.length ? (
                  <p className="text-center py-12 text-muted-foreground text-sm">No active properties found.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={occupancySummary.items} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="occupied" name="Occupied" stackId="a" fill="#22c55e" radius={[0,0,0,0]} />
                        <Bar dataKey="vacant"   name="Vacant"   stackId="a" fill="#f1f5f9" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5">
                      {occupancySummary.items.map(p => (
                        <div key={p.name} className="flex items-center gap-3 text-xs">
                          <span className="w-32 truncate text-muted-foreground">{p.name}</span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-green-500" style={{ width: `${p.rate}%` }} />
                          </div>
                          <span className={`w-10 text-right font-medium ${p.rate >= 80 ? 'text-green-700' : p.rate >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                            {p.rate}%
                          </span>
                          <span className="text-muted-foreground w-12 text-right">{p.occupied}/{p.total}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Arrears aging */}
          <TabsContent value="arrears" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Arrears aging buckets</CardTitle>
                  <CardDescription>Overdue invoice amounts by how long they've been overdue</CardDescription>
                </CardHeader>
                <CardContent>
                  {arrearsLoading ? <Skeleton className="h-48 w-full" /> : totalArrears === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No overdue invoices — great work!</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={arrearsAging.filter(b => b.value > 0)} dataKey="value" nameKey="name"
                          cx="50%" cy="50%" outerRadius={80} label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}>
                          {arrearsAging.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Arrears summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {arrearsLoading ? <Skeleton className="h-48 w-full" /> : (
                    <div className="space-y-3">
                      {arrearsAging.map((bucket, i) => (
                        <div key={bucket.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-sm font-medium">{bucket.name}</span>
                          </div>
                          <span className={`text-sm font-semibold ${bucket.value > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>
                            {bucket.value > 0 ? fmt(bucket.value) : '—'}
                          </span>
                        </div>
                      ))}
                      {totalArrears > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200 font-semibold">
                          <span className="text-sm text-red-800">Total outstanding</span>
                          <span className="text-sm text-red-800">{fmt(totalArrears)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Revenue by property */}
          <TabsContent value="by-property" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue by property</CardTitle>
                <CardDescription>Total collected over last {period} months per property</CardDescription>
              </CardHeader>
              <CardContent>
                {propRevLoading ? <Skeleton className="h-64 w-full" /> : !revenueByProp.length ? (
                  <p className="text-center py-12 text-muted-foreground text-sm">No revenue data found.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={[...revenueByProp].sort((a, b) => b.revenue - a.revenue)}
                        margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v / 1000)}K`} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Bar dataKey="revenue" name="Revenue collected" fill="#6366f1" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                      {[...revenueByProp].sort((a, b) => b.revenue - a.revenue).map((p, i) => (
                        <div key={p.name} className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground w-5 text-right text-xs">{i + 1}.</span>
                          <span className="flex-1 truncate">{p.name}</span>
                          <span className="font-semibold text-indigo-700">{fmt(p.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Reports;
