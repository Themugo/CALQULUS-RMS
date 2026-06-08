import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useManagerScope } from "@/shared/hooks/useManagerScope";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PropertyOccupancy {
  name: string;
  occupied: number;
  vacant: number;
  total: number;
  rate: number;
}

export function OccupancyChart() {
  const [data, setData] = useState<PropertyOccupancy[]>([]);
  const [loading, setLoading] = useState(true);
  const { managerId, restrictToAssignedProperties, assignedPropertyIds } = useManagerScope();

  const fetchOccupancyData = useCallback(async () => {
    try {
      if (!managerId) {
        setData([]);
        return;
      }
      if (restrictToAssignedProperties && assignedPropertyIds.length === 0) {
        setData([]);
        return;
      }

      let query = supabase
        .from("properties")
        .select("name, units, occupied")
        .eq("manager_id", managerId)
        .order("name");

      if (restrictToAssignedProperties) {
        query = query.in("id", assignedPropertyIds);
      }

      const { data: properties, error } = await query;

      if (error) { console.error(error); return; }

      const occupancyData: PropertyOccupancy[] = (properties || []).map((p) => ({
        name: p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name,
        occupied: p.occupied,
        vacant: p.units - p.occupied,
        total: p.units,
        rate: p.units > 0 ? Math.round((p.occupied / p.units) * 100) : 0,
      }));

      setData(occupancyData);
    } catch (err) {
      console.error('OccupancyChart.fetchOccupancyData', err);
    } finally {
      setLoading(false);
    }
  }, [assignedPropertyIds, managerId, restrictToAssignedProperties]);

  useEffect(() => {
    fetchOccupancyData();

    // Subscribe to real-time property changes
    const channel = supabase
      .channel("occupancy-chart")
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => {
        fetchOccupancyData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOccupancyData]);

  const getBarColor = (rate: number) => {
    if (rate >= 90) return "hsl(var(--success))";
    if (rate >= 70) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; occupied: number; vacant: number; rate: number } }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{item.name}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Occupied:</span>
              <span className="font-medium text-success">{item.occupied} units</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Vacant:</span>
              <span className="font-medium text-destructive">{item.vacant} units</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-border">
              <span className="text-muted-foreground">Occupancy:</span>
              <span className="font-semibold text-foreground">{item.rate}%</span>
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
        <Skeleton className="h-[180px] sm:h-[200px] w-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 card-shadow animate-fade-in">
        <h3 className="font-heading text-base sm:text-lg font-semibold text-card-foreground mb-4">
          Property Occupancy
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">
          No properties found
        </p>
      </div>
    );
  }

  const totalUnits = data.reduce((sum, p) => sum + p.total, 0);
  const totalOccupied = data.reduce((sum, p) => sum + p.occupied, 0);
  const overallRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 card-shadow animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h3 className="font-heading text-base sm:text-lg font-semibold text-card-foreground">
            Property Occupancy
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">By property</p>
        </div>
        <div className="text-right">
          <p className="text-xl sm:text-2xl font-bold text-foreground">{overallRate}%</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {totalOccupied} of {totalUnits} units
          </p>
        </div>
      </div>

      <div className="h-[180px] sm:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={50}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.rate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center gap-3 sm:gap-6 mt-3 sm:mt-4 text-[10px] sm:text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-success flex-shrink-0" />
          <span className="text-muted-foreground">90%+</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-warning flex-shrink-0" />
          <span className="text-muted-foreground">70-89%</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-destructive flex-shrink-0" />
          <span className="text-muted-foreground">&lt;70%</span>
        </div>
      </div>
    </div>
  );
}
