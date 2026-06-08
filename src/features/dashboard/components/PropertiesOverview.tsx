import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Building2, ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useManagerScope } from "@/shared/hooks/useManagerScope";

interface Property {
  id: string;
  name: string;
  address: string;
  units: number;
  occupied: number;
  image_url: string | null;
}

export function PropertiesOverview() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { managerId, restrictToAssignedProperties, assignedPropertyIds } = useManagerScope();

  const fetchProperties = useCallback(async () => {
    try {
      if (!managerId) {
        setProperties([]);
        return;
      }
      if (restrictToAssignedProperties && assignedPropertyIds.length === 0) {
        setProperties([]);
        return;
      }

      let query = supabase
        .from("properties")
        .select("id, name, address, units, occupied, image_url")
        .eq("manager_id", managerId)
        .order("name", { ascending: true })
        .limit(4);

      if (restrictToAssignedProperties) {
        query = query.in("id", assignedPropertyIds);
      }

      const { data, error } = await query;

      if (error) { console.error(error); return; }
      setProperties(data || []);
    } catch (err) {
      console.error('PropertiesOverview.fetchProperties', err);
    } finally {
      setLoading(false);
    }
  }, [assignedPropertyIds, managerId, restrictToAssignedProperties]);

  useEffect(() => {
    fetchProperties();

    const channel = supabase
      .channel('properties-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        fetchProperties();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProperties]);

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return "bg-emerald-500";
    if (rate >= 70) return "bg-amber-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-white via-white to-slate-50/50 p-4 sm:p-6 shadow-sm animate-fade-in backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <Skeleton className="h-5 sm:h-6 w-32 sm:w-40 rounded-lg" />
          <Skeleton className="h-7 sm:h-8 w-20 sm:w-24 rounded-lg" />
        </div>
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/30 border border-border/30">
              <Skeleton className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-28 sm:w-36 rounded-md" />
                <Skeleton className="h-3.5 w-24 sm:w-28 rounded-md" />
              </div>
              <Skeleton className="h-6 sm:h-7 w-16 sm:w-20 rounded-lg" />
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
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          Properties
        </h3>
        <Link to="/properties">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/5 h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm rounded-xl transition-all duration-200">
            View All
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-8 sm:py-10">
          <div className="rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-4 sm:p-6 inline-block mb-3 sm:mb-4">
            <Building2 className="h-12 w-12 sm:h-14 sm:w-14 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground text-sm sm:text-base font-medium mb-3 sm:mb-4">No properties yet</p>
          <Link to="/properties">
            <Button variant="outline" size="sm" className="h-9 sm:h-10 text-xs sm:text-sm rounded-xl border-2 hover:bg-primary hover:text-white hover:border-primary transition-all duration-200">
              Add Property
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {properties.map((property, index) => {
            const occupancyRate = property.units > 0 
              ? Math.round((property.occupied / property.units) * 100) 
              : 0;
            
            return (
              <Link
                key={property.id}
                to={`/properties/${property.id}`}
                className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/20 hover:from-muted/50 hover:to-muted/40 border border-border/30 hover:border-border/50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 animate-slide-in touch-manipulation"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-primary/10 group-hover:shadow-md transition-all duration-300">
                  {property.image_url ? (
                    <img 
                      src={property.image_url} 
                      alt={property.name}
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold text-sm sm:text-base text-card-foreground truncate">
                    {property.name}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                    <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 text-muted-foreground/70" />
                    <span className="truncate">{property.address}</span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1.5">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-semibold border-2",
                      occupancyRate >= 90 && "border-emerald-500/50 text-emerald-600 bg-emerald-500/5",
                      occupancyRate >= 70 && occupancyRate < 90 && "border-amber-500/50 text-amber-600 bg-amber-500/5",
                      occupancyRate < 70 && "border-red-500/50 text-red-600 bg-red-500/5"
                    )}
                  >
                    {property.occupied}/{property.units}
                  </Badge>
                  <div className="mt-1.5 sm:mt-2 w-16 sm:w-20 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", getOccupancyColor(occupancyRate))}
                      style={{ width: `${occupancyRate}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
