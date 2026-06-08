import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import {
  TrendingUp, TrendingDown, DollarSign,
  AlertTriangle, Banknote
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

interface Props {
  properties: Array<{
    id: string;
    name: string;
    revenue_share_pct: number;
    manager_name: string | null;
  }>;
}

const LandlordFinancialStatement: React.FC<Props> = ({ properties }) => {
  const { user } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id ?? '');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const periodStart = `${period}-01`;
  const periodEnd = endOfMonth(new Date(periodStart)).toISOString().slice(0, 10);

  const { data: financials, isLoading } = useQuery({
    queryKey: ['landlord-financials', selectedPropertyId, period, user?.id],
    queryFn: async () => {
      if (!selectedPropertyId) return null;
      const { data, error } = await supabase.rpc('get_landlord_revenue' as unknown as string, {
        p_property_id:      selectedPropertyId,
        p_landlord_user_id: user!.id,
        p_period_start:     periodStart,
        p_period_end:       periodEnd,
      });
      if (error) throw error;
      return (data?.[0] as Record<string, unknown>) ?? null;
    },
    enabled: !!selectedPropertyId && !!user?.id,
  });

  // 6-month trend
  const { data: trend = [] } = useQuery({
    queryKey: ['landlord-trend', selectedPropertyId, user?.id],
    queryFn: async () => {
      if (!selectedPropertyId) return [];
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i);
        return { month: format(d, 'MMM'), start: startOfMonth(d).toISOString().slice(0, 10), end: endOfMonth(d).toISOString().slice(0, 10) };
      });

      const results = await Promise.all(months.map(async m => {
        const { data } = await supabase.rpc('get_landlord_revenue' as unknown as string, {
          p_property_id:      selectedPropertyId,
          p_landlord_user_id: user!.id,
          p_period_start:     m.start,
          p_period_end:       m.end,
        });
        return { month: m.month, revenue: Number((data?.[0] as Record<string, unknown>)?.net_to_landlord ?? 0) };
      }));
      return results;
    },
    enabled: !!selectedPropertyId && !!user?.id,
  });

  const property = properties.find(p => p.id === selectedPropertyId);
  const mgmtFee = 100 - (property?.revenue_share_pct ?? 100);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Property</Label>
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Period</Label>
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !financials ? null : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Gross rent collected',  value: fmt(financials.gross_rent_collected), icon: TrendingUp,  color: 'text-blue-700',  bg: 'bg-blue-50' },
              { label: `Management fee (${mgmtFee}%)`, value: fmt(financials.management_fee), icon: TrendingDown, color: 'text-slate-600', bg: 'bg-slate-50' },
              { label: 'Your net revenue',       value: fmt(financials.net_to_landlord),    icon: Banknote,    color: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Payout pending',         value: fmt(financials.payout_pending),     icon: DollarSign,  color: 'text-amber-700', bg: 'bg-amber-50' },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Occupancy */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total units',    value: String(financials.total_units) },
              { label: 'Occupied',       value: String(financials.occupied_units) },
              { label: 'Occupancy rate', value: `${financials.occupancy_rate}%` },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-border p-3 bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-xl font-semibold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Arrears warning */}
          {Number(financials.arrears_total) > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Outstanding arrears</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {fmt(financials.arrears_total)} in unpaid invoices across your property. Your manager is working to collect.
                </p>
              </div>
            </div>
          )}

          {/* Revenue breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Revenue breakdown — {format(new Date(periodStart), 'MMMM yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Gross rent collected</span>
                  <span className="font-semibold">{fmt(financials.gross_rent_collected)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Management fee ({mgmtFee}% — {property?.manager_name ?? 'Manager'})
                  </span>
                  <span className="text-slate-600">– {fmt(financials.management_fee)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Net to you ({property?.revenue_share_pct}%)</span>
                  <span className="text-xl font-bold text-green-700">{fmt(financials.net_to_landlord)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 6-month trend */}
      {trend.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">6-month revenue trend (your net)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : String(v)} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LandlordFinancialStatement;
