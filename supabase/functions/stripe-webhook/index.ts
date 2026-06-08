/**
 * stripe-webhook/index.ts
 *
 * Stripe sends the same event multiple times. Without idempotency, a single
 * payment can mark the same invoice paid more than once, double-credit the
 * manager account and break reconciliation reports.
 *
 * This handler:
 *   1. Verifies the Stripe signature (returns 400 on failure).
 *   2. Checks `stripe_processed_events` and short-circuits if the event has
 *      already been handled — Stripe gets 200 OK so it stops retrying.
 *   3. Handles checkout.session.completed, invoice.payment_failed,
 *      charge.refunded.
 *   4. Records the event_id atomically inside the same DB call sequence so a
 *      retry that lands while we are still processing gets a 200 on the next
 *      poll and never executes the update twice.
 *   5. On any unexpected error after signature verification, writes the
 *      event to `webhook_dead_letter` and still returns 200 to Stripe so it
 *      stops retrying. The webhost dashboard surfaces unresolved entries.
 *
 * Why return 200 even on dead-letter? If Stripe keeps retrying, the event
 * eventually expires and the failure becomes invisible. Better to capture
 * it ourselves and reconcile manually than to depend on Stripe's retry log.
 */

import { serve } from "std/http/server.ts";
import Stripe from "stripe/stripe@18.5.0";
import { createClient } from "supabase/supabase-js@2";
import { recordWebhookFailure } from "../_shared/webhookHelpers.ts";
import { requireEnv } from "../_shared/env.ts";

const STRIPE_SECRET_KEY     = requireEnv("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = requireEnv("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL          = requireEnv("SUPABASE_URL");
const SERVICE_KEY           = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const stripe = new Stripe(STRIPE_SECRET_KEY);

const log = (step: string, details?: Record<string, unknown>) =>
  console.log(`[stripe-webhook] ${step}`, details ?? "");

serve(async (req) => {
  // Stripe does not preflight (server-to-server) so no CORS preamble.

  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) {
    log("Missing signature header");
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // constructEventAsync uses Web Crypto under the hood — required on Deno
    // because the sync version depends on Node's native crypto.
    event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    log("Signature verification failed", { error: String(err) });
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── Idempotency ──────────────────────────────────────────────────────
  // Insert FIRST. If the row already exists the unique constraint on
  // event_id throws — that means we already processed this event, so we
  // return 200 OK without re-running any side effects.
  try {
    const { error: dedupErr } = await supabase
      .from("stripe_processed_events")
      .insert({
        event_id:   event.id,
        event_type: event.type,
      });

    if (dedupErr) {
      // Postgres unique-violation = 23505. Any other error is genuinely broken.
      if ((dedupErr as any).code === "23505") {
        log("Duplicate event — already processed", { eventId: event.id });
        return new Response("ok", { status: 200 });
      }
      log("Idempotency insert error", { error: dedupErr.message });
      // Continue anyway so we don't lose the payment. The dead-letter table
      // will catch us if the side-effect itself fails.
    }
  } catch (e) {
    log("Idempotency table missing or unreachable", { error: String(e) });
    // Continue. Better to risk a rare duplicate than to drop a payment.
  }

  // ── Event handling ───────────────────────────────────────────────────
  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoice_id;
        const reference = session.metadata?.reference;

        if (!invoiceId) {
          throw new Error("Missing metadata: invoice_id");
        }

        const isManagerPlatformInvoice = Boolean(session.metadata?.manager_user_id);

        if (isManagerPlatformInvoice) {
          if (!reference) {
            throw new Error(`Missing platform payment reference for invoice_id=${invoiceId}`);
          }

          const { error: payErr } = await supabase
            .from("payments")
            .update({ status: "success" })
            .eq("reference", reference);
          if (payErr) throw new Error(`payments update: ${payErr.message}`);

          const { error: invErr } = await supabase
            .from("manager_invoices")
            .update({
              status:    "paid",
              paid_date: new Date().toISOString(),
            })
            .eq("id", invoiceId);
          if (invErr) throw new Error(`manager_invoices update: ${invErr.message}`);

          await supabase
            .from("stripe_processed_events")
            .update({ invoice_id: invoiceId, reference })
            .eq("event_id", event.id);

          log("manager checkout.session.completed handled", { invoiceId, reference });
          break;
        }

        const tenantId = session.metadata?.tenant_id;
        const managerId = session.metadata?.manager_id;
        const amountTotal = session.amount_total;
        const currency = (session.currency ?? "kes").toLowerCase();

        if (!tenantId || !managerId || !amountTotal) {
          throw new Error(
            `Missing tenant invoice metadata: tenant_id=${tenantId} manager_id=${managerId} amount_total=${amountTotal}`
          );
        }

        const zeroDecimalCurrencies = new Set(["jpy", "krw", "vnd", "clp", "pyg", "gnf", "kmf", "djf", "xaf", "xof", "xpf", "bif", "isk"]);
        const amount = zeroDecimalCurrencies.has(currency) ? amountTotal : amountTotal / 100;
        const paymentReference = reference ?? String(session.payment_intent ?? session.id);

        const processResp = await fetch(`${SUPABASE_URL}/functions/v1/process-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({
            tenantId,
            managerId,
            amount,
            paymentMethod: "stripe_checkout",
            paymentDate: new Date().toISOString().slice(0, 10),
            reference: paymentReference,
            invoiceId,
            notes: `Stripe checkout session ${session.id}`,
          }),
        });

        const processText = await processResp.text();
        let processJson: Record<string, unknown> | null = null;
        try {
          processJson = processText ? JSON.parse(processText) : null;
        } catch {
          processJson = null;
        }

        if (!processResp.ok || processJson?.success === false) {
          throw new Error(`process-payment returned ${processResp.status}: ${processText.slice(0, 300)}`);
        }

        await supabase
          .from("stripe_processed_events")
          .update({ invoice_id: invoiceId, reference: paymentReference })
          .eq("event_id", event.id);

        log("tenant checkout.session.completed handled", { invoiceId, reference: paymentReference });
        break;
      }

      case "invoice.payment_failed":
      case "charge.failed": {
        const obj = event.data.object as any;
        const reference = obj.metadata?.reference ?? obj.payment_intent ?? null;
        if (reference) {
          await supabase
            .from("payments")
            .update({ status: "failed" })
            .eq("reference", reference);
        }
        log("Payment failure recorded", { type: event.type, reference });
        break;
      }

      case "charge.refunded": {
        const charge    = event.data.object as Stripe.Charge;
        const reference = charge.metadata?.reference ?? null;
        if (reference) {
          await supabase
            .from("payments")
            .update({ status: "refunded" })
            .eq("reference", reference);
        }
        log("Refund recorded", { reference });
        break;
      }

      default:
        log("Unhandled event type", { type: event.type });
    }

    return new Response("ok", { status: 200 });

  } catch (err) {
    // Side effect failed AFTER signature verification — money has likely moved.
    // Persist to dead-letter, then 200 OK so Stripe stops retrying. The webhost
    // dashboard surfaces unresolved entries for manual reconciliation.
    log("Handler error — sending to dead-letter", {
      eventId: event.id, error: err instanceof Error ? err.message : String(err),
    });
    await recordWebhookFailure(supabase, "stripe", event.id, event, err);
    return new Response("ok", { status: 200 });
  }
});
