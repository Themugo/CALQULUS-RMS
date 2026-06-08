/**
 * BillingStatsBar.tsx
 *
 * The four stat cards at the top of the Invoices tab.
 * Extracted from Billing.tsx (was inline JSX in the component body).
 */

import { useCurrency } from "@/shared/hooks/useCurrency";
import type { BillingInvoice } from "../hooks/useBillingData";

interface Props {
  invoices: BillingInvoice[];
}

export function BillingStatsBar({ invoices }: Props) {
  const { formatCurrency } = useCurrency();

  const stats = {
    total:   invoices.reduce((s, i) => s + i.amount, 0),
    paid:    invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0),
    pending: invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0),
    overdue: invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0),
  };

  const cards = [
    { label: "Total Billed",  value: stats.total,   color: "text-foreground" },
    { label: "Collected",     value: stats.paid,    color: "text-emerald-400" },
    { label: "Pending",       value: stats.pending, color: "text-amber-400" },
    { label: "Overdue",       value: stats.overdue, color: "text-red-400" },
  ] as const;

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, color }, i) => (
        <div
          key={label}
          className="rounded-xl border border-border bg-card p-3 sm:p-4 card-shadow animate-fade-in"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
          <p className={`font-heading text-lg sm:text-2xl font-bold truncate ${color}`}>
            {formatCurrency(value)}
          </p>
        </div>
      ))}
    </div>
  );
}
