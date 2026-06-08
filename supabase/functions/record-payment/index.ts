/**
 * record-payment/index.ts
 *
 * Manager/submanager manually records a payment for any channel.
 * Supports: M-Pesa code entry, bank ref entry, receipt confirmation.
 *
 * This is the "admin entry point" — when the manager knows money
 * arrived but it wasn't auto-captured by STK or bank webhook.
 */

import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Authenticate the manager/submanager
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) return new Response(JSON.stringify({ error: "Authentication failed" }),
      { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

    // Check role — must be manager or submanager
    const { data: role } = await supabase.from("user_roles")
      .select("role").eq("user_id", user.id).maybeSingle();
    if (!["manager", "submanager"].includes((role as any)?.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    // Rate-limit manual payment recording. Generous limit for legitimate
    // month-end collection sprints; tight enough to catch a compromised
    // submanager from rapidly faking many payments.
    const allowed = await checkRateLimit(
      supabase, user.id, "record-payment", 100,
      { failClosed: true },
    );
    if (!allowed) return rateLimitResponse(req);

    const body = await req.json();
    const {
      tenantId,
      invoiceId,
      amount,
      paymentMethod = "mpesa_ussd",
      reference,
      paymentDate,
      notes,
      // Installment plan fields
      isInstallment = false,
      instalmentCount,
    } = body;

    if (!tenantId || !amount || !reference) {
      return new Response(JSON.stringify({ error: "tenantId, amount, reference required" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    // Get the manager_id — for submanager, get their manager
    let effectiveManagerId = user.id;
    if ((role as any)?.role === "submanager") {
      const { data: rel } = await supabase.from("manager_submanagers")
        .select("manager_id").eq("submanager_user_id", user.id).maybeSingle();
      effectiveManagerId = (rel as any)?.manager_id ?? user.id;
    }

    // If creating an installment plan, set that up first
    if (isInstallment && instalmentCount && instalmentCount > 1) {
      const { data: unpaidInvoices } = await supabase.from("invoices")
        .select("id, amount, balance_due, original_amount")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "overdue"])
        .order("due_date", { ascending: true });

      const totalOwed = (unpaidInvoices ?? []).reduce(
        (s, i: any) => s + Number(i.balance_due ?? i.amount), 0
      );
      const instalmentAmount = Math.ceil(totalOwed / instalmentCount);

      await supabase.from("arrears_schedule").insert({
        tenant_id:         tenantId,
        manager_id:        effectiveManagerId,
        invoice_id:        invoiceId ?? null,
        total_owed:        totalOwed,
        instalment_count:  instalmentCount,
        instalment_amount: instalmentAmount,
        status:            "active",
        start_date:        paymentDate ?? new Date().toISOString().slice(0, 10),
        next_due_date:     new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        notes: notes ?? `Installment plan: ${instalmentCount} payments of ${instalmentAmount}`,
      });

      // Mark the invoice(s) as installment_plan = true
      if (invoiceId) {
        await supabase.from("invoices").update({ installment_plan: true }).eq("id", invoiceId);
      }
    }

    // Delegate to process-payment for the actual payment recording.
    // We forward whatever status process-payment returned so the caller
    // sees a proper 4xx/5xx for a real failure rather than a 200 with an
    // error body — the previous code unwrapped JSON unconditionally.
    let processRes: Response;
    try {
      processRes = await fetch(`${SUPABASE_URL}/functions/v1/process-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({
          tenantId,
          managerId:     effectiveManagerId,
          amount:        Number(amount),
          paymentMethod,
          paymentDate:   paymentDate ?? new Date().toISOString().slice(0, 10),
          reference,
          invoiceId:     invoiceId ?? undefined,
          recordedBy:    user.id,
          notes,
        }),
      });
    } catch (fetchErr: any) {
      // Network failure calling process-payment — surface as 502 Bad Gateway
      // so the manager UI can show a clear retry prompt.
      console.error("[RECORD-PAYMENT] process-payment fetch error:", fetchErr?.message ?? fetchErr);
      return new Response(JSON.stringify({ error: "Payment service unreachable. Please retry." }),
        { status: 502, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const result = await processRes.json().catch(() => ({ error: "Invalid response from payment service" }));
    return new Response(JSON.stringify(result),
      { status: processRes.status, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("[RECORD-PAYMENT] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
