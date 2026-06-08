import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import {
  OPERATING_MODELS,
  type OperatingModel,
  shouldSetLandlordAsPropertyOperator,
  paymentDestinationForModel,
} from '@/shared/constants/authorityModels';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Shield, Info } from 'lucide-react';

export interface PropertyLandlordAuthorityRow {
  id: string;
  landlord_user_id: string;
  operating_model?: OperatingModel | string | null;
  payment_destination?: 'manager' | 'landlord' | null;
  revenue_share_pct?: number | null;
  management_fee_pct?: number | null;
  allows_delegated_manager?: boolean | null;
  delegated_manager_id?: string | null;
}

interface PropertyAuthorityPanelProps {
  propertyId: string;
  link: PropertyLandlordAuthorityRow;
}

const PropertyAuthorityPanel: React.FC<PropertyAuthorityPanelProps> = ({ propertyId, link }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [operatingModel, setOperatingModel] = useState<OperatingModel>(
    (link.operating_model as OperatingModel) || 'agency_collects_full_management',
  );
  const [revenueShare, setRevenueShare] = useState(String(link.revenue_share_pct ?? 100));
  const [mgmtFee, setMgmtFee] = useState(link.management_fee_pct != null ? String(link.management_fee_pct) : '');
  const [allowsDelegate, setAllowsDelegate] = useState(link.allows_delegated_manager ?? true);
  const [delegateEmail, setDelegateEmail] = useState('');

  useEffect(() => {
    setOperatingModel((link.operating_model as OperatingModel) || 'agency_collects_full_management');
    setRevenueShare(String(link.revenue_share_pct ?? 100));
    setMgmtFee(link.management_fee_pct != null ? String(link.management_fee_pct) : '');
    setAllowsDelegate(link.allows_delegated_manager ?? true);
  }, [link]);

  const meta = OPERATING_MODELS.find((m) => m.id === operatingModel) ?? OPERATING_MODELS[2];
  const showMgmtFee = operatingModel === 'agency_manages_fee_from_landlord';
  const showDelegate = operatingModel === 'landlord_self_managed' || allowsDelegate;

  const saveAuthority = useMutation({
    mutationFn: async () => {
      const share = parseFloat(revenueShare);
      if (isNaN(share) || share < 0 || share > 100) throw new Error('Revenue share must be 0–100');
      let managementFee: number | null = null;
      if (showMgmtFee && mgmtFee.trim()) {
        managementFee = parseFloat(mgmtFee);
        if (isNaN(managementFee) || managementFee < 0 || managementFee > 100) {
          throw new Error('Management fee must be 0–100');
        }
      }

      let delegatedManagerId: string | null = link.delegated_manager_id ?? null;
      if (showDelegate && delegateEmail.trim()) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', delegateEmail.trim().toLowerCase())
          .maybeSingle();
        if (!profile) throw new Error('No user found with that email. They must sign up as a manager first.');
        delegatedManagerId = profile.id;
      } else if (!allowsDelegate && operatingModel !== 'landlord_self_managed') {
        delegatedManagerId = null;
      }

      const paymentDest = paymentDestinationForModel(operatingModel);

      const { error: linkError } = await supabase
        .from('property_landlords')
        .update({
          operating_model: operatingModel,
          payment_destination: paymentDest,
          revenue_share_pct: share,
          management_fee_pct: managementFee,
          allows_delegated_manager: allowsDelegate,
          delegated_manager_id: delegatedManagerId,
        })
        .eq('id', link.id);
      if (linkError) throw linkError;

      let operatorId = user?.id ?? null;
      if (shouldSetLandlordAsPropertyOperator(operatingModel)) {
        operatorId = allowsDelegate && delegatedManagerId ? delegatedManagerId : link.landlord_user_id;
      } else if (delegatedManagerId && allowsDelegate) {
        operatorId = delegatedManagerId;
      }

      if (operatorId) {
        const { error: propError } = await supabase
          .from('properties')
          .update({ manager_id: operatorId })
          .eq('id', propertyId);
        if (propError) throw propError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-landlord', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      toast({ title: 'Authority settings saved', description: meta.title });
      setDelegateEmail('');
    },
    onError: (err: Error) => toast({ title: 'Save failed', description: err.message, variant: 'destructive' }),
  });

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2">
          <Shield className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <CardTitle className="text-base">Authority & operating model</CardTitle>
            <CardDescription>
              Who runs operations vs who collects rent — Category {meta.category}. Payments route to{' '}
              <Badge variant="outline" className="mx-1 text-xs">
                {paymentDestinationForModel(operatingModel)}
              </Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Operating model</Label>
          <Select value={operatingModel} onValueChange={(v) => setOperatingModel(v as OperatingModel)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATING_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="font-medium">{m.shortLabel}</span>
                  <span className="text-muted-foreground ml-2 text-xs">— Cat {m.category}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2 flex gap-1">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {meta.description}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-xs rounded-lg bg-muted/40 p-3">
          <div>
            <p className="text-muted-foreground">Operates</p>
            <p className="font-medium">{meta.whoOperates}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Collects</p>
            <p className="font-medium">{meta.whoCollects}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Paid</p>
            <p className="font-medium">{meta.whoGetsPaid}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Landlord revenue share %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="mt-1"
              value={revenueShare}
              onChange={(e) => setRevenueShare(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Used when agency collects and remits to landlord.</p>
          </div>
          {showMgmtFee && (
            <div>
              <Label>Management fee % (landlord pays agency)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="mt-1"
                value={mgmtFee}
                onChange={(e) => setMgmtFee(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow external manager / agency</Label>
                <p className="text-xs text-muted-foreground">
                  Keeps the door open to assign an outside operator without changing ownership.
                </p>
              </div>
              <Switch checked={allowsDelegate} onCheckedChange={setAllowsDelegate} />
            </div>
            {showDelegate && allowsDelegate && (
              <div>
                <Label>Delegated manager email (optional)</Label>
                <Input
                  type="email"
                  className="mt-1"
                  placeholder="agency@example.com"
                  value={delegateEmail}
                  onChange={(e) => setDelegateEmail(e.target.value)}
                />
                {link.delegated_manager_id && !delegateEmail && (
                  <p className="text-xs text-muted-foreground mt-1">A delegated manager is already linked.</p>
                )}
              </div>
            )}
        </div>

        <Button onClick={() => saveAuthority.mutate()} disabled={saveAuthority.isPending}>
          {saveAuthority.isPending ? 'Saving…' : 'Save authority settings'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PropertyAuthorityPanel;
