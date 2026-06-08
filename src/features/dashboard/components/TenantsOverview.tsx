import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Users, ArrowRight, Home, Mail } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useManagerScope } from "@/shared/hooks/useManagerScope";

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  property: string | null;
  unit: string | null;
  status: string;
  photo_url: string | null;
}

const statusStyles: Record<string, string> = {
  active: "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-500/30",
  pending: "bg-gradient-to-br from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-500/30",
  inactive: "bg-gradient-to-br from-slate-500/10 to-slate-500/5 text-slate-600 border-slate-500/30",
};

export function TenantsOverview() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const { managerId, restrictToAssignedProperties, assignedPropertyIds } = useManagerScope();

  const generateSignedUrls = useCallback(async (tenantsList: Tenant[]) => {
    const urlMap: Record<string, string> = {};
    
    for (const tenant of tenantsList) {
      if (tenant.photo_url) {
        let filePath = tenant.photo_url;
        if (filePath.includes('/tenant-photos/')) {
          filePath = filePath.split('/tenant-photos/').pop() || filePath;
        }
        
        const { data, error } = await supabase.storage
          .from('tenant-photos')
          .createSignedUrl(filePath, 3600);
        
        if (data && !error) {
          urlMap[tenant.id] = data.signedUrl;
        }
      }
    }
    
    setSignedUrls(urlMap);
  }, []);

  const fetchTenants = useCallback(async () => {
    try {
      if (!managerId) {
        setTenants([]);
        return;
      }
      if (restrictToAssignedProperties && assignedPropertyIds.length === 0) {
        setTenants([]);
        return;
      }

      let query = supabase
        .from("tenants")
        .select("id, name, email, phone, property, unit, status, photo_url")
        .eq("manager_id", managerId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (restrictToAssignedProperties) {
        query = query.in("property_id", assignedPropertyIds);
      }

      const { data, error } = await query;

      if (error) { console.error(error); return; }
      setTenants(data || []);
      
      if (data && data.length > 0) {
        generateSignedUrls(data);
      }
    } catch (err) {
      console.error('TenantsOverview.fetchTenants', err);
    } finally {
      setLoading(false);
    }
  }, [assignedPropertyIds, generateSignedUrls, managerId, restrictToAssignedProperties]);

  useEffect(() => {
    fetchTenants();

    const channel = supabase
      .channel('tenants-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {
        fetchTenants();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTenants]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-white via-white to-slate-50/50 p-4 sm:p-6 shadow-sm animate-fade-in backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-36 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-muted/30 border border-border/30">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-3.5 w-36 rounded-md" />
              </div>
              <Skeleton className="h-6 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-white via-white to-slate-50/50 p-4 sm:p-6 shadow-sm animate-fade-in backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <h3 className="font-heading text-base sm:text-lg font-semibold text-card-foreground flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 p-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          Recent Tenants
        </h3>
        <Link to="/tenants">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/5 h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm rounded-xl transition-all duration-200">
            View All
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-8 sm:py-10">
          <div className="rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-4 sm:p-6 inline-block mb-3 sm:mb-4">
            <Users className="h-12 w-12 sm:h-14 sm:w-14 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground text-sm sm:text-base font-medium mb-3 sm:mb-4">No tenants yet</p>
          <Link to="/tenants">
            <Button variant="outline" size="sm" className="h-9 sm:h-10 text-xs sm:text-sm rounded-xl border-2 hover:bg-primary hover:text-white hover:border-primary transition-all duration-200">
              Add Tenant
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tenants.map((tenant, index) => (
            <Link
              key={tenant.id}
              to="/tenants"
              className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/20 hover:from-muted/50 hover:to-muted/40 border border-border/30 hover:border-border/50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 animate-slide-in touch-manipulation"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-border/50 group-hover:border-primary/30 transition-all duration-300">
                <AvatarImage src={signedUrls[tenant.id]} alt={tenant.name} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm sm:text-base font-semibold">
                  {getInitials(tenant.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-semibold text-sm sm:text-base text-card-foreground truncate">
                  {tenant.name}
                </p>
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                  {tenant.property && (
                    <span className="flex items-center gap-1.5 truncate">
                      <Home className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{tenant.property}{tenant.unit && ` - ${tenant.unit}`}</span>
                    </span>
                  )}
                  {!tenant.property && (
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{tenant.email}</span>
                    </span>
                  )}
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={cn("text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-semibold border-2 capitalize", statusStyles[tenant.status] || statusStyles.inactive)}
              >
                {tenant.status}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
