import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Separator } from '@/shared/components/ui/separator';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Building2, Briefcase, Cog, Layers, Map, Check, X, Save,
  Zap, Star, Crown, Info, ArrowRight, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  PROPERTY_CATEGORIES, CATEGORIES_BY_GROUP, GROUP_LABELS, GROUP_COLORS,
  TIER_NAMES, TIER_BADGE_COLORS, getCategoryGroup
} from '@/shared/constants/propertyTypes';

const TIER_ICONS: Record<string, React.ElementType> = {
  lite: Zap, pro: Star, enterprise: Crown,
};

const TIER_DESCRIPTIONS: Record<string, string> = {
  lite:       'For individual landlords and small managers. Residential properties only.',
  pro:        'For growing agencies. Unlocks commercial, mixed-use, and gated estates.',
  enterprise: 'For large agencies. Unlimited properties, industrial, hotels, custom pricing.',
};

const TIER_COLORS_FULL: Record<string, string> = {
  lite:       'border-slate-300 bg-slate-50',
  pro:        'border-blue-300 bg-blue-50',
  enterprise: 'border-amber-300 bg-amber-50',
};

const TIERS = ['lite', 'pro', 'enterprise'] as const;

type TierRow = {
  id: string;
  tier_key: string;
  name?: string;
  price_per_property?: number | null;
  display_order?: number;
  features?: unknown;
  created_at?: string;
};

type TierLimitRow = {
  id: string;
  tier_key: string;
  category_group: string;
  max_properties: number;
  price_multiplier: number;
  created_at?: string;
};

type CategoryRow = {
  id: string;
  key: string;
  name?: string;
  description?: string;
  color?: string;
  group?: string;
  display_order?: number;
  billing_multiplier?: number | null;
  requires_tier?: string | null;
  created_at?: string;
};

const TierManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTier, setActiveTier] = useState<'lite' | 'pro' | 'enterprise'>('lite');
  const [editedLimits, setEditedLimits] = useState<Record<string, Record<string, { max: string; mult: string }>>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ residential: true });

  // Fetch all tier data
  const { data: tiers = [], isLoading: tiersLoading } = useQuery({
    queryKey: ['tier-management-tiers'],
    queryFn: async () => {
      const { data } = await (supabase.from('subscription_tiers')
        .select('*').order('display_order'));
      return (data || []) as TierRow[];
    },
  });

  const { data: tierLimits = [], isLoading: limitsLoading } = useQuery({
    queryKey: ['tier-management-limits'],
    queryFn: async () => {
      const { data } = await (supabase.from('property_tier_limits')
        .select('*'));
      return (data || []) as TierLimitRow[];
    },
  });

  const { data: categoryData = [] } = useQuery({
    queryKey: ['property-categories-webhost'],
    queryFn: async () => {
      const { data } = await (supabase.from('property_categories')
        .select('*').order('display_order'));
      return (data || []) as CategoryRow[];
    },
  });

  // Group limits by tier
  const limitsByTier: Record<string, Record<string, TierLimitRow>> = {};
  for (const lim of tierLimits) {
    if (!limitsByTier[lim.tier_key]) limitsByTier[lim.tier_key] = {};
    limitsByTier[lim.tier_key][lim.category_group] = lim;
  }

  const currentTierData = tiers.find(t => t.tier_key === activeTier);
  const currentLimits = limitsByTier[activeTier] ?? {};

  // Parse features array
  const parseFeatures = (f: string | string[]): string[] => {
    if (Array.isArray(f)) return f;
    if (typeof f === 'string') { try { return JSON.parse(f); } catch { return []; } }
    return [];
  };

  // Save tier pricing + limits
  const saveTier = useMutation({
    mutationFn: async () => {
      const limits = editedLimits[activeTier] ?? {};
      for (const [group, vals] of Object.entries(limits)) {
        const max  = parseInt(vals.max) || 0;
        const mult = parseFloat(vals.mult) || 1.0;
        await (supabase.from('property_tier_limits')
          .upsert({ tier_key: activeTier, category_group: group, max_properties: max, price_multiplier: mult },
            { onConflict: 'tier_key,category_group' }));
      }
    },
    onSuccess: () => {
      toast({ title: 'Tier limits saved' });
      queryClient.invalidateQueries({ queryKey: ['tier-management-limits'] });
      setEditedLimits(p => ({ ...p, [activeTier]: {} }));
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  // Save category billing multiplier
  const saveCategoryMultiplier = useMutation({
    mutationFn: async ({ key, multiplier }: { key: string; multiplier: number }) => {
      await (supabase.from('property_categories')
        .update({ billing_multiplier: multiplier })
        .eq('key', key));
    },
    onSuccess: () => {
      toast({ title: 'Category rate updated' });
      queryClient.invalidateQueries({ queryKey: ['property-categories-webhost'] });
    },
  });

  // Toggle category requires_tier
  const setRequiresTier = useMutation({
    mutationFn: async ({ key, tier }: { key: string; tier: string }) => {
      await (supabase.from('property_categories')
        .update({ requires_tier: tier }).eq('key', key));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['property-categories-webhost'] }),
  });

  const getEditedLimit = (group: string, field: 'max' | 'mult') => {
    return editedLimits[activeTier]?.[group]?.[field]
      ?? (field === 'max' ? String(currentLimits[group]?.max_properties ?? 0) : String(currentLimits[group]?.price_multiplier ?? 1.0));
  };

  const setEditedLimit = (group: string, field: 'max' | 'mult', val: string) => {
    setEditedLimits(p => ({
      ...p,
      [activeTier]: { ...p[activeTier], [group]: { ...p[activeTier]?.[group], [field]: val } },
    }));
  };

  const hasUnsavedChanges = Object.keys(editedLimits[activeTier] ?? {}).length > 0;

  if (tiersLoading || limitsLoading) return <div className="space-y-4">{[...Array(3)].map((_,i) => <Skeleton key={i} className="h-32 w-full bg-slate-800/40"/>)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Subscription tiers</h2>
          <p className="text-slate-400 text-sm">Configure what each tier unlocks and how much each property type costs</p>
        </div>
        <Button size="sm" variant="outline" className="border-purple-700 text-purple-300 gap-1.5"
          onClick={() => queryClient.invalidateQueries()}>
          <RefreshCw className="h-3.5 w-3.5"/>Refresh
        </Button>
      </div>

      {/* Tier overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map(tier => {
          const data = tiers.find(t => t.tier_key === tier);
          const Icon = TIER_ICONS[tier];
          const features = parseFeatures(data?.features);
          const isActive = activeTier === tier;
          return (
            <button key={tier} type="button" onClick={() => setActiveTier(tier)}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${isActive ? 'border-purple-500 bg-purple-900/30' : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-purple-500/20' : 'bg-slate-700/40'}`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`}/>
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{TIER_NAMES[tier]}</p>
                  <p className="text-xs text-slate-400">KES {data?.price_per_property ?? '—'}/prop/mo</p>
                </div>
                {isActive && <div className="ml-auto h-2 w-2 rounded-full bg-purple-400"/>}
              </div>
              <p className="text-xs text-slate-400 mb-2">{TIER_DESCRIPTIONS[tier]}</p>
              <div className="space-y-0.5">
                {features.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs text-slate-300">
                    <Check className="h-3 w-3 text-green-400 shrink-0"/>
                    <span className="truncate">{f}</span>
                  </div>
                ))}
                {features.length > 3 && <p className="text-xs text-slate-500">+{features.length-3} more</p>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active tier detail */}
      <Card className="bg-slate-800/50 border-purple-800/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {React.createElement(TIER_ICONS[activeTier], { className: 'h-5 w-5 text-purple-400' })}
              <CardTitle className="text-white">{TIER_NAMES[activeTier]} — property type limits</CardTitle>
            </div>
            {hasUnsavedChanges && (
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                onClick={() => saveTier.mutate()} disabled={saveTier.isPending}>
                <Save className="h-3.5 w-3.5"/>{saveTier.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            )}
          </div>
          <CardDescription className="text-slate-400">
            Set how many properties of each type this tier allows, and the pricing multiplier applied
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(CATEGORIES_BY_GROUP).map(([group, cats]) => {
            const isExpanded = expandedGroups[group] ?? false;
            const limit = currentLimits[group];
            const maxProps = editedLimits[activeTier]?.[group]?.max ?? String(limit?.max_properties ?? 0);
            const isAllowed = parseInt(maxProps) > 0;

            return (
              <div key={group} className={`rounded-xl border overflow-hidden ${isAllowed ? 'border-purple-800/30' : 'border-slate-700/30'}`}>
                {/* Group header */}
                <div
                  className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${isAllowed ? 'bg-slate-900/50 hover:bg-purple-900/10' : 'bg-slate-900/20 hover:bg-slate-800/30'}`}
                  onClick={() => setExpandedGroups(p => ({ ...p, [group]: !isExpanded }))}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`text-xs ${GROUP_COLORS[group]}`}>
                      {GROUP_LABELS[group]}
                    </Badge>
                    {isAllowed
                      ? <span className="text-xs text-green-400">✓ Allowed — max {maxProps === '999' ? '∞' : maxProps}</span>
                      : <span className="text-xs text-red-400">✗ Not available on {TIER_NAMES[activeTier]}</span>
                    }
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Quick toggle */}
                    <div onClick={e => e.stopPropagation()}>
                      <Switch
                        checked={isAllowed}
                        onCheckedChange={v => setEditedLimit(group, 'max', v ? '10' : '0')}
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400"/> : <ChevronDown className="h-4 w-4 text-slate-400"/>}
                  </div>
                </div>

                {/* Expanded: per-category details + limit editing */}
                {isExpanded && (
                  <div className="p-3 border-t border-slate-700/30 bg-slate-950/20">
                    {/* Limit controls */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <Label className="text-xs text-slate-300">Max properties (0 = blocked, 999 = ∞)</Label>
                        <Input
                          type="number" min="0" max="999"
                          value={getEditedLimit(group, 'max')}
                          onChange={e => setEditedLimit(group, 'max', e.target.value)}
                          className="mt-1 bg-slate-800/50 border-slate-600 text-white h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-300">Price multiplier (1.0 = base tier rate)</Label>
                        <Input
                          type="number" min="0" max="5" step="0.1"
                          value={getEditedLimit(group, 'mult')}
                          onChange={e => setEditedLimit(group, 'mult', e.target.value)}
                          className="mt-1 bg-slate-800/50 border-slate-600 text-white h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Category rows */}
                    <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Property types in this group</p>
                    <div className="space-y-1.5">
                      {cats.map(cat => {
                        const dbCat = categoryData.find((c: CategoryRow) => c.key === cat.key);
                        const mult = dbCat?.billing_multiplier ?? cat.billingMultiplier;
                        const reqTier = dbCat?.requires_tier ?? cat.requiresTier;
                        return (
                          <div key={cat.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-700/20">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-6 w-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}33` }}>
                                <span className="text-xs">📋</span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-white truncate">{cat.name}</p>
                                <p className="text-xs text-slate-500 truncate">{cat.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {/* Category multiplier */}
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <span>×</span>
                                <Input
                                  type="number" min="0.5" max="5" step="0.1"
                                  defaultValue={String(mult)}
                                  onBlur={e => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val !== mult) {
                                      saveCategoryMultiplier.mutate({ key: cat.key, multiplier: val });
                                    }
                                  }}
                                  className="w-14 h-6 bg-slate-800 border-slate-600 text-white text-xs text-center p-1"
                                />
                              </div>
                              {/* Requires tier */}
                              <select
                                value={reqTier}
                                onChange={e => setRequiresTier.mutate({ key: cat.key, tier: e.target.value })}
                                className="text-xs bg-slate-800 border border-slate-600 text-slate-300 rounded px-1 py-0.5 h-6"
                              >
                                <option value="lite">Lite+</option>
                                <option value="pro">Pro+</option>
                                <option value="enterprise">Enterprise</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Info: how billing is calculated */}
      <Card className="bg-slate-900/30 border-slate-700/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5"/>
            <div className="text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">How billing is calculated</p>
              <p>Monthly charge = Tier base rate × Group multiplier × Category multiplier</p>
              <p className="font-mono text-slate-300">e.g. Pro office: KES 600 × 1.8 (commercial group) × 2.0 (office category) = KES 2,160/property/month</p>
              <p>The effective rate per property varies by both the tier the manager is on and the type of property they manage. Commercial and industrial properties always cost more than residential.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TierManagement;
