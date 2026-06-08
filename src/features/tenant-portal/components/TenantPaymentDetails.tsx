/**
 * TenantPaymentDetails
 *
 * Shows a tenant exactly what the manager set at registration:
 * - Monthly rent amount
 * - House + water deposit amounts and balance
 * - Other charges (service charge, garbage, etc.)
 * - Payment day (when rent is due each month)
 * - M-Pesa paybill/till + account reference
 * - Tenancy type (standard / formal lease / etc.)
 *
 * This data comes from tenant_payment_details which is populated when
 * the manager registers the tenant. It is read-only for the tenant.
 */
import React, { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Progress } from '@/shared/components/ui/progress';
import {
  CreditCard, Building2, Smartphone, Calendar,
  Shield, Info, Copy, CheckCircle
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

const fmt = (n: number | null | undefined) =>
  n == null ? '—' :
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

const TENANCY_LABELS: Record<string, string> = {
  standard:     'Standard tenancy',
  formal_lease: 'Formal lease',
  short_term:   'Short-term tenancy',
  commercial:   'Commercial tenancy',
};

const TenantPaymentDetails: React.FC = () => {
  const { user, userRole } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: details, isLoading } = useQuery({
    queryKey: ['tenant-payment-details', user?.id],
    queryFn: async () => {
      // Try tenant_payment_details first (new table)
      const tenantId = userRole?.tenant_id;
      if (tenantId) {
        const { data } = await (supabase
          .from('tenant_payment_details')
          .select('*')
          .eq('tenant_id', tenantId)
          .maybeSingle());
        if (data) return data as { monthly_rent?: number; house_deposit?: number; water_deposit?: number; deposit_balance?: number; other_charges?: number; other_charges_desc?: string; tenancy_type?: string; paybill_number?: string | null; account_reference?: string; payment_day?: number };
      }

      // Fallback: read from tenants table directly
      if (tenantId) {
        const { data } = await supabase
          .from('tenants')
          .select('monthly_rent, deposit_amount, deposit_balance, deposit_months, other_charges, other_charges_description, property, unit, move_in_date')
          .eq('id', tenantId)
          .maybeSingle();
        if (data) {
          const row = data as { monthly_rent: number; deposit_amount: number; deposit_balance: number; other_charges: number; other_charges_description: string; unit: string };
          return {
            monthly_rent:    row.monthly_rent,
            house_deposit:   row.deposit_amount,
            deposit_balance: row.deposit_balance,
            total_deposit:   row.deposit_amount,
            other_charges:   row.other_charges,
            other_charges_desc: row.other_charges_description,
            tenancy_type:    'standard',
            paybill_number:  null,
            account_reference: row.unit,
            payment_day:     1,
          } as { monthly_rent: number; house_deposit: number; deposit_balance: number; total_deposit: number; other_charges: number; other_charges_desc: string; tenancy_type: string; paybill_number: null; account_reference: string; payment_day: number };
        }
      }

      // Fallback: get manager's M-Pesa settings
      return null;
    },
    enabled: !!user?.id && !!userRole?.tenant_id,
  });

  // Also fetch manager's M-Pesa settings for paybill info
  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant-info-for-payment', userRole?.tenant_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenants')
        .select('manager_id, property, unit, unit_id')
        .eq('id', userRole!.tenant_id!)
        .maybeSingle();
      return data as { manager_id: string; property: string; unit: string; unit_id: string };
    },
    enabled: !!userRole?.tenant_id,
  });

  const { data: mpesaSettings } = useQuery({
    queryKey: ['manager-mpesa-for-tenant', tenantInfo?.manager_id],
    queryFn: async () => {
      const { data } = await (supabase
        .from('manager_mpesa_settings')
        .select('paybill_shortcode, paybill_enabled, till_shortcode, till_enabled, paybill_account_reference')
        .eq('manager_id', tenantInfo!.manager_id)
        .maybeSingle());
      return data as { paybill_shortcode: string; paybill_enabled: boolean; till_shortcode: string; till_enabled: boolean; paybill_account_reference: string };
    },
    enabled: !!tenantInfo?.manager_id,
  });

  const copyAccountRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!details && !mpesaSettings) return null;

  const paybill  = details?.paybill_number || (mpesaSettings?.paybill_enabled ? mpesaSettings?.paybill_shortcode : null);
  const till     = mpesaSettings?.till_enabled ? mpesaSettings?.till_shortcode : null;
  const accRef   = details?.account_reference || mpesaSettings?.paybill_account_reference || tenantInfo?.unit || '';
  const depositPaid   = Number(details?.house_deposit ?? 0) - Number(details?.deposit_balance ?? details?.house_deposit ?? 0);
  const depositTotal  = Number(details?.house_deposit ?? 0) + Number(details?.water_deposit ?? 0);
  const depositPaidPct = depositTotal > 0 ? Math.round((depositPaid / depositTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Tenancy type + summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Your tenancy
            </CardTitle>
            {details?.tenancy_type && (
              <Badge variant="outline" className="text-xs capitalize">
                {TENANCY_LABELS[details.tenancy_type] ?? details.tenancy_type}
              </Badge>
            )}
          </div>
          <CardDescription>
            {tenantInfo?.property}{tenantInfo?.unit ? ` · Unit ${tenantInfo.unit}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Monthly rent</p>
              <p className="text-xl font-bold text-green-800">{fmt(details?.monthly_rent)}</p>
              {details?.payment_day && (
                <p className="text-xs text-green-700 mt-0.5 flex items-center justify-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due {details.payment_day === 1 ? '1st' : `${details.payment_day}th`} of month
                </p>
              )}
            </div>
            <div className="rounded-xl bg-slate-50 border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total deposit</p>
              <p className="text-xl font-bold">{fmt(depositTotal || details?.house_deposit)}</p>
              {details?.house_deposit && details?.water_deposit && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  House + Water deposit
                </p>
              )}
            </div>
          </div>

          {/* Deposit breakdown */}
          {details?.house_deposit != null && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />Deposit paid
                </span>
                <span className="font-medium">
                  {fmt(depositPaid)} / {fmt(depositTotal || details.house_deposit)}
                  <span className="text-muted-foreground ml-1">({depositPaidPct}%)</span>
                </span>
              </div>
              <Progress value={depositPaidPct} className="h-2" />
            </div>
          )}

          {/* Other charges */}
          {details?.other_charges != null && Number(details.other_charges) > 0 && (
            <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-xs">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
              <div>
                <span className="font-medium">Additional charges: </span>
                <span>{fmt(details.other_charges)}/month</span>
                {details.other_charges_desc && <span className="text-muted-foreground"> ({details.other_charges_desc})</span>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* M-Pesa payment instructions */}
      {(paybill || till) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-green-600" />
              Pay via M-Pesa
            </CardTitle>
            <CardDescription>Use these details to pay rent via M-Pesa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {paybill && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-green-900 uppercase tracking-wide">Paybill</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-green-700 mb-0.5">Paybill Number</p>
                    <p className="text-2xl font-bold font-mono text-green-900">{paybill}</p>
                  </div>
                  {accRef && (
                    <div className="text-center">
                      <p className="text-xs text-green-700 mb-0.5">Account Number</p>
                      <p className="text-xl font-bold font-mono text-green-900">{accRef}</p>
                    </div>
                  )}
                </div>
                {accRef && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-green-300 text-green-800"
                    onClick={() => copyAccountRef(accRef)}
                  >
                    {copied ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied!' : 'Copy account number'}
                  </Button>
                )}

                {/* Step-by-step instructions */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-green-900">How to pay:</p>
                  {[
                    'Go to M-Pesa on your phone',
                    'Select Lipa na M-Pesa → Paybill',
                    `Enter Business No: ${paybill}`,
                    `Enter Account No: ${accRef || 'your unit number'}`,
                    `Enter Amount: ${fmt(details?.monthly_rent)}`,
                    'Enter your M-Pesa PIN and confirm',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-green-800">
                      <span className="h-4 w-4 rounded-full bg-green-200 text-green-900 font-bold flex items-center justify-center shrink-0 text-xs">{i + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {till && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                <p className="text-xs font-semibold text-green-900 uppercase tracking-wide mb-2">Buy Goods (Till)</p>
                <div className="text-center">
                  <p className="text-xs text-green-700">Till Number</p>
                  <p className="text-2xl font-bold font-mono text-green-900">{till}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TenantPaymentDetails;
