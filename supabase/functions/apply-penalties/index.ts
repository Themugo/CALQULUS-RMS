import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── Authentication ─────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceCall = authHeader === `Bearer ${SERVICE_KEY}`;

  let callerUserId: string | null = null;

  if (!isServiceCall) {
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
    const { data: roleRow } = await supabase.from("user_roles")
      .select("role").eq("user_id", caller.id).maybeSingle();
    if (!["webhost", "manager"].includes((roleRow as any)?.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: only webhosts and managers may apply penalties" }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
    callerUserId = caller.id;

    const allowed = await checkRateLimit(
      supabase, caller.id, "apply-penalties", 3,
      { failClosed: true },
    );
    if (!allowed) return rateLimitResponse(req);
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    const { data: overdueInvoices, error } = await supabase
      .from("invoices")
      .select("id, amount, tenant_id, invoice_number, manager_id, property_id, due_date")
      .eq("status", "overdue")
      .lt("due_date", today);

    if (error) throw error;

    let penaltiesApplied = 0;

    for (const invoice of overdueInvoices || []) {
      const { data: propConfig } = await supabase
        .from("property_billing_config")
        .select("late_penalty_enabled, late_penalty_type, late_penalty_amount, late_penalty_pct, grace_period_days")
        .eq("property_id", invoice.property_id)
        .maybeSingle();

      const enabled     = propConfig?.late_penalty_enabled ?? true;
      const penaltyType = propConfig?.late_penalty_type ?? "percentage";
      const penaltyPct  = Number(propConfig?.late_penalty_pct ?? 5);
      const penaltyAmt  = Number(propConfig?.late_penalty_amount ?? 0);
      const graceDays   = Number(propConfig?.grace_period_days ?? 0);
      
      if (!enabled) continue;

      const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86_400_000);
      if (daysOverdue < graceDays) continue;

      const penaltyAmount = penaltyType === "percentage"
        ? (Number(invoice.amount) * penaltyPct) / 100
        : penaltyAmt;

      if (penaltyAmount > 0) {
        const penaltyInvNum = `PEN-${invoice.invoice_number}`;
        const existing = await supabase.from("invoices")
          .select("id").eq("invoice_number", penaltyInvNum).maybeSingle();
        if (existing.data) continue;

        await supabase.from("invoices").insert({
          manager_id:    invoice.manager_id,
          tenant_id:     invoice.tenant_id,
          property_id:   invoice.property_id ?? null,
          invoice_number: penaltyInvNum,
          amount:        penaltyAmount,
          balance_due:   penaltyAmount,
          description:   `Late payment penalty — ${invoice.invoice_number} (${daysOverdue} days overdue)`,
          due_date:      today,
          status:        "pending",
          invoice_type:  "penalty",
        });
        penaltiesApplied++;
      }
    }

    return new Response(JSON.stringify({ penaltiesApplied, overdueCount: (overdueInvoices || []).length }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
