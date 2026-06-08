/**
 * verify-mpesa-payment/index.ts
 *
 * Queries the local payment_transactions table to check the status of an
 * M-Pesa payment. Does NOT call external APIs — the actual M-Pesa callback
 * flow is handled by mpesa-callback → process-payment.
 *
 * This is a read-only status check that managers/tenants can use to verify
 * whether a payment they initiated has been recorded.
 */
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

  let callerUserId: string | null = null;
  let callerRole: string | null = null;

  const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authErr || !caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
  const { data: roleRow } = await supabase.from("user_roles")
    .select("role").eq("user_id", caller.id).maybeSingle();
  callerUserId = caller.id;
  callerRole = (roleRow as any)?.role ?? null;

  if (!["webhost", "manager", "submanager", "tenant"].includes(callerRole)) {
    return new Response(JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }

  const allowed = await checkRateLimit(
    supabase, caller.id, "verify-mpesa-payment", 20,
    { failClosed: true },
  );
  if (!allowed) return rateLimitResponse(req);

  // ── Request parsing ────────────────────────────────────────────────
  let reference: string | undefined;
  let checkoutRequestId: string | undefined;
  try {
    const body = await req.json();
    reference = body.reference;
    checkoutRequestId = body.checkoutRequestId;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }

  if (!reference && !checkoutRequestId) {
    return new Response(JSON.stringify({ error: "reference or checkoutRequestId is required" }),
      { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }

  // ── Query payment_transactions ─────────────────────────────────────
  let query = supabase.from("payment_transactions").select("*");

  if (checkoutRequestId) {
    query = query.eq("checkout_request_id", checkoutRequestId);
  } else if (reference) {
    query = query.eq("bank_reference", reference);
  }

  const { data: transaction, error: txErr } = await query.maybeSingle();

  if (txErr) {
    return new Response(JSON.stringify({ error: "Database error", details: txErr.message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }

  if (!transaction) {
    return new Response(JSON.stringify({
      found: false,
      message: "No payment transaction found with this reference. It may still be processing.",
    }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  // ── Authorization: tenants can only see their own transactions ─────
  if (callerRole === "tenant" && transaction.tenant_id !== callerUserId) {
    return new Response(JSON.stringify({ error: "Forbidden: you can only view your own transactions" }),
      { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }

  // ── Fetch related invoice for context ──────────────────────────────
  let invoiceInfo: { invoice_number: string | null; amount: number | null; status: string | null } | null = null;
  if (transaction.invoice_id) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("invoice_number, amount, status")
      .eq("id", transaction.invoice_id)
      .maybeSingle();
    invoiceInfo = inv;
  }

  return new Response(JSON.stringify({
    found: true,
    transaction: {
      id: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      payment_method: transaction.payment_method,
      phone_number: transaction.phone_number,
      bank_reference: transaction.bank_reference,
      initiated_at: transaction.initiated_at,
      completed_at: transaction.completed_at,
      is_advance: transaction.is_advance,
      is_partial: transaction.is_partial,
    },
    invoice: invoiceInfo,
  }), {
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
});
