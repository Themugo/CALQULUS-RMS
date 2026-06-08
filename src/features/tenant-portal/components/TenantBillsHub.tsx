/**
 * TenantBillsHub — Rent, water, security & amenities with pay-one or pay-combined.
 */
import { format } from 'date-fns';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { chargeMeta } from '@/shared/constants/chargeTypes';
import {
  Receipt, Smartphone, Layers, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react';
import type { PayableInvoice } from '@/features/tenant-portal/components/TenantPayNowDialog';

interface TenantBillsHubProps {
  tenantId: string;
  onPay: (invoices: PayableInvoice[]) => void;
}

interface InvoiceRow extends PayableInvoice {
  lineItems: { charge_type: string; charge_label: string; amount: number }[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

const balanceOf = (inv: PayableInvoice) => Number(inv.balance_due ?? inv.amount);

const TenantBillsHub: React.FC<TenantBillsHubProps> = ({ tenantId, onPay }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['tenant-bills-hub', tenantId],
    queryFn: async (): Promise<InvoiceRow[]> => {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, balance_due, paid_amount, due_date, status, description')
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      if (!invoices?.length) return [];

      const ids = invoices.map((i) => i.id);
      const { data: lines } = await supabase
        .from('invoice_line_items')
        .select('invoice_id, charge_type, charge_label, amount')
        .in('invoice_id', ids);

      const linesByInv = new Map<string, typeof lines>();
      for (const line of lines ?? []) {
        const list = linesByInv.get(line.invoice_id) ?? [];
        list.push(line);
        linesByInv.set(line.invoice_id, list);
      }

      return invoices.map((inv) => ({
        ...inv,
        status: inv.status as PayableInvoice['status'],
        lineItems: (linesByInv.get(inv.id) ?? []).map((l) => ({
          charge_type: l.charge_type,
          charge_label: l.charge_label,
          amount: Number(l.amount),
        })),
      }));
    },
    enabled: !!tenantId,
  });

  const payable = bills.filter((b) => balanceOf(b) > 0);
  const totalDue = payable.reduce((s, b) => s + balanceOf(b), 0);

  const selectedBills = useMemo(
    () => payable.filter((b) => selected.has(b.id)),
    [payable, selected],
  );
  const selectedTotal = selectedBills.reduce((s, b) => s + balanceOf(b), 0);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(payable.map((b) => b.id)));
  const clearSelection = () => setSelected(new Set());

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (payable.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="py-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <p className="font-semibold text-green-900">All caught up</p>
          <p className="text-sm text-green-700 mt-1">No outstanding rent, water, or amenity bills.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5 text-primary" />
              My bills
            </CardTitle>
            <CardDescription>
              Pay rent, water, security & other charges separately or in one M-Pesa payment
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total outstanding</p>
            <p className="text-2xl font-bold text-foreground">{fmt(totalDue)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select all ({payable.length})
          </Button>
          {selected.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {payable.map((bill) => {
            const meta = bill.lineItems.length
              ? chargeMeta(bill.lineItems[0].charge_type)
              : chargeMeta(
                  bill.description?.toLowerCase().includes('water')
                    ? 'water'
                    : bill.description?.toLowerCase().includes('security')
                      ? 'security'
                      : 'rent',
                );
            const Icon = meta.icon;
            const isOverdue = bill.status === 'overdue';
            const isChecked = selected.has(bill.id);

            return (
              <div
                key={bill.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isChecked ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggle(bill.id)}
                    className="mt-1"
                    aria-label={`Select ${bill.invoice_number}`}
                  />
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border ${meta.bg}`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm">
                        {bill.lineItems.length
                          ? bill.lineItems.map((l) => l.charge_label).join(' · ')
                          : bill.description || meta.label}
                      </p>
                      <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="text-xs">
                        {isOverdue ? (
                          <><AlertCircle className="h-3 w-3 mr-1" />Overdue</>
                        ) : (
                          <><Clock className="h-3 w-3 mr-1" />Due {format(new Date(bill.due_date), 'dd MMM')}</>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{bill.invoice_number}</p>
                    {bill.lineItems.length > 1 && (
                      <ul className="mt-2 space-y-0.5">
                        {bill.lineItems.map((l, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex justify-between gap-2">
                            <span>{l.charge_label}</span>
                            <span>{fmt(l.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">{fmt(balanceOf(bill))}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-8 text-xs border-green-300 text-green-800 hover:bg-green-50"
                      onClick={() => onPay([bill])}
                    >
                      Pay only
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl bg-muted/50 border p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              {selected.size === 0
                ? 'Select bills to combine, or use Pay only on each row'
                : `${selected.size} bill${selected.size > 1 ? 's' : ''} selected`}
            </p>
            {selected.size > 0 && (
              <p className="text-xl font-bold mt-0.5">{fmt(selectedTotal)}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white gap-2 h-11"
              disabled={selected.size === 0}
              onClick={() => onPay(selectedBills)}
            >
              <Layers className="h-4 w-4" />
              Pay selected ({selected.size || 0})
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="gap-2 h-11"
              onClick={() => onPay(payable)}
            >
              <Smartphone className="h-4 w-4" />
              Pay everything — {fmt(totalDue)}
            </Button>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Instant receipt by email & SMS after M-Pesa confirms · Manager keys plug in at Settings → Payments
        </p>
      </CardContent>
    </Card>
  );
};

export default TenantBillsHub;
