import { Layout } from "@/shared/components/layout/Layout";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { RecentActivity } from "@/features/dashboard/components/RecentActivity";
import ManagerActivityLog from "@/features/dashboard/components/ManagerActivityLog";
import ManagerSubscriptionBanner from "@/features/payments/components/ManagerSubscriptionBanner";
import { UpcomingPayments } from "@/features/dashboard/components/UpcomingPayments";
import { RevenueChart } from "@/features/dashboard/components/RevenueChart";
import { OccupancyChart } from "@/features/dashboard/components/OccupancyChart";
import { PropertiesOverview } from "@/features/dashboard/components/PropertiesOverview";
import { TenantsOverview } from "@/features/dashboard/components/TenantsOverview";
import { PendingDepositRefunds } from "@/features/dashboard/components/PendingDepositRefunds";
import { ManagerQuickActions } from "@/features/dashboard/components/ManagerQuickActions";
import { PaymentSetupStatus } from "@/features/settings/components/PaymentSetupStatus";
import { Users, FileText, CreditCard, Building2, TrendingUp, Home, AlertCircle } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ManagerOnboarding from "@/features/auth/pages/ManagerOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { toast } from "@/shared/hooks/use-toast";
import { logError } from "@/shared/lib/errorLogger";
import { useManagerScope } from "@/shared/hooks/useManagerScope";

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  newTenantsThisMonth: number;
  activeLeases: number;
  expiringLeases: number;
  revenueMTD: number;
  revenueChange: number;
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  pendingInvoices: number;
  overdueInvoices: number;
  arrearsTotal: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { managerId } = useManagerScope();
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("there");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Check if this manager is truly new. Existing/demo managers may have
  // properties but no agency row from older seeds; they should not be trapped
  // in the full-screen setup flow.
  const { data: onboardingState, isLoading: agencyLoading } = useQuery({
    queryKey: ['manager-onboarding-state', managerId],
    queryFn: async () => {
      const [agencyRes, propertiesRes, tenantsRes] = await Promise.all([
        supabase.from('agencies').select('id').eq('manager_id', managerId!).maybeSingle(),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('manager_id', managerId!),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('manager_id', managerId!),
      ]);
      return {
        hasAgency: !!agencyRes.data,
        hasFootprint: (propertiesRes.count ?? 0) > 0 || (tenantsRes.count ?? 0) > 0,
      };
    },
    enabled: !!managerId,
  });

  // Show onboarding if no agency and not dismissed
  const showOnboarding = !agencyLoading && !onboardingState?.hasAgency && !onboardingState?.hasFootprint && !onboardingDismissed;
  const { currency, setCurrency, formatCurrency, currencies } = useCurrency();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if ((data as { full_name: string })?.full_name) {
        setUserName((data as { full_name: string }).full_name.split(" ")[0]);
      }
    };
    fetchUserProfile();
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!managerId) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      const [
        tenantsResult,
        activeTenantsResult,
        inactiveTenantsResult,
        newTenantsResult,
        activeLeasesResult,
        expiringLeasesResult,
        revenueMTDResult,
        revenueLastMonthResult,
        propertiesResult,
        pendingInvoicesResult,
        overdueInvoicesResult,
        overdueAmountResult,
      ] = await Promise.all([
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("manager_id", managerId),
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("manager_id", managerId).eq("status", "active"),
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("manager_id", managerId).eq("status", "inactive"),
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("manager_id", managerId).gte("created_at", startOfMonth),
        supabase.from("leases").select("id", { count: "exact", head: true }).eq("manager_id", managerId).eq("status", "active"),
        supabase.from("leases").select("id", { count: "exact", head: true }).eq("manager_id", managerId).eq("status", "expiring"),
        supabase.from("invoices").select("amount").eq("manager_id", managerId).eq("status", "paid").gte("paid_date", startOfMonth),
        supabase.from("invoices").select("amount").eq("manager_id", managerId).eq("status", "paid").gte("paid_date", startOfLastMonth).lte("paid_date", endOfLastMonth),
        supabase.from("properties").select("units, occupied").eq("manager_id", managerId),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("manager_id", managerId).eq("status", "pending"),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("manager_id", managerId).eq("status", "overdue"),
        supabase.from("invoices").select("balance_due").eq("manager_id", managerId).eq("status", "overdue"),
      ]);

      const revenueMTD = (revenueMTDResult.data as { amount: number }[])?.reduce((sum: number, inv: { amount: number }) => sum + Number(inv.amount), 0) || 0;
      const revenueLastMonth = (revenueLastMonthResult.data as { amount: number }[])?.reduce((sum: number, inv: { amount: number }) => sum + Number(inv.amount), 0) || 0;
      const revenueChange = revenueLastMonth > 0 ? Math.round(((revenueMTD - revenueLastMonth) / revenueLastMonth) * 100) : 0;

      const totalUnits = (propertiesResult.data as { units: number; occupied: number }[])?.reduce((sum: number, p: { units: number; occupied: number }) => sum + p.units, 0) || 0;
      const totalOccupied = (propertiesResult.data as { units: number; occupied: number }[])?.reduce((sum: number, p: { units: number; occupied: number }) => sum + p.occupied, 0) || 0;
      const occupancyRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;

      setStats({
        totalTenants: tenantsResult.count || 0,
        activeTenants: activeTenantsResult.count || 0,
        inactiveTenants: inactiveTenantsResult.count || 0,
        newTenantsThisMonth: newTenantsResult.count || 0,
        activeLeases: activeLeasesResult.count || 0,
        expiringLeases: expiringLeasesResult.count || 0,
        revenueMTD,
        revenueChange,
        totalProperties: propertiesResult.data?.length || 0,
        totalUnits,
        occupiedUnits: totalOccupied,
        occupancyRate,
        pendingInvoices: pendingInvoicesResult.count || 0,
        overdueInvoices: overdueInvoicesResult.count || 0,
        arrearsTotal: (overdueAmountResult.data as { balance_due: number }[])?.reduce((s: number, i: { balance_due: number }) => s + Number(i.balance_due ?? 0), 0) || 0,
      });
    } catch (err) {
      logError('Dashboard.fetchStats', err);
      toast({ title: "Error", description: "Failed to load dashboard statistics. Please refresh.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [managerId, setStats, setLoading]);

  useEffect(() => {
    fetchStats();

    const channels = [
      supabase.channel('dash-tenants').on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, fetchStats).subscribe(),
      supabase.channel('dash-leases').on('postgres_changes', { event: '*', schema: 'public', table: 'leases' }, fetchStats).subscribe(),
      supabase.channel('dash-invoices').on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchStats).subscribe(),
      supabase.channel('dash-properties').on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, fetchStats).subscribe(),
    ];

    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [fetchStats]);

  return (
    <Layout 
      title={`${getGreeting()}, ${userName}`}
      subtitle={stats ? `${stats.activeTenants} active · ${stats.totalProperties} properties · ${stats.occupancyRate}% full` : "Loading..."}
      headerActions={
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((curr) => (
              <SelectItem key={curr.code} value={curr.code}>
                {curr.symbol} {curr.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {/* Full-screen onboarding for new managers without agency */}
      {showOnboarding && (
        <ManagerOnboarding onComplete={() => {
          setOnboardingDismissed(true);
          queryClient.invalidateQueries({ queryKey: ['manager-onboarding-state'] });
        }} />
      )}

      <div className="mb-6">
        <PaymentSetupStatus />
      </div>

      {/* Demo mode banner */}
      {user?.email?.includes('@rentflow.ink') && (
        <div className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50/80 px-4 py-3">
          <span className="text-sm text-amber-800"><strong>Demo mode</strong> — sample data</span>
        </div>
      )}

      {/* Stats Grid - 6 cards for comprehensive overview */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-4 sm:mb-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 sm:h-28 rounded-2xl" />
          ))
        ) : stats ? (
          <>
            <StatCard
              title="Properties"
              value={stats.totalProperties.toString()}
              change={`${stats.totalUnits} units total`}
              changeType="neutral"
              icon={Building2}
              iconColor="primary"
            />
            <StatCard
              title="Tenants"
              value={stats.totalTenants.toString()}
              change={`${stats.activeTenants} active`}
              changeType={stats.activeTenants > 0 ? "positive" : "neutral"}
              icon={Users}
              iconColor="accent"
            />
            <StatCard
              title="Occupancy"
              value={`${stats.occupancyRate}%`}
              change={`${stats.occupiedUnits}/${stats.totalUnits} units`}
              changeType={stats.occupancyRate >= 90 ? "positive" : stats.occupancyRate >= 70 ? "neutral" : "negative"}
              icon={Home}
              iconColor="success"
            />
            <StatCard
              title="Revenue (MTD)"
              value={formatCurrency(stats.revenueMTD)}
              change={stats.revenueChange !== 0 ? `${stats.revenueChange > 0 ? "+" : ""}${stats.revenueChange}%` : "No change"}
              changeType={stats.revenueChange > 0 ? "positive" : stats.revenueChange < 0 ? "negative" : "neutral"}
              icon={TrendingUp}
              iconColor="warning"
            />
            <StatCard
              title="Active Leases"
              value={stats.activeLeases.toString()}
              change={stats.expiringLeases > 0 ? `${stats.expiringLeases} expiring` : "None expiring"}
              changeType={stats.expiringLeases > 0 ? "neutral" : "positive"}
              icon={FileText}
              iconColor="primary"
            />
            <StatCard
              title="Invoices Due"
              value={(stats.pendingInvoices + stats.overdueInvoices).toString()}
              change={stats.overdueInvoices > 0 ? `${stats.overdueInvoices} overdue` : "All on time"}
              changeType={stats.overdueInvoices > 0 ? "negative" : "positive"}
              icon={CreditCard}
              iconColor="accent"
            />
            {stats.arrearsTotal > 0 && (
              <StatCard
                title="Total Arrears"
                value={formatCurrency(stats.arrearsTotal)}
                change={`${stats.overdueInvoices} overdue invoice${stats.overdueInvoices !== 1 ? "s" : ""}`}
                changeType="negative"
                icon={AlertCircle}
                iconColor="destructive"
              />
            )}
          </>
        ) : null}
      </div>

      {/* Quick Actions */}
      <div className="mb-4 sm:mb-6">
        <ManagerSubscriptionBanner compact />
        <ManagerQuickActions hasProperties={(stats?.totalProperties || 0) > 0} />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 mb-4 sm:mb-6">
        <RevenueChart />
        <OccupancyChart />
      </div>

      {/* Properties and Tenants Overview */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 mb-4 sm:mb-6">
        <PropertiesOverview />
        <TenantsOverview />
      </div>

      {/* Activity and Payments Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <RecentActivity />
        <ManagerActivityLog compact limit={20} />
        <UpcomingPayments />
      </div>

      {/* Pending Refunds */}
      <div className="mt-4 sm:mt-6">
        <PendingDepositRefunds />
      </div>
    </Layout>
  );
};

export default Dashboard;
