import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Percent, Users, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface MonthlyData {
  month: string;
  monthLabel: string;
  registrationRevenue: number;
  subscriptionRevenue: number;
  totalRevenue: number;
  netCollection: number;
  invoiceCount: number;
}

interface ManagerStats {
  manager_user_id: string;
  total_billed: number;
  total_paid: number;
  pending_amount: number;
  email: string;
  full_name: string | null;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const BillingAnalytics = () => {
  // Fetch all invoices for analytics
  const { data: invoices } = useQuery({
    queryKey: ['billing-analytics-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manager_invoices')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch manager profiles for breakdown
  const { data: managers } = useQuery({
    queryKey: ['billing-analytics-managers'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'manager');

      if (error) throw error;

      const managersWithProfiles = await Promise.all(
        (roles || []).map(async (role) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', role.user_id)
            .single();

          return {
            user_id: role.user_id,
            email: profile?.email || 'Unknown',
            full_name: profile?.full_name || null,
          };
        })
      );

      return managersWithProfiles;
    },
  });

  // Calculate monthly data for the last 6 months
  const monthlyData: MonthlyData[] = React.useMemo(() => {
    if (!invoices) return [];

    const months: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(subMonths(new Date(), i));
      const monthLabel = format(monthStart, 'MMM yyyy');
      const monthKey = format(monthStart, 'yyyy-MM');

      const monthInvoices = invoices.filter(inv => {
        const invDate = parseISO(inv.created_at);
        return invDate >= monthStart && invDate <= monthEnd;
      });

      const registrationRevenue = monthInvoices
        .filter(inv => inv.invoice_type === 'registration' && inv.status === 'paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

      const subscriptionRevenue = monthInvoices
        .filter(inv => inv.invoice_type === 'subscription' && inv.status === 'paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

      const netCollection = monthInvoices
        .filter(inv => inv.invoice_type === 'subscription')
        .reduce((sum, inv) => sum + Number(inv.net_collection || 0), 0);

      months.push({
        month: monthKey,
        monthLabel,
        registrationRevenue,
        subscriptionRevenue,
        totalRevenue: registrationRevenue + subscriptionRevenue,
        netCollection,
        invoiceCount: monthInvoices.length,
      });
    }

    return months;
  }, [invoices]);

  // Calculate manager breakdown
  const managerBreakdown: ManagerStats[] = React.useMemo(() => {
    if (!invoices || !managers) return [];

    return managers.map(manager => {
      const managerInvoices = invoices.filter(inv => inv.manager_user_id === manager.user_id);
      
      return {
        manager_user_id: manager.user_id,
        email: manager.email,
        full_name: manager.full_name,
        total_billed: managerInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0),
        total_paid: managerInvoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + Number(inv.amount), 0),
        pending_amount: managerInvoices
          .filter(inv => inv.status === 'pending')
          .reduce((sum, inv) => sum + Number(inv.amount), 0),
      };
    }).sort((a, b) => b.total_paid - a.total_paid);
  }, [invoices, managers]);

  // Calculate totals
  const totals = React.useMemo(() => {
    if (!invoices) return { total: 0, paid: 0, pending: 0, registrations: 0, subscriptions: 0, avgCommission: 0 };

    const total = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const paid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount), 0);
    const pending = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + Number(inv.amount), 0);
    const registrations = invoices.filter(inv => inv.invoice_type === 'registration' && inv.status === 'paid').length;
    const subscriptions = invoices.filter(inv => inv.invoice_type === 'subscription' && inv.status === 'paid').length;
    
    const subscriptionInvoices = invoices.filter(inv => inv.invoice_type === 'subscription' && inv.status === 'paid');
    const totalNetCollection = subscriptionInvoices.reduce((sum, inv) => sum + Number(inv.net_collection || 0), 0);
    const totalCommission = subscriptionInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const avgCommission = totalNetCollection > 0 ? (totalCommission / totalNetCollection) * 100 : 0;

    return { total, paid, pending, registrations, subscriptions, avgCommission };
  }, [invoices]);

  // Calculate trend (compare this month vs last month)
  const trend = React.useMemo(() => {
    if (monthlyData.length < 2) return { value: 0, isPositive: true };
    
    const thisMonth = monthlyData[monthlyData.length - 1]?.totalRevenue || 0;
    const lastMonth = monthlyData[monthlyData.length - 2]?.totalRevenue || 0;
    
    if (lastMonth === 0) return { value: 100, isPositive: thisMonth > 0 };
    
    const percentChange = ((thisMonth - lastMonth) / lastMonth) * 100;
    return { value: Math.abs(percentChange), isPositive: percentChange >= 0 };
  }, [monthlyData]);

  // Invoice type distribution for pie chart
  const invoiceTypeData = React.useMemo(() => {
    if (!invoices) return [];

    const registrationTotal = invoices
      .filter(inv => inv.invoice_type === 'registration' && inv.status === 'paid')
      .reduce((sum, inv) => sum + Number(inv.amount), 0);

    const subscriptionTotal = invoices
      .filter(inv => inv.invoice_type === 'subscription' && inv.status === 'paid')
      .reduce((sum, inv) => sum + Number(inv.amount), 0);

    return [
      { name: 'Registration', value: registrationTotal, color: '#3b82f6' },
      { name: 'Subscription', value: subscriptionTotal, color: '#8b5cf6' },
    ].filter(item => item.value > 0);
  }, [invoices]);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-300">Total Revenue</p>
                <p className="text-2xl font-bold text-white">KES {totals.paid.toLocaleString()}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {trend.isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {trend.value.toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-purple-300">Registrations</p>
                <p className="text-2xl font-bold text-white">{totals.registrations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Percent className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-purple-300">Subscriptions</p>
                <p className="text-2xl font-bold text-white">{totals.subscriptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-purple-300">Pending</p>
                <p className="text-2xl font-bold text-white">KES {totals.pending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-purple-300">Avg Commission</p>
                <p className="text-2xl font-bold text-white">{totals.avgCommission.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Trend Chart */}
        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              Revenue Trend
            </CardTitle>
            <CardDescription className="text-purple-300">Last 6 months revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="monthLabel" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #7c3aed', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`KES ${value.toLocaleString()}`, '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="registrationRevenue"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    name="Registration"
                  />
                  <Area
                    type="monotone"
                    dataKey="subscriptionRevenue"
                    stackId="1"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                    name="Subscription"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-purple-300">Registration</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm text-purple-300">Subscription</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Distribution */}
        <Card className="bg-slate-800/50 border-purple-800/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-400" />
              Revenue Distribution
            </CardTitle>
            <CardDescription className="text-purple-300">By invoice type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {invoiceTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={invoiceTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {invoiceTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #7c3aed', borderRadius: '8px' }}
                      formatter={(value: number) => [`KES ${value.toLocaleString()}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-purple-400">No paid invoices yet</p>
              )}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {invoiceTypeData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-purple-300">{item.name}: KES {item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manager Breakdown */}
      <Card className="bg-slate-800/50 border-purple-800/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Manager Revenue Breakdown
          </CardTitle>
          <CardDescription className="text-purple-300">Revenue contribution by manager</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={managerBreakdown.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <YAxis 
                  type="category" 
                  dataKey="full_name" 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  width={120}
                  tickFormatter={(value) => value?.slice(0, 15) || 'Unknown'}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #7c3aed', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: number) => [`KES ${value.toLocaleString()}`, '']}
                />
                <Bar dataKey="total_paid" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Paid" />
                <Bar dataKey="pending_amount" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-purple-300">Paid</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-purple-300">Pending</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Net Collection Trend */}
      <Card className="bg-slate-800/50 border-purple-800/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-400" />
            Net Collection vs Commission
          </CardTitle>
          <CardDescription className="text-purple-300">Manager collections and platform commission over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="monthLabel" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #7c3aed', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: number) => [`KES ${value.toLocaleString()}`, '']}
                />
                <Bar dataKey="netCollection" fill="#10b981" radius={[4, 4, 0, 0]} name="Net Collection" />
                <Bar dataKey="subscriptionRevenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Commission (1%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-purple-300">Net Collection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-purple-300">Commission (1%)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingAnalytics;
