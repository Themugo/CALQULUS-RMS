import { requireEnv, getEnv } from "../_shared/env.ts";
/**
 * apply-credit/index.ts
 *
 * Applies a tenant's credit balance (from tenant_credit_ledger)
 * to their oldest unpaid invoices, oldest-first (FIFO).
 *
 * Called by:
 *  - process-payment (after overpayment creates credit)
 *  - Manual manager action: "Apply credit to invoices"
 *
 * Payload: { tenant_id: string, manager_id?: string }
 * Returns: { applied: number, invoicesCleared: number, remainingCredit: number }
 */
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";

const log = (step: string, details?: unknown) =>
  console.log(`[apply-credit] ${step}`, details ?? "");

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);


  try {
    const { tenant_id, manager_id } = await req.json();

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id is required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    // ── Caller authentication ─────────────────────────────────────────
    // apply-credit may be called by:
    //   (a) process-payment (server → server via service-role key)
    //   (b) Manager UI (user JWT)
    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceCall = authHeader === `Bearer ${getEnv("SUPABASE_SERVICE_ROLE_KEY")}`;

    if (!isServiceCall) {
      const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (authErr || !caller) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const { data: roleRow } = await supabase.from("user_roles")
        .select("role").eq("user_id", caller.id).maybeSingle();
      if (!["manager", "submanager"].includes((roleRow as any)?.role)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }

    // 1. Get current credit balance
    const { data: ledger, error: ledgerErr } = await supabase
      .from("tenant_credit_ledger")
      .select("id, credit_balance, tenant_id")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (ledgerErr) throw ledgerErr;

    const creditBalance = Number(ledger?.credit_balance ?? 0);
    log("Credit balance", { tenant_id, creditBalance });

    if (creditBalance <= 0) {
      return new Response(JSON.stringify({
        applied: 0, invoicesCleared: 0, remainingCredit: 0,
        message: "No credit balance to apply",
      }), { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    // 2. Get oldest unpaid invoices (pending + overdue), FIFO
    const { data: invoices, error: invErr } = await supabase
      .from("invoices")
      .select("id, amount, paid_amount, balance_due, status, invoice_number, due_date")
      .eq("tenant_id", tenant_id)
      .in("status", ["pending", "overdue", "partially_paid"])
      .order("due_date", { ascending: true });

    if (invErr) throw invErr;
    if (!invoices || invoices.length === 0) {
      return new Response(JSON.stringify({
        applied: 0, invoicesCleared: 0, remainingCredit: creditBalance,
        message: "No unpaid invoices to apply credit to",
      }), { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    log("Invoices to process", { count: invoices.length });

    let remainingCredit = creditBalance;
    let totalApplied = 0;
    let invoicesCleared = 0;

    for (const invoice of invoices) {
      if (remainingCredit <= 0) break;

      const balanceDue = Number(invoice.balance_due ?? invoice.amount);
      if (balanceDue <= 0) continue;

      const toApply = Math.min(remainingCredit, balanceDue);
      const newPaidAmount = Number(invoice.paid_amount ?? 0) + toApply;
      const newBalance = balanceDue - toApply;
      const newStatus = newBalance <= 0 ? "paid" : "partially_paid";

      const { error: updateErr } = await supabase
        .from("invoices")
        .update({
          paid_amount: newPaidAmount,
          balance_due: newBalance,
          status: newStatus,
          paid_date: newStatus === "paid" ? new Date().toISOString().slice(0, 10) : null,
        })
        .eq("id", invoice.id);

      if (updateErr) {
        log("Failed to update invoice", { id: invoice.id, error: updateErr.message });
        continue;
      }

      // Record the payment allocation
      await supabase.from("payment_allocations").insert({
        tenant_id,
        invoice_id: invoice.id,
        amount_applied: toApply,
        allocation_type: "credit",
        notes: `Credit applied to invoice ${invoice.invoice_number}`,
        created_at: new Date().toISOString(),
      }).catch(() => {}); // non-critical

      remainingCredit -= toApply;
      totalApplied += toApply;
      if (newStatus === "paid") invoicesCleared++;

      log("Applied to invoice", {
        invoice_number: invoice.invoice_number,
        applied: toApply,
        newBalance,
        newStatus,
      });
    }

    // 3. Update credit ledger
    if (totalApplied > 0) {
      const newCreditBalance = Math.max(0, creditBalance - totalApplied);

      if (ledger?.id) {
        await supabase
          .from("tenant_credit_ledger")
          .update({ credit_balance: newCreditBalance, updated_at: new Date().toISOString() })
          .eq("id", ledger.id);
      } else {
        await supabase.from("tenant_credit_ledger").insert({
          tenant_id,
          credit_balance: newCreditBalance,
          manager_id: manager_id ?? null,
        });
      }

      // Log the activity
      await supabase.from("activity_logs").insert({
        actor_id: manager_id ?? null,
        actor_role: manager_id ? "manager" : "system",
        action: "apply_credit",
        entity_type: "tenant",
        entity_id: tenant_id,
        entity_label: `Applied KES ${totalApplied} credit to ${invoicesCleared} invoice(s)`,
        manager_id: manager_id ?? null,
        metadata: { totalApplied, invoicesCleared, remainingCredit: newCreditBalance },
      }).catch(() => {});
    }

    log("Done", { totalApplied, invoicesCleared, remainingCredit });

    return new Response(JSON.stringify({
      applied: totalApplied,
      invoicesCleared,
      remainingCredit,
      message: totalApplied > 0
        ? `Applied KES ${totalApplied.toLocaleString()} credit to ${invoicesCleared} invoice(s)`
        : "No credit applied",
    }), { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

  } catch (err) {
    log("Error", String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
