import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Building, MapPin, Users, Home, TrendingUp } from 'lucide-react';

// Webhost property overview: shows all properties grouped by manager.
// Webhosts cannot reassign properties between managers — that's a manager action.
// This tab is read-only: it shows the platform-level property distribution.

interface PropertyWithManager {
  id: string;
  name: string;
  address: string;
  units: number;
  occupied: number;
  manager_id: string | null;
  manager_email: string | null;
  manager_name: string | null;
  agency_name: string | null;
}

const PropertyAssignment: React.FC = () => {
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['webhost-properties-by-manager'],
    queryFn: async () => {
      const { data: props } = await supabase
        .from('properties')
        .select('id, name, address, units, occupied, manager_id')
        .order('name');

      if (!props?.length) return [];

      // Enrich with manager profile and agency name
      const enriched = await Promise.all((props || []).map(async (p) => {
        if (!p.manager_id) return { ...p, manager_email: null, manager_name: null, agency_name: null };
        const [profileRes, agencyRes] = await Promise.all([
          supabase.from('profiles').select('email, full_name').eq('id', p.manager_id).maybeSingle(),
          supabase.from('agencies').select('name').eq('manager_id', p.manager_id).maybeSingle(),
        ]);
        return {
          ...p,
          manager_email: profileRes.data?.email ?? null,
          manager_name:  profileRes.data?.full_name ?? null,
          agency_name:   agencyRes.data?.name ?? null,
        };
      }));
      return enriched as PropertyWithManager[];
    },
  });

  // Group by manager
  const byManager: Record<string, { manager: Partial<PropertyWithManager>; props: PropertyWithManager[] }> = {};
  for (const p of properties) {
    const key = p.manager_id ?? 'unassigned';
    if (!byManager[key]) {
      byManager[key] = {
        manager: { manager_id: p.manager_id, manager_email: p.manager_email, manager_name: p.manager_name, agency_name: p.agency_name },
        props: [],
      };
    }
    byManager[key].props.push(p);
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-KE').format(n);
  const occupancyColor = (occ: number, total: number) => {
    const pct = total > 0 ? (occ / total) * 100 : 0;
    if (pct >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (pct >= 50) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <Card className="bg-slate-800/50 border-purple-800/30">
      <CardHeader>
        <CardTitle className="text-white">Property Distribution</CardTitle>
        <CardDescription className="text-purple-300">
          All {properties.length} properties grouped by manager — read-only overview
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full bg-slate-700/50" />)}
          </div>
        ) : Object.keys(byManager).length === 0 ? (
          <p className="text-center py-8 text-purple-300">No properties registered yet.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(byManager).map(([key, { manager, props }]) => {
              const totalUnits = props.reduce((s, p) => s + (p.units ?? 0), 0);
              const totalOccupied = props.reduce((s, p) => s + (p.occupied ?? 0), 0);
              const occupancyPct = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;

              return (
                <div key={key}>
                  {/* Manager header */}
                  <div className="flex items-center gap-3 mb-2 px-1">
                    <div className="h-8 w-8 rounded-lg bg-purple-600/30 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {manager.agency_name ?? manager.manager_name ?? 'Unknown manager'}
                      </p>
                      <p className="text-xs text-purple-300">{manager.manager_email ?? 'No email'}</p>
                    </div>
                    <div className="text-right text-xs text-purple-300 shrink-0">
                      <p>{props.length} properties</p>
                      <p>{totalUnits} units · {occupancyPct}% occupied</p>
                    </div>
                  </div>

                  {/* Property cards */}
                  <div className="space-y-1.5 pl-11">
                    {props.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-purple-800/20 bg-slate-900/30 hover:bg-purple-900/10 transition-colors">
                        <Building className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{p.name}</p>
                          <p className="text-xs text-purple-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />{p.address}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-purple-300 flex items-center gap-1">
                            <Home className="h-3 w-3" />{p.units ?? 0}
                          </span>
                          <Badge variant="outline" className={`text-xs ${occupancyColor(p.occupied ?? 0, p.units ?? 0)}`}>
                            {p.occupied ?? 0}/{p.units ?? 0}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PropertyAssignment;
