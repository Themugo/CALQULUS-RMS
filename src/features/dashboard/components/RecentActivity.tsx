import {
  FileText,
  UserPlus,
  AlertTriangle,
  Clock,
  LucideIcon,
  Home,
  Wrench,
  Receipt,
  UserCheck,
  LogOut,
  RefreshCw,
  Bell,
  CheckCircle,
  XCircle,
  Building2,
  Key
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/shared/components/ui/badge";
import { useManagerScope } from "@/shared/hooks/useManagerScope";

interface Activity {
  id: string;
  action: string;
  description: string;
  created_at: string;
  tenant_name?: string;
  category?: string;
}

const getActivityIcon = (action: string): { icon: LucideIcon; iconBg: string; category: string } => {
  const actionLower = action.toLowerCase();
  
  // Payment related
  if (actionLower.includes("payment received") || actionLower.includes("paid")) {
    return { icon: CheckCircle, iconBg: "bg-emerald-500/10 text-emerald-500", category: "Payment" };
  }
  if (actionLower.includes("payment") && actionLower.includes("fail")) {
    return { icon: XCircle, iconBg: "bg-destructive/10 text-destructive", category: "Payment" };
  }
  
  // Invoice related
  if (actionLower.includes("invoice created") || actionLower.includes("invoice generated")) {
    return { icon: Receipt, iconBg: "bg-blue-500/10 text-blue-500", category: "Invoice" };
  }
  if (actionLower.includes("invoice")) {
    return { icon: FileText, iconBg: "bg-blue-500/10 text-blue-500", category: "Invoice" };
  }
  
  // Lease related
  if (actionLower.includes("lease created") || actionLower.includes("lease signed")) {
    return { icon: Key, iconBg: "bg-violet-500/10 text-violet-500", category: "Lease" };
  }
  if (actionLower.includes("lease")) {
    return { icon: FileText, iconBg: "bg-violet-500/10 text-violet-500", category: "Lease" };
  }
  
  // Tenant related
  if (actionLower.includes("account created") || actionLower.includes("credentials")) {
    return { icon: UserCheck, iconBg: "bg-teal-500/10 text-teal-500", category: "Account" };
  }
  if (actionLower.includes("created") && actionLower.includes("tenant")) {
    return { icon: UserPlus, iconBg: "bg-primary/10 text-primary", category: "Tenant" };
  }
  if (actionLower.includes("move out") || actionLower.includes("vacated")) {
    return { icon: LogOut, iconBg: "bg-orange-500/10 text-orange-500", category: "Tenant" };
  }
  if (actionLower.includes("tenant") || actionLower.includes("move in")) {
    return { icon: UserPlus, iconBg: "bg-primary/10 text-primary", category: "Tenant" };
  }
  
  // Property related
  if (actionLower.includes("property")) {
    return { icon: Building2, iconBg: "bg-indigo-500/10 text-indigo-500", category: "Property" };
  }
  if (actionLower.includes("unit")) {
    return { icon: Home, iconBg: "bg-indigo-500/10 text-indigo-500", category: "Property" };
  }
  
  // Maintenance related
  if (actionLower.includes("maintenance") || actionLower.includes("repair")) {
    return { icon: Wrench, iconBg: "bg-amber-500/10 text-amber-500", category: "Maintenance" };
  }
  
  // Alerts and notifications
  if (actionLower.includes("overdue") || actionLower.includes("alert") || actionLower.includes("warning")) {
    return { icon: AlertTriangle, iconBg: "bg-destructive/10 text-destructive", category: "Alert" };
  }
  if (actionLower.includes("reminder") || actionLower.includes("notification")) {
    return { icon: Bell, iconBg: "bg-yellow-500/10 text-yellow-500", category: "Notification" };
  }
  
  // Status updates
  if (actionLower.includes("updated") || actionLower.includes("renewed")) {
    return { icon: RefreshCw, iconBg: "bg-cyan-500/10 text-cyan-500", category: "Update" };
  }
  
  return { icon: Clock, iconBg: "bg-muted text-muted-foreground", category: "Activity" };
};

const getCategoryBadgeVariant = (category: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (category) {
    case "Payment":
      return "default";
    case "Alert":
      return "destructive";
    default:
      return "secondary";
  }
};

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { managerId, restrictToAssignedProperties, assignedPropertyIds } = useManagerScope();

  const fetchActivities = useCallback(async () => {
    try {
      if (!managerId) {
        setActivities([]);
        return;
      }
      if (restrictToAssignedProperties && assignedPropertyIds.length === 0) {
        setActivities([]);
        return;
      }

      let tenantQuery = supabase
        .from("tenants")
        .select("id, name")
        .eq("manager_id", managerId);
      if (restrictToAssignedProperties) {
        tenantQuery = tenantQuery.in("property_id", assignedPropertyIds);
      }
      const { data: tenants } = await tenantQuery;
      const tenantIds = (tenants || []).map((tenant) => tenant.id);
      const tenantMap = new Map(tenants?.map((tenant) => [tenant.id, tenant.name]) || []);
      if (tenantIds.length === 0) {
        setActivities([]);
        return;
      }

      // Fetch recent tenant history with tenant names
      const { data, error } = await supabase
        .from("tenant_history")
        .select(`
          id,
          action,
          description,
          created_at,
          tenant_id
        `)
        .in("tenant_id", tenantIds)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) { console.error(error); return; }

      if (!data || data.length === 0) {
        setActivities([]);
        return;
      }

      const activitiesData: Activity[] = data.map((item) => {
        const { category } = getActivityIcon(item.action);
        return {
          id: item.id,
          action: item.action,
          description: item.description,
          created_at: item.created_at,
          tenant_name: tenantMap.get(item.tenant_id) || undefined,
          category,
        };
      });

      setActivities(activitiesData);
    } catch (err) {
      console.error('RecentActivity.fetchActivities', err);
    } finally {
      setLoading(false);
    }
  }, [assignedPropertyIds, managerId, restrictToAssignedProperties]);

  useEffect(() => {
    fetchActivities();

    // Subscribe to real-time tenant_history changes
    const channel = supabase
      .channel('recent-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tenant_history' }, () => {
        fetchActivities();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivities]);

  const formatTime = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 card-shadow animate-fade-in">
        <Skeleton className="h-5 sm:h-6 w-28 sm:w-32 mb-4" />
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 sm:gap-4">
              <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-3.5 sm:h-4 w-24 sm:w-32 mb-1.5 sm:mb-2" />
                <Skeleton className="h-3 w-36 sm:w-48" />
              </div>
              <Skeleton className="h-3 w-14 sm:w-16 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 card-shadow animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-base sm:text-lg font-semibold text-card-foreground">
          Recent Activity
        </h3>
        <Badge variant="outline" className="text-xs">
          {activities.length} updates
        </Badge>
      </div>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No recent activity
            </p>
          </div>
        ) : (
          activities.map((activity, index) => {
            const { icon: Icon, iconBg, category } = getActivityIcon(activity.action);
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn("rounded-lg p-2 flex-shrink-0", iconBg)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-card-foreground truncate">
                      {activity.action}
                    </p>
                    <Badge 
                      variant={getCategoryBadgeVariant(category)} 
                      className="text-[10px] px-1.5 py-0 h-4 hidden sm:inline-flex"
                    >
                      {category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {activity.tenant_name && (
                      <span className="font-medium text-foreground/70">{activity.tenant_name}: </span>
                    )}
                    {activity.description}
                  </p>
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
                  {formatTime(activity.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
