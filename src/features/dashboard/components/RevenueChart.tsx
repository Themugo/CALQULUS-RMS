import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { useManagerScope } from "@/shared/hooks/useManagerScope";

interface MonthlyRevenue {
  month: string;
  revenue: number;
  paid: number;
  pending: number;
}

export function RevenueChart() {
  const [data, setData] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatCurrency, formatCurrencyCompact } = useCurrency();
  const { managerId, restrictToAssignedProperties, assignedPropertyIds } = useManagerScope();

  const fetchRevenueData = useCallback(async () => {
    try {
      if (!managerId) {
        setData([]);
        return;
      }
      if (restrictToAssignedProperties && assignedPropertyIds.length === 0) {
        setData([]);
        return;
      }

      let scopedTenantIds: string[] | null = null;
      if (restrictToAssignedProperties) {
        const { data: scopedTenants } = await supabase
          .from("tenants")
          .select("id")
          .eq("manager_id", managerId)
          .in("property_id", assignedPropertyIds);
        scopedTenantIds = (scopedTenants || []).map((tenant) => tenant.id);
        if (scopedTenantIds.length === 0) {
          setData([]);
          return;
        }
      }

      const now = new Date();
      const months: MonthlyRevenue[] = [];

      // Get last 6 months of data
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate).toISOString();
        const monthEnd = endOfMonth(monthDate).toISOString();

        let paidQuery = supabase
          .from("invoices")
          .select("amount")
          .eq("manager_id", managerId)
          .eq("status", "paid")
          .gte("paid_date", monthStart.split("T")[0])
          .lte("paid_date", monthEnd.split("T")[0]);
        let pendingQuery = supabase
          .from("invoices")
          .select("amount")
          .eq("manager_id", managerId)
          .in("status", ["pending", "overdue"])
          .gte("due_date", monthStart.split("T")[0])
          .lte("due_date", monthEnd.split("T")[0]);

        if (scopedTenantIds) {
          paidQuery = paidQuery.in("tenant_id", scopedTenantIds);
          pendingQuery = pendingQuery.in("tenant_id", scopedTenantIds);
        }

        const [paidResult, pendingResult] = await Promise.all([paidQuery, pendingQuery]);

        const paid = paidResult.data?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
        const pending = pendingResult.data?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

        months.push({
          month: format(monthDate, "MMM"),
          revenue: paid + pending,
          paid,
          pending,
        });
      }

      setData(months);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [assignedPropertyIds, managerId, restrictToAssignedProperties]);

  useEffect(() => {
    fetchRevenueData();

    // Subscribe to real-time invoice changes
    const channel = supabase
      .channel("revenue-chart")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {
        fetchRevenueData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRevenueData]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-muted-foreground">Paid:</span>
              <span className="font-medium text-foreground">
                {formatCurrency(payload[0]?.value || 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-muted-foreground">Pending:</span>
              <span className="font-medium text-foreground">
                {formatCurrency(payload[1]?.value || 0)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 card-shadow animate-fade-in">
        <Skeleton className="h-5 sm:h-6 w-32 sm:w-40 mb-4" />
        <Skeleton className="h-[200px] sm:h-[250px] w-full" />
      </div>
    );
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.paid, 0);
  const totalPending = data.reduce((sum, d) => sum + d.pending, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 card-shadow animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h3 className="font-heading text-base sm:text-lg font-semibold text-card-foreground">
            Revenue Overview
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">Last 6 months</p>
        </div>
        <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-success flex-shrink-0" />
            <span className="text-muted-foreground hidden xs:inline">Collected</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-warning flex-shrink-0" />
            <span className="text-muted-foreground hidden xs:inline">Pending</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(totalPending)}
            </span>
          </div>
        </div>
      </div>

      <div className="h-[200px] sm:h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={formatCurrencyCompact}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="paid"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPaid)"
            />
            <Area
              type="monotone"
              dataKey="pending"
              stroke="hsl(var(--warning))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPending)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
