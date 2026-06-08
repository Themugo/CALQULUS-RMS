/**
 * InvoiceTable.tsx
 *
 * The invoice rows table extracted from Billing.tsx.
 * Receives already-filtered invoices so the parent controls search/tab filtering.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import {
  CheckCircle, Clock, AlertCircle, XCircle,
  Building, Download, Receipt, Send, Pencil, Smartphone, Loader2,
} from "lucide-react";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { formatDate } from "@/shared/lib/dateFormat";
import { downloadInvoicePDF } from "@/features/billing/lib/invoicePdfExport";
import { downloadReceiptPDF } from "@/features/billing/lib/receiptPdfExport";
import type { BillingInvoice } from "../hooks/useBillingData";

type InvoiceStatus = "paid" | "pending" | "overdue" | "cancelled";

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { styles: string; icon: React.ComponentType<{ className?: string }> }
> = {
  paid:      { styles: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle },
  pending:   { styles: "bg-amber-500/10 text-amber-400 border-amber-500/20",       icon: Clock },
  overdue:   { styles: "bg-red-500/10 text-red-400 border-red-500/20",             icon: AlertCircle },
  cancelled: { styles: "bg-slate-500/10 text-slate-400 border-slate-500/20",       icon: XCircle },
};

interface Props {
  invoices: BillingInvoice[];
  isLoading: boolean;
  userId: string | undefined;
  canEdit: boolean;
  onEdit: (invoice: BillingInvoice) => void;
  onMpesa: (invoice: BillingInvoice) => void;
  onMarkPaid: (invoiceId: string) => void;
  onSendReminder: (invoice: BillingInvoice) => void;
}

export function InvoiceTable({
  invoices,
  isLoading,
  userId,
  canEdit,
  onEdit,
  onMpesa,
  onMarkPaid,
  onSendReminder,
}: Props) {
  const { formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading invoices…
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No invoices found. Create your first invoice to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-border">
          <TableHead className="font-heading font-semibold">Invoice #</TableHead>
          <TableHead className="font-heading font-semibold">Tenant</TableHead>
          <TableHead className="font-heading font-semibold">Property</TableHead>
          <TableHead className="font-heading font-semibold">Amount</TableHead>
          <TableHead className="font-heading font-semibold">Due Date</TableHead>
          <TableHead className="font-heading font-semibold">Status</TableHead>
          <TableHead className="font-heading font-semibold text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice, index) => {
          const status = invoice.status as InvoiceStatus;
          const cfg    = STATUS_CONFIG[status] ?? STATUS_CONFIG.cancelled;
          const StatusIcon = cfg.icon;

          return (
            <TableRow
              key={invoice.id}
              className="hover:bg-muted/30 border-border animate-slide-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <TableCell className="font-medium font-mono text-foreground">
                {invoice.invoice_number}
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={invoice.tenants?.photo_url ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {invoice.tenants?.name?.split(" ").map(n => n[0]).join("") ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-foreground">{invoice.tenants?.name ?? "No Tenant"}</span>
                </div>
              </TableCell>

              <TableCell>
                {invoice.leases ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span>{invoice.leases.property} — {invoice.leases.unit}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell className="font-semibold text-foreground">
                {formatCurrency(invoice.amount)}
              </TableCell>

              <TableCell className="text-muted-foreground">
                {formatDate(invoice.due_date)}
              </TableCell>

              <TableCell>
                <Badge variant="outline" className={`${cfg.styles} gap-1`}>
                  <StatusIcon className="h-3 w-3" />
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </TableCell>

              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  {/* Download invoice PDF */}
                  <Button
                    variant="ghost" size="sm" className="h-8 px-2"
                    title="Download Invoice PDF"
                    onClick={() => downloadInvoicePDF({
                      invoice_number: invoice.invoice_number,
                      amount: invoice.amount,
                      due_date: invoice.due_date,
                      paid_date: invoice.paid_date,
                      status,
                      description: invoice.description,
                      created_at: invoice.created_at,
                      tenant: invoice.tenants
                        ? { name: invoice.tenants.name, email: invoice.tenants.email, phone: invoice.tenants.phone }
                        : null,
                      lease: invoice.leases
                        ? { property: invoice.leases.property, unit: invoice.leases.unit }
                        : null,
                    })}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {/* Download receipt PDF (paid only) */}
                  {status === "paid" && (
                    <Button
                      variant="ghost" size="sm" className="h-8 px-2 text-emerald-400"
                      title="Download Receipt PDF"
                      onClick={() => downloadReceiptPDF({
                        invoice_number: invoice.invoice_number,
                        amount: invoice.amount,
                        due_date: invoice.due_date,
                        paid_date: invoice.paid_date,
                        description: invoice.description,
                        tenant: invoice.tenants
                          ? { name: invoice.tenants.name, email: invoice.tenants.email, phone: invoice.tenants.phone }
                          : null,
                        lease: invoice.leases
                          ? { property: invoice.leases.property, unit: invoice.leases.unit }
                          : null,
                      }, userId)}
                    >
                      <Receipt className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Send reminder (pending only) */}
                  {status === "pending" && (
                    <Button
                      variant="ghost" size="sm" className="h-8 px-2"
                      title="Send Reminder"
                      onClick={() => onSendReminder(invoice)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Edit + M-Pesa + Mark Paid (non-terminal statuses) */}
                  {status !== "paid" && status !== "cancelled" && (
                    <>
                      {canEdit && (
                        <Button
                          variant="ghost" size="sm" className="h-8 px-2"
                          title="Edit Invoice"
                          onClick={() => onEdit(invoice)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline" size="sm"
                        className="h-8 text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        onClick={() => onMpesa(invoice)}
                      >
                        <Smartphone className="h-3.5 w-3.5 mr-1" />
                        M-Pesa
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-8 text-xs"
                        onClick={() => onMarkPaid(invoice.id)}
                      >
                        Mark Paid
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
