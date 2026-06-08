import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Building2, Home, Users, Zap, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const TIER_COLORS: Record<string, string> = {
  // New tiers
  lite:         'border-slate-300 bg-slate-50',
  pro:          'border-blue-300 bg-blue-50',
  enterprise:   'border-amber-300 bg-amber-50',
  // Legacy tier names (backwards compat)
  starter:      'border-slate-300 bg-slate-50',
  growth:       'border-blue-300 bg-blue-50',
  professional: 'border-purple-300 bg-purple-50',
};

const TIER_BADGE: Record<string, string> = {
  lite:         'bg-slate-100 text-slate-700 border-slate-300',
  pro:          'bg-blue-100 text-blue-800 border-blue-300',
  enterprise:   'bg-amber-100 text-amber-800 border-amber-300',
  starter:      'bg-slate-100 text-slate-700 border-slate-300',
  growth:       'bg-blue-100 text-blue-700 border-blue-200',
  professional: 'bg-purple-100 text-purple-800 border-purple-300',
};

const NEXT_TIER: Record<string, string> = {
  lite: 'pro', pro: 'enterprise',
  starter: 'pro', growth: 'pro', professional: 'enterprise',
};

const TIER_LIMITS: Record<string, { props: number; units: number; price: number; label: string }> = {
  lite:         { props: 10,  units: 100,  price: 400, label: 'Lite' },
  pro:          { props: 50,  units: 500,  price: 600, label: 'Pro' },
  enterprise:   { props: 999, units: 9999, price: 500, label: 'Enterprise' },
  starter:      { props: 10,  units: 100,  price: 400, label: 'Starter' },
  growth:       { props: 20,  units: 200,  price: 450, label: 'Growth' },
  professional: { props: 50,  units: 500,  price: 400, label: 'Professional' },
};

interface ManagerSubscriptionBannerProps {
  compact?: boolean;
}

const ManagerSubscriptionBanner: React.FC<ManagerSubscriptionBannerProps> = ({ compact = false }) => {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['manager-subscription-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('manager_profiles')
        .select('subscription_tier, status, max_properties, max_units, property_count, unit_count')
        .eq('manager_user_id', user!.id)
        .maybeSingle();
      return data as { subscription_tier?: string; status?: string; max_properties?: number; max_units?: number; property_count?: number; unit_count?: number };
    },
    enabled: !!user?.id,
  });

  if (isLoading) return compact ? null : <Skeleton className="h-20 w-full" />;
  if (!profile) return null;

  const tier = profile.subscription_tier ?? 'starter';
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.starter;
  const maxProps  = profile.max_properties ?? limits.props;
  const maxUnits  = profile.max_units ?? limits.units;
  const usedProps = profile.property_count ?? 0;
  const usedUnits = profile.unit_count ?? 0;

  const propPct  = maxProps  < 999 ? Math.round((usedProps / maxProps)  * 100) : 0;
  const unitPct  = maxUnits  < 9999 ? Math.round((usedUnits / maxUnits) * 100) : 0;
  const nearLimit = propPct >= 80 || unitPct >= 80;
  const atLimit   = usedProps >= maxProps || usedUnits >= maxUnits;
  const nextTier  = NEXT_TIER[tier];

  if (compact) {
    return (
      <div className={`rounded-lg border p-3 ${atLimit ? 'border-red-300 bg-red-50' : nearLimit ? 'border-amber-300 bg-amber-50' : TIER_COLORS[tier]}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs capitalize ${TIER_BADGE[tier]}`}>
                {TIER_LIMITS[tier]?.label ?? tier}
              </Badge>
            {(atLimit || nearLimit) && <AlertTriangle className={`h-3.5 w-3.5 ${atLimit ? 'text-red-600' : 'text-amber-600'}`} />}
          </div>
          {nextTier && (
            <Link to="/platform-billing">
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                Upgrade <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-muted-foreground">Properties</span>
              <span className={`font-medium ${propPct >= 80 ? 'text-red-600' : ''}`}>
                {usedProps}/{maxProps < 999 ? maxProps : '∞'}
              </span>
            </div>
            {maxProps < 999 && <Progress value={propPct} className={`h-1.5 ${propPct >= 80 ? '[&>div]:bg-red-500' : ''}`} />}
          </div>
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-muted-foreground">Units</span>
              <span className={`font-medium ${unitPct >= 80 ? 'text-red-600' : ''}`}>
                {usedUnits}/{maxUnits < 9999 ? maxUnits : '∞'}
              </span>
            </div>
            {maxUnits < 9999 && <Progress value={unitPct} className={`h-1.5 ${unitPct >= 80 ? '[&>div]:bg-red-500' : ''}`} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`border-2 ${atLimit ? 'border-red-300 bg-red-50/40' : nearLimit ? 'border-amber-300 bg-amber-50/40' : TIER_COLORS[tier]}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${TIER_BADGE[tier].split(' ')[0]}`}>
              <Zap className={`h-5 w-5 ${tier === 'enterprise' ? 'text-amber-600' : tier === 'professional' ? 'text-purple-600' : tier === 'growth' ? 'text-blue-600' : 'text-slate-600'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm capitalize">{tier} plan</p>
                <Badge variant="outline" className={`text-xs ${TIER_BADGE[tier]}`}>{tier}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                KES {profile.platform_rate ?? limits.price}/property/month
                {profile.tenant_count > 0 && ` · ${profile.tenant_count} active tenants`}
              </p>
            </div>
          </div>
          {nextTier && (
            <Link to="/platform-billing">
              <Button size="sm" variant={atLimit ? 'default' : 'outline'} className="gap-1.5">
                {atLimit ? <AlertTriangle className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                {atLimit ? 'Upgrade required' : `Upgrade to ${nextTier}`}
              </Button>
            </Link>
          )}
        </div>

        {/* Usage bars */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Properties',  used: usedProps,  max: maxProps,  pct: propPct,  icon: Building2 },
            { label: 'Units',       used: usedUnits,  max: maxUnits,  pct: unitPct,  icon: Home },
            { label: 'Tenants',     used: profile.tenant_count ?? 0, max: maxUnits, pct: 0, icon: Users },
          ].map(stat => (
            <div key={stat.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <stat.icon className="h-3 w-3" />{stat.label}
                </span>
                <span className={`font-medium ${stat.pct >= 100 ? 'text-red-600' : stat.pct >= 80 ? 'text-amber-600' : ''}`}>
                  {stat.used} {stat.max < 999 ? `/ ${stat.max}` : ''}
                </span>
              </div>
              {stat.max < 999 && (
                <Progress value={Math.min(100, stat.pct)}
                  className={`h-2 ${stat.pct >= 100 ? '[&>div]:bg-red-500' : stat.pct >= 80 ? '[&>div]:bg-amber-500' : ''}`}
                />
              )}
            </div>
          ))}
        </div>

        {atLimit && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-700 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            You've reached your {usedProps >= maxProps ? 'property' : 'unit'} limit.
            Upgrade your plan to add more.
          </div>
        )}
        {nearLimit && !atLimit && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            You're approaching your limit. Consider upgrading before you're blocked.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManagerSubscriptionBanner;
