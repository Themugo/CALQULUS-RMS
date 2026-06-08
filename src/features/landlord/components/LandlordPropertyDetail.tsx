import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Progress } from '@/shared/components/ui/progress';
import {
  Building2, Home, Wrench, DollarSign, BarChart3
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

const STATUS_BADGE: Record<string, string> = {
  occupied:    'bg-green-100 text-green-800 border-green-200',
  vacant:      'bg-amber-100 text-amber-800 border-amber-200',
  maintenance: 'bg-red-100 text-red-800 border-red-200',
  reserved:    'bg-blue-100 text-blue-800 border-blue-200',
};

const MAINTENANCE_STATUS: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-800 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed:   'bg-green-100 text-green-800 border-green-200',
  cancelled:   'bg-slate-100 text-slate-600 border-slate-200',
};

interface Props {
  propertyId: string;
  propertyName: string;
  revenueSharePct: number;
}

const LandlordPropertyDetail: React.FC<Props> = ({ propertyId, propertyName, revenueSharePct }) => {
  const [period] = useState(new Date().toISOString().slice(0, 7));

  // Units — no tenant personal data (name/email/phone) — only unit facts
  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ['landlord-units', propertyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('units')
        .select(`
          id, unit_number, label, status, monthly_rent,
          unit_type, floor_number, bedrooms, house_deposit,
          available_from
        `)
        .eq('property_id', propertyId)
        .neq('status', 'inactive')
        .order('unit_number');
      return (data || []) as Array<{ id: string; unit_number: string; status: string; monthly_rent: number }>;
    },
  });

  // Revenue by unit (from invoices — no tenant name) 
  const { data: unitRevenue = [] } = useQuery({
    queryKey: ['landlord-unit-revenue', propertyId, period],
    queryFn: async () => {
      const start = `${period}-01`;
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      const endStr = end.toISOString().slice(0, 10);
      const { data } = await supabase
        .from('invoices')
        .select('unit_id, amount, paid_amount, status')
        .eq('property_id', propertyId)
        .gte('due_date', start)
        .lt('due_date', endStr);
      // Group by unit_id
      const map: Record<string, { billed: number; collected: number }> = {};
      for (const inv of (data || []) as Array<{ unit_id: string; amount: number; paid_amount: number | null }>) {
        if (!map[inv.unit_id]) map[inv.unit_id] = { billed: 0, collected: 0 };
        map[inv.unit_id].billed += Number(inv.amount);
        map[inv.unit_id].collected += Number(inv.paid_amount ?? 0);
      }
      return map;
    },
  });

  // Maintenance requests — only unit/category/status/cost, NO tenant PII
  const { data: maintenance = [], isLoading: maintLoading } = useQuery({
    queryKey: ['landlord-maintenance', propertyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('maintenance_requests')
        .select(`
          id, unit_number, unit_id, title, category,
          priority, status, requested_date, completion_date,
          budget, deposit_deduction_amount, created_at
        `)
        .eq('property_name', propertyName)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(30);
      return (data || []) as Array<{ id: string; unit_number: string; unit_id: string | null; title: string; category: string; priority: string; status: string; requested_date: string; completion_date: string | null; budget: number | null; deposit_deduction_amount: number | null; created_at: string }>;
    },
  });

  // 6-month revenue trend
  const { data: trend = [] } = useQuery({
    queryKey: ['landlord-property-trend', propertyId],
    queryFn: async () => {
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return d.toISOString().slice(0, 7);
      });
      const rows = await Promise.all(months.map(async (m) => {
        const start = `${m}-01`;
        const endD = new Date(start); endD.setMonth(endD.getMonth() + 1);
        const { data } = await supabase
          .from('invoices')
          .select('paid_amount, status')
          .eq('property_id', propertyId)
          .gte('due_date', start)
          .lt('due_date', endD.toISOString().slice(0, 10))
          .in('status', ['paid', 'partially_paid']);
        const total = (data || []).reduce((s: number, i: { paid_amount: number | null }) => s + Number(i.paid_amount ?? 0), 0);
        return { month: m.slice(5), gross: total, net: Math.round(total * revenueSharePct / 100) };
      }));
      return rows;
    },
  });

  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === 'occupied').length;
  const vacantUnits = units.filter(u => u.status === 'vacant').length;
  const maintenanceUnits = units.filter(u => u.status === 'maintenance').length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const openMaintenance = maintenance.filter(m => m.status !== 'completed').length;
  const monthlyGross = units.filter(u => u.status === 'occupied')
    .reduce((s, u) => s + Number(u.monthly_rent ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Occupancy', value: `${occupancyRate}%`, sub: `${occupiedUnits}/${totalUnits} units`, icon: Home, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Vacant units', value: vacantUnits, sub: maintenanceUnits > 0 ? `+${maintenanceUnits} on maintenance` : 'Ready to let', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Monthly gross rent', value: fmt(monthlyGross), sub: `${fmt(Math.round(monthlyGross * revenueSharePct / 100))} net to you`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Open maintenance', value: openMaintenance, sub: openMaintenance > 0 ? 'Requires attention' : 'All clear', icon: Wrench, color: openMaintenance > 0 ? 'text-red-600' : 'text-green-600', bg: openMaintenance > 0 ? 'bg-red-50' : 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-border p-4 ${s.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="units">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="units" className="text-xs gap-1.5">
            <Home className="h-3.5 w-3.5" />Units ({totalUnits})
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="text-xs gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Maintenance
            {openMaintenance > 0 && (
              <span className="ml-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">{openMaintenance}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />Revenue trend
          </TabsTrigger>
        </TabsList>

        {/* ── Units tab ── */}
        <TabsContent value="units" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Unit occupancy — {propertyName}</CardTitle>
              <CardDescription>
                Unit numbers and status only — tenant personal information is managed privately by your property manager.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unitsLoading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : (
                <div className="space-y-2">
                  {units.map(unit => {
                    const rev = unitRevenue[unit.id];
                    const daysVacant = unit.status === 'vacant' && unit.available_from
                      ? differenceInDays(new Date(), new Date(unit.available_from))
                      : null;
                    return (
                      <div key={unit.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                        unit.status === 'vacant' ? 'border-amber-200 bg-amber-50/30' :
                        unit.status === 'maintenance' ? 'border-red-200 bg-red-50/30' :
                        'border-border'
                      }`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            unit.status === 'occupied' ? 'bg-green-100 text-green-800' :
                            unit.status === 'vacant' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {(unit.label || unit.unit_number).slice(-2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">{unit.label || unit.unit_number}</p>
                              <Badge variant="outline" className={`text-xs ${STATUS_BADGE[unit.status] || ''}`}>
                                {unit.status}
                              </Badge>
                              {unit.bedrooms && <span className="text-xs text-muted-foreground">{unit.bedrooms}BR</span>}
                              {unit.floor_number && <span className="text-xs text-muted-foreground">Floor {unit.floor_number}</span>}
                            </div>
                            {daysVacant !== null && daysVacant > 0 && (
                              <p className="text-xs text-amber-700 mt-0.5">
                                Vacant {daysVacant} day{daysVacant !== 1 ? 's' : ''}
                                {daysVacant > 30 && ' — consider reviewing asking rent'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {unit.monthly_rent && (
                            <p className="text-sm font-semibold">{fmt(unit.monthly_rent)}/mo</p>
                          )}
                          {rev && (
                            <p className={`text-xs mt-0.5 ${rev.collected < rev.billed ? 'text-amber-700' : 'text-green-700'}`}>
                              {fmt(rev.collected)} collected
                              {rev.collected < rev.billed && ` (${fmt(rev.billed - rev.collected)} outstanding)`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Occupancy progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Overall occupancy</p>
                <span className="text-sm font-bold text-green-700">{occupancyRate}%</span>
              </div>
              <Progress value={occupancyRate} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{occupiedUnits} occupied</span>
                <span>{vacantUnits} vacant</span>
                {maintenanceUnits > 0 && <span>{maintenanceUnits} maintenance</span>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Maintenance tab ── */}
        <TabsContent value="maintenance" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Maintenance requests — {propertyName}
              </CardTitle>
              <CardDescription>
                Unit numbers and categories only — managed by your property manager.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {maintLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : maintenance.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No maintenance requests</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {maintenance.map(m => (
                    <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                      m.status === 'completed' ? 'border-green-200 bg-green-50/20 opacity-75' :
                      m.priority === 'urgent' || m.priority === 'high' ? 'border-red-200 bg-red-50/30' :
                      'border-border'
                    }`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{m.unit_number ? `Unit ${m.unit_number}` : 'Common area'}</p>
                            <Badge variant="outline" className={`text-xs ${MAINTENANCE_STATUS[m.status] || ''}`}>
                              {m.status?.replace('_', ' ')}
                            </Badge>
                            {m.priority === 'urgent' && (
                              <Badge className="text-xs bg-red-100 text-red-800 border-red-200">Urgent</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {m.title}
                            {m.category && ` · ${m.category}`}
                            {m.requested_date && ` · ${format(new Date(m.requested_date), 'dd/MM/yy')}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {m.budget && <p className="text-xs text-muted-foreground">Budget: {fmt(m.budget)}</p>}
                        {m.deposit_deduction_amount > 0 && (
                          <p className="text-xs text-orange-700">Deposit deduction: {fmt(m.deposit_deduction_amount)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Revenue trend tab ── */}
        <TabsContent value="revenue" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">6-month revenue — {propertyName}</CardTitle>
              <CardDescription>Gross collected vs your net ({revenueSharePct}% share)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="gross" name="Gross collected" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="net" name={`Your net (${revenueSharePct}%)`} fill="#16a34a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-slate-400 inline-block" />Gross collected</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-green-600 inline-block" />Your net ({revenueSharePct}%)</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LandlordPropertyDetail;
