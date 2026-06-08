import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Separator } from '@/shared/components/ui/separator';
import { useToast } from '@/shared/hooks/use-toast';
import { Save, Building, Smartphone, CreditCard, Percent, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

interface PaymentSettings {
  id: string;
  registration_fee: number;
  subscription_rate: number;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  bank_swift_code: string | null;
  mpesa_paybill_number: string | null;
  mpesa_paybill_account: string | null;
  mpesa_till_number: string | null;
  mpesa_phone_number: string | null;
  payment_instructions: string | null;
}

const WebhostPaymentSettings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<PaymentSettings>>({
    registration_fee: 3000,
    subscription_rate: 0.01,
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch: '',
    bank_swift_code: '',
    mpesa_paybill_number: '',
    mpesa_paybill_account: '',
    mpesa_till_number: '',
    mpesa_phone_number: '',
    payment_instructions: '',
  });

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['webhost-payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhost_payment_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as PaymentSettings | null;
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        id: settings.id,
        registration_fee: settings.registration_fee,
        subscription_rate: settings.subscription_rate,
        bank_name: settings.bank_name || '',
        bank_account_name: settings.bank_account_name || '',
        bank_account_number: settings.bank_account_number || '',
        bank_branch: settings.bank_branch || '',
        bank_swift_code: settings.bank_swift_code || '',
        mpesa_paybill_number: settings.mpesa_paybill_number || '',
        mpesa_paybill_account: settings.mpesa_paybill_account || '',
        mpesa_till_number: settings.mpesa_till_number || '',
        mpesa_phone_number: settings.mpesa_phone_number || '',
        payment_instructions: settings.payment_instructions || '',
      });
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<PaymentSettings>) => {
      if (settings?.id) {
        // Update existing
        const { error } = await supabase
          .from('webhost_payment_settings')
          .update({
            registration_fee: data.registration_fee,
            subscription_rate: data.subscription_rate,
            bank_name: data.bank_name || null,
            bank_account_name: data.bank_account_name || null,
            bank_account_number: data.bank_account_number || null,
            bank_branch: data.bank_branch || null,
            bank_swift_code: data.bank_swift_code || null,
            mpesa_paybill_number: data.mpesa_paybill_number || null,
            mpesa_paybill_account: data.mpesa_paybill_account || null,
            mpesa_till_number: data.mpesa_till_number || null,
            mpesa_phone_number: data.mpesa_phone_number || null,
            payment_instructions: data.payment_instructions || null,
          })
          .eq('id', settings.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('webhost_payment_settings')
          .insert({
            registration_fee: data.registration_fee,
            subscription_rate: data.subscription_rate,
            bank_name: data.bank_name || null,
            bank_account_name: data.bank_account_name || null,
            bank_account_number: data.bank_account_number || null,
            bank_branch: data.bank_branch || null,
            bank_swift_code: data.bank_swift_code || null,
            mpesa_paybill_number: data.mpesa_paybill_number || null,
            mpesa_paybill_account: data.mpesa_paybill_account || null,
            mpesa_till_number: data.mpesa_till_number || null,
            mpesa_phone_number: data.mpesa_phone_number || null,
            payment_instructions: data.payment_instructions || null,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Payment settings saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['webhost-payment-settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save settings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field: keyof PaymentSettings, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-purple-800/30">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-1/3"></div>
            <div className="h-20 bg-slate-700 rounded"></div>
            <div className="h-20 bg-slate-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Billing Structure */}
      <Card className="bg-slate-800/50 border-purple-800/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Percent className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-white">Billing Structure</CardTitle>
              <CardDescription className="text-purple-300">
                Configure registration fee and subscription rates
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-900/30 border-blue-700">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-300">
              These settings will be used when generating new invoices for managers. Existing invoices will not be affected.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-purple-200">Registration Fee (KES)</Label>
              <Input
                type="number"
                value={formData.registration_fee || ''}
                onChange={(e) => handleChange('registration_fee', parseFloat(e.target.value) || 0)}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="3000"
              />
              <p className="text-xs text-muted-foreground">One-time fee for new manager registration</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-purple-200">Default Subscription Rate (%)</Label>
              <Input
                type="number"
                step="0.001"
                value={formData.subscription_rate ? formData.subscription_rate * 100 : ''}
                onChange={(e) => handleChange('subscription_rate', (parseFloat(e.target.value) || 0) / 100)}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">Fallback rate — overridden by tier pricing below</p>
            </div>
          </div>

          {/* Tier pricing table */}
          <div className="mt-4">
            <Label className="text-purple-200 block mb-3">Per-tier monthly pricing (KES per property)</Label>
            <TierPricingEditor />
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card className="bg-slate-800/50 border-purple-800/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Building className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-white">Bank Account Details</CardTitle>
              <CardDescription className="text-purple-300">
                Bank details shown to managers for payment
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-purple-200">Bank Name</Label>
              <Input
                value={formData.bank_name || ''}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="e.g., Equity Bank"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-purple-200">Account Name</Label>
              <Input
                value={formData.bank_account_name || ''}
                onChange={(e) => handleChange('bank_account_name', e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="e.g., RentFlow Ltd"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-purple-200">Account Number</Label>
              <Input
                value={formData.bank_account_number || ''}
                onChange={(e) => handleChange('bank_account_number', e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="e.g., 1234567890"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-purple-200">Branch</Label>
              <Input
                value={formData.bank_branch || ''}
                onChange={(e) => handleChange('bank_branch', e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="e.g., Westlands"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-purple-200">SWIFT Code (Optional)</Label>
              <Input
                value={formData.bank_swift_code || ''}
                onChange={(e) => handleChange('bank_swift_code', e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="e.g., EABORAIX"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* M-Pesa Details */}
      <Card className="bg-slate-800/50 border-purple-800/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-white">M-Pesa Payment Details</CardTitle>
              <CardDescription className="text-purple-300">
                M-Pesa details shown to managers for payment
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-purple-200">Paybill Number</Label>
              <Input
                value={formData.mpesa_paybill_number || ''}
                onChange={(e) => handleChange('mpesa_paybill_number', e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="e.g., 123456"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-purple-200">Paybill Account Number</Label>
              <Input
                value={formData.mpesa_paybill_account || ''}
                onChange={(e) => handleChange('mpesa_paybill_account', e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="e.g., Account name or number"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-purple-200">Till Number (Buy Goods)</Label>
              <Input
                value={formData.mpesa_till_number || ''}
                onChange={(e) => handleChange('mpesa_till_number', e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="e.g., 654321"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-purple-200">Phone Number (Send Money)</Label>
              <Input
                value={formData.mpesa_phone_number || ''}
                onChange={(e) => handleChange('mpesa_phone_number', e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="e.g., 0712345678"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Instructions */}
      <Card className="bg-slate-800/50 border-purple-800/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-white">Payment Instructions</CardTitle>
              <CardDescription className="text-purple-300">
                Custom instructions shown to managers when paying invoices
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.payment_instructions || ''}
            onChange={(e) => handleChange('payment_instructions', e.target.value)}
            className="bg-slate-700/50 border-slate-600 text-white min-h-[100px]"
            placeholder="Please make payment to the bank account or M-Pesa details provided above. Include your invoice number as the reference."
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={saveMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
};

// ── Tier pricing inline editor ──────────────────────────────────────
interface SubscriptionTier {
  id: string;
  tier_key: string;
  name: string | null;
  price_per_property: number | null;
  max_properties: number;
  max_units: number;
}

const TIER_KEYS = ['lite', 'pro', 'enterprise'] as const;
const TIER_LABELS: Record<string, string> = {
  lite:       'Lite (≤10 props, residential)',
  pro:        'Pro (≤50 props, all types)',
  enterprise: 'Enterprise (unlimited, all types)',
  // Legacy
  starter:    'Starter (≤5 props)',
  growth:     'Growth (≤20 props)',
  professional:'Professional (≤50 props)',
};

const TierPricingEditor: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ['subscription-tiers-edit'],
    queryFn: async () => {
      const { data } = await supabase.from('subscription_tiers')
        .select('id, tier_key, name, price_per_property, max_properties, max_units')
        .order('display_order');
      return (data || []) as SubscriptionTier[];
    },
  });

  const [prices, setPrices] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const map: Record<string, string> = {};
    tiers.forEach((t: SubscriptionTier) => { map[t.tier_key] = String(t.price_per_property ?? ''); });
    setPrices(map);
  }, [tiers]);

  const saveTiers = useMutation({
    mutationFn: async () => {
      for (const tier of tiers) {
        const newPrice = parseFloat(prices[tier.tier_key] ?? '0');
        if (isNaN(newPrice)) continue;
        await (supabase.from('subscription_tiers')
          .update({ price_per_property: newPrice })
          .eq('id', tier.id));
        // Also update manager_profiles for this tier
        await (supabase.from('manager_profiles')
          .update({ platform_rate: newPrice })
          .eq('subscription_tier', tier.tier_key));
      }
    },
    onSuccess: () => {
      toast({ title: 'Tier pricing updated' });
      queryClient.invalidateQueries({ queryKey: ['subscription-tiers-edit'] });
    },
    onError: () => toast({ title: 'Failed to update tiers', variant: 'destructive' }),
  });

  if (isLoading) return <div className="h-20 bg-slate-700/30 rounded-lg animate-pulse" />;

  return (
    <div className="rounded-xl border border-purple-800/30 bg-slate-900/40 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-purple-800/30">
            <th className="text-left py-2 px-3 text-purple-300 font-medium text-xs">Tier</th>
            <th className="text-center py-2 px-3 text-purple-300 font-medium text-xs">Max props</th>
            <th className="text-center py-2 px-3 text-purple-300 font-medium text-xs">Max units</th>
            <th className="text-right py-2 px-3 text-purple-300 font-medium text-xs">KES / prop / month</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier: SubscriptionTier, i: number) => (
            <tr key={tier.id} className={i < tiers.length - 1 ? 'border-b border-purple-800/20' : ''}>
              <td className="py-2 px-3">
                <span className="text-white font-medium capitalize">{TIER_LABELS[tier.tier_key] ?? tier.tier_key}</span>
              </td>
              <td className="py-2 px-3 text-center text-slate-400 text-xs">
                {tier.max_properties >= 999 ? '∞' : tier.max_properties}
              </td>
              <td className="py-2 px-3 text-center text-slate-400 text-xs">
                {tier.max_units >= 9999 ? '∞' : tier.max_units}
              </td>
              <td className="py-2 px-3">
                <Input
                  type="number"
                  value={prices[tier.tier_key] ?? ''}
                  onChange={e => setPrices(p => ({ ...p, [tier.tier_key]: e.target.value }))}
                  className="bg-slate-700/50 border-slate-600 text-white text-right h-8 text-sm w-28 ml-auto"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-3 border-t border-purple-800/30 flex justify-end">
        <Button size="sm" onClick={() => saveTiers.mutate()} disabled={saveTiers.isPending}
          className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saveTiers.isPending ? 'Saving…' : 'Save tier pricing'}
        </Button>
      </div>
    </div>
  );
};

export default WebhostPaymentSettings;
