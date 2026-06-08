/**
 * bank-webhook/index.ts
 *
 * Receives real-time payment notifications from bank APIs.
 * Supports: Equity Bank, KCB, NCBA, Co-op, ABSA, Stanbic.
 *
 * Banks push a JSON payload when rent lands in the account.
 * This function:
 *   1. Verifies the webhook signature / secret
 *   2. Deduplicates (external_id uniqueness)
 *   3. Stores raw transaction in bank_transactions
 *   4. Attempts auto-reconciliation against pending invoices
 *   5. If matched → calls process-payment → receipt + SMS fired instantly
 *   6. If unmatched → stores as unmatched for manual review
 */

import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { timingSafeEqual, getWebhookSecret, recordWebhookFailure } from "../_shared/webhookHelpers.ts";
import { requireEnv } from "../_shared/env.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const log = (s: string, d?: unknown) => console.log(`[BANK-WEBHOOK] ${s}`, d ? JSON.stringify(d) : "");

// Normalize different bank payload formats into a common shape
function normalizeBankPayload(bankName: string, raw: Record<string, unknown>) {
  switch (bankName.toLowerCase()) {
    case "equity":
      return {
        externalId:   String(raw.TransactionID ?? raw.transaction_id ?? ""),
        reference:    String(raw.PayBillReference ?? raw.AccountNumber ?? raw.Narration ?? ""),
        description:  String(raw.Narration ?? raw.Description ?? ""),
        amount:       Number(raw.Amount ?? raw.TransactionAmount ?? 0),
        date:         String(raw.TransDate ?? raw.ValueDate ?? new Date().toISOString().slice(0, 10)),
        payerName:    String(raw.SenderName ?? raw.InitiatorName ?? ""),
        payerPhone:   String(raw.SenderPhone ?? raw.PhoneNumber ?? ""),
        accountNumber:String(raw.CreditAccount ?? raw.AccountNo ?? ""),
      };
    case "kcb":
      return {
        externalId:   String(raw.transactionRef ?? raw.txnRef ?? ""),
        reference:    String(raw.billRefNumber ?? raw.accountRef ?? raw.narration ?? ""),
        description:  String(raw.narration ?? ""),
        amount:       Number(raw.amount ?? raw.transactionAmount ?? 0),
        date:         String(raw.transactionDate ?? new Date().toISOString().slice(0, 10)),
        payerName:    String(raw.customerName ?? ""),
        payerPhone:   String(raw.msisdn ?? raw.phoneNumber ?? ""),
        accountNumber:String(raw.accountNumber ?? ""),
      };
    case "ncba":
      return {
        externalId:   String(raw.transaction_id ?? raw.id ?? ""),
        reference:    String(raw.reference ?? raw.narration ?? ""),
        description:  String(raw.narration ?? raw.description ?? ""),
        amount:       Number(raw.credit_amount ?? raw.amount ?? 0),
        date:         String(raw.value_date ?? raw.transaction_date ?? new Date().toISOString().slice(0, 10)),
        payerName:    String(raw.payer_name ?? ""),
        payerPhone:   String(raw.payer_phone ?? ""),
        accountNumber:String(raw.account_number ?? ""),
      };
    default:
      // Generic fallback — tries common field names
      return {
        externalId:   String(raw.id ?? raw.transaction_id ?? raw.externalId ?? ""),
        reference:    String(raw.reference ?? raw.narration ?? raw.description ?? ""),
        description:  String(raw.description ?? raw.narration ?? ""),
        amount:       Number(raw.amount ?? raw.credit_amount ?? 0),
        date:         String(raw.date ?? raw.transaction_date ?? new Date().toISOString().slice(0, 10)),
        payerName:    String(raw.payer_name ?? raw.sender_name ?? ""),
        payerPhone:   String(raw.phone ?? raw.msisdn ?? ""),
        accountNumber:String(raw.account ?? raw.account_number ?? ""),
      };
  }
}

// Match bank transaction to an invoice using configured strategy
async function matchInvoice(
  supabase: ReturnType<typeof createClient>,
  managerId: string,
  tx: { amount: number; reference: string; description: string; date: string },
  matchBy: string,
): Promise<{ invoice: any; tenant: any; confidence: number; method: string } | null> {

  const { data: invoices } = await supabase.from("invoices")
    .select(`id, invoice_number, amount, balance_due, original_amount, tenant_id,
             tenants(id, name, email, phone, unit, property, property_id, unit_id)`)
    .in("status", ["pending", "overdue"])
    .eq("manager_id", managerId)
    .order("due_date", { ascending: true })
    .limit(200);

  if (!invoices || invoices.length === 0) return null;

  // Strategy 1: exact reference match (invoice number in narration)
  for (const inv of invoices as any[]) {
    const ref = (tx.reference + " " + tx.description).toUpperCase();
    if (inv.invoice_number && ref.includes(inv.invoice_number.toUpperCase())) {
      return { invoice: inv, tenant: inv.tenants, confidence: 95, method: "auto_reference" };
    }
  }

  // Strategy 2: unit number in reference + amount within 5%
  for (const inv of invoices as any[]) {
    const unit = inv.tenants?.unit ?? "";
    if (!unit) continue;
    const ref = (tx.reference + " " + tx.description).toUpperCase();
    const owed = Number(inv.balance_due ?? inv.amount);
    const amtMatch = Math.abs(tx.amount - owed) / owed < 0.05;
    if (ref.includes(unit.toUpperCase()) && amtMatch) {
      return { invoice: inv, tenant: inv.tenants, confidence: 85, method: "auto_amount_unit" };
    }
  }

  // Strategy 3: exact amount match (unique amount among pending)
  if (matchBy !== "reference") {
    const exactMatches = (invoices as any[]).filter(inv => {
      const owed = Number(inv.balance_due ?? inv.amount);
      return Math.abs(tx.amount - owed) < 1; // within KES 1
    });
    if (exactMatches.length === 1) {
      return { invoice: exactMatches[0], tenant: exactMatches[0].tenants, confidence: 70, method: "auto_amount_unit" };
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Identify which manager/integration this webhook is for.
    // The manager_id and bank name are not secret and are passed as query
    // params so the URL can be configured once on the bank's portal.
    //
    // The webhook secret SHOULD be sent as an `x-webhook-secret` header so
    // it does not end up in URL access logs, proxies, CDN history, or the
    // Supabase function request log. For legacy bank portals that cannot
    // send headers, fall back to `?secret=` — but flag this in the log so
    // operators know to migrate.
    const url = new URL(req.url);
    const managerId = url.searchParams.get("manager_id");
    const bankName  = url.searchParams.get("bank") ?? "generic";
    const secret    = getWebhookSecret(req, "x-webhook-secret", "secret");
    const secretInUrl = !req.headers.get("x-webhook-secret") && !!url.searchParams.get("secret");

    if (!managerId) {
      return new Response(JSON.stringify({ error: "manager_id required" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    if (secretInUrl) {
      log("WARNING: webhook secret received via URL query param — migrate to x-webhook-secret header", { bank: bankName, managerId });
    }

    // Verify webhook secret against stored bank integration settings
    const { data: bankSettings } = await supabase.from("bank_integration_settings")
      .select("id, webhook_secret, auto_reconcile, match_by")
      .eq("manager_id", managerId).eq("bank_name", bankName).eq("is_active", true)
      .maybeSingle();

    if (!bankSettings) {
      return new Response(JSON.stringify({ error: "Bank integration not configured" }),
        { status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    // Constant-time compare protects against timing side-channel attacks
    // where an attacker probes the secret byte-by-byte by measuring response
    // latency. If no secret is configured on the integration we treat that
    // as a misconfiguration and reject — never silently allow.
    const expected = (bankSettings as any).webhook_secret as string | null;
    if (!expected) {
      log("Integration has no webhook_secret configured — rejecting", { bank: bankName, managerId });
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
    if (!timingSafeEqual(secret, expected)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const rawPayload = await req.json();
    const tx = normalizeBankPayload(bankName, rawPayload);

    log("Webhook received", { bank: bankName, managerId, amount: tx.amount, ref: tx.reference });

    if (!tx.amount || tx.amount <= 0) {
      return new Response(JSON.stringify({ received: true, skipped: "zero_amount" }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    // Deduplicate by externalId.
    // We use a two-phase approach:
    //   1. Fast-path SELECT (covers >99% of cases — no race condition)
    //   2. Unique index on (manager_id, external_id) catches the rare
    //      concurrent-insert race condition as a 23505 error below.
    if (tx.externalId) {
      const { data: existing } = await supabase.from("bank_transactions")
        .select("id").eq("manager_id", managerId).eq("external_id", tx.externalId).maybeSingle();
      if (existing) {
        log("Duplicate webhook, skipping", { externalId: tx.externalId });
        return new Response(JSON.stringify({ received: true, skipped: "duplicate" }),
          { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
      }
    }

    // Store raw bank transaction
    const { data: bankTx, error: insertErr } = await supabase.from("bank_transactions").insert({
      manager_id:           managerId,
      bank_integration_id:  (bankSettings as any).id,
      external_id:          tx.externalId || null,
      reference:            tx.reference,
      description:          tx.description,
      amount:               tx.amount,
      transaction_date:     tx.date,
      bank_name:            bankName,
      account_number:       tx.accountNumber || null,
      payer_name:           tx.payerName || null,
      payer_phone:          tx.payerPhone || null,
      matched:              false,
      source:               "webhook",
      raw_payload:          rawPayload,
    }).select().single();

    if (insertErr) throw new Error(`Bank TX insert: ${insertErr.message}`);
    log("Bank transaction stored", { id: (bankTx as any).id });

    // Attempt auto-reconciliation
    if ((bankSettings as any).auto_reconcile) {
      const match = await matchInvoice(
        supabase, managerId, tx, (bankSettings as any).match_by ?? "amount_and_unit"
      );

      if (match) {
        log("Invoice matched", {
          invoiceId: match.invoice.id,
          confidence: match.confidence,
          method: match.method,
        });

        // Update bank_transaction as matched
        await supabase.from("bank_transactions").update({
          matched:           true,
          matched_invoice_id: match.invoice.id,
          matched_tenant_id: match.tenant?.id ?? null,
          match_confidence:  match.confidence,
          match_method:      match.method,
        }).eq("id", (bankTx as any).id);

        // Call central process-payment — fires receipts, SMS, etc.
        await fetch(`${SUPABASE_URL}/functions/v1/process-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({
            tenantId:      match.tenant?.id,
            managerId,
            amount:        tx.amount,
            paymentMethod: "bank_transfer",
            paymentDate:   tx.date,
            reference:     tx.reference || tx.externalId,
            invoiceId:     match.invoice.id,
            unitId:        match.tenant?.unit_id ?? null,
            propertyId:    match.tenant?.property_id ?? null,
            unitNumber:    match.tenant?.unit ?? null,
            phone:         match.tenant?.phone ?? null,
            notes:         `Auto-matched from ${bankName} webhook. Payer: ${tx.payerName}`,
          }),
        });

        return new Response(JSON.stringify({ received: true, matched: true, invoiceId: match.invoice.id }),
          { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
      } else {
        log("No invoice match found — stored as unmatched", { amount: tx.amount });
      }
    }

    return new Response(JSON.stringify({ received: true, matched: false }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

  } catch (error: any) {
    log("Error", { message: error.message });
    // Try to capture the raw payload + manager context for manual replay.
    // We may have already consumed req.json() above, but we still have
    // enough context (manager_id from URL) to identify the integration.
    try {
      const url = new URL(req.url);
      const managerId = url.searchParams.get("manager_id");
      await recordWebhookFailure(
        supabase,
        "bank",
        managerId,
        { url: req.url, error: error.message },
        error,
      );
    } catch { /* never throw out of the catch */ }
    // Return 500 so the bank retries — bank webhooks (unlike Stripe) are
    // typically delivered at-least-once and a retry is the right behaviour
    // for transient DB failures. The dead-letter row guarantees we still
    // see the failure if retries also fail.
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
