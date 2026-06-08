/**
 * reconcile-bank/index.ts
 * Records bank transfer, marks invoice paid, sends instant email+SMS receipt with balance
 */
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const fmt = (n: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);
const log = (s: string, d?: unknown) => console.log(`[BANK-RECONCILE] ${s}`, d ? JSON.stringify(d) : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();

    // Single bank payment recording
    if (body.invoiceId) {
      const { invoiceId, amount, bankRef, paymentDate, managerId } = body;
      if (!invoiceId || !amount || !bankRef) {
        return new Response(JSON.stringify({ error: "invoiceId, amount, bankRef required" }),
          { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
      }

      const paidDate = paymentDate ?? new Date().toISOString().slice(0, 10);

      const { data: invoice } = await supabase.from("invoices")
        .select(`id, invoice_number, amount, status, due_date, tenant_id, tenants(id, name, email, phone), leases(property, unit, unit_id, property_id)`)
        .eq("id", invoiceId).single();

      if (!invoice) return new Response(JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

      if (invoice.status === "paid") return new Response(JSON.stringify({ error: "Already paid" }),
        { status: 409, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

      await supabase.from("invoices").update({ status: "paid", paid_date: paidDate }).eq("id", invoiceId);

      await supabase.from("payment_transactions").insert({
        invoice_id: invoiceId, tenant_id: invoice.tenant_id, manager_id: managerId ?? null,
        unit_id: (invoice.leases as any)?.unit_id ?? null,
        property_id: (invoice.leases as any)?.property_id ?? null,
        amount: Number(amount), payment_type: "bank_transfer",
        bank_reference: bankRef, status: "completed",
        initiated_at: new Date().toISOString(), completed_at: new Date().toISOString(),
      });

      // Outstanding balance
      const { data: unpaid } = await supabase.from("invoices").select("amount")
        .eq("tenant_id", invoice.tenant_id).in("status", ["pending", "overdue"]);
      const outstandingBalance = (unpaid || []).reduce((s: number, i: any) => s + Number(i.amount), 0);

      const { data: company } = await supabase.from("company_settings").select("company_name,logo_url").maybeSingle();
      const companyName = (company as any)?.company_name ?? "Property Management";
      const tenant = (invoice as any).tenants;
      const lease = (invoice as any).leases;

      // Email receipt
      if (tenant?.email) {
        fetch(`${SUPABASE_URL}/functions/v1/send-receipt-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({
            tenantEmail: tenant.email, tenantName: tenant.name,
            invoiceNumber: invoice.invoice_number, amount: Number(invoice.amount),
            paidDate, dueDate: invoice.due_date,
            property: lease?.property ?? "Property", unit: lease?.unit ?? "Unit",
            companyName, bankRef, paymentMethod: "Bank Transfer", outstandingBalance,
          }),
        }).catch((e) => log("Email error", { error: String(e) }));
      }

      // SMS receipt
      if (tenant?.phone) {
        const balMsg = outstandingBalance > 0 ? ` Balance: ${fmt(outstandingBalance)}.` : " Account fully paid.";
        fetch(`${SUPABASE_URL}/functions/v1/send-sms-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({
            phoneNumber: tenant.phone,
            message: `${companyName}: Bank payment of ${fmt(Number(invoice.amount))} received for Unit ${lease?.unit ?? "N/A"} (${invoice.invoice_number}). Ref: ${bankRef}. Date: ${paidDate}.${balMsg}`,
          }),
        }).catch((e) => log("SMS error", { error: String(e) }));
      }

      log("Bank payment recorded", { invoiceId, bankRef, outstandingBalance });
      return new Response(JSON.stringify({ success: true, invoiceId, bankRef, paidDate, outstandingBalance }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    // Bulk auto-reconcile
    const { managerId } = body;
    const { data: bankTxs } = await supabase.from("bank_transactions")
      .select("*").eq("matched", false).eq("manager_id", managerId);

    let matched = 0, unmatched = 0;
    for (const tx of bankTxs || []) {
      const refPattern = tx.reference ?? tx.description ?? "";
      const { data: invoices } = await supabase.from("invoices")
        .select(`id, invoice_number, amount, tenant_id, leases(unit, property, unit_id, property_id, tenants(name, email, phone))`)
        .in("status", ["pending", "overdue"]).eq("manager_id", managerId).limit(50);

      const matchedInvoice = (invoices || []).find((inv: any) => {
        const unit = inv.leases?.unit ?? "";
        return Number(inv.amount) === Number(tx.amount) &&
          (refPattern.toUpperCase().includes(unit.toUpperCase()) ||
           refPattern.toUpperCase().includes(inv.invoice_number?.toUpperCase() ?? ""));
      }) as any;

      if (matchedInvoice) {
        const paidDate = tx.transaction_date ?? new Date().toISOString().slice(0, 10);
        await supabase.from("invoices").update({ status: "paid", paid_date: paidDate }).eq("id", matchedInvoice.id);
        await supabase.from("payment_transactions").insert({
          invoice_id: matchedInvoice.id, tenant_id: matchedInvoice.tenant_id,
          manager_id: managerId, amount: Number(tx.amount),
          payment_type: "bank_transfer", bank_reference: tx.reference,
          status: "completed", completed_at: new Date().toISOString(),
        });
        await supabase.from("bank_transactions").update({ matched: true, matched_invoice_id: matchedInvoice.id }).eq("id", tx.id);
        fetch(`${SUPABASE_URL}/functions/v1/auto-send-receipt`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ invoiceId: matchedInvoice.id, managerId }),
        }).catch(() => {});
        matched++;
      } else { unmatched++; }
    }

    return new Response(JSON.stringify({ success: true, matched, unmatched }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

  } catch (error: any) {
    log("Error", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
