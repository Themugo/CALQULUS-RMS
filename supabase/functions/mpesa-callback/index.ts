/**
 * mpesa-callback/index.ts — Full M-Pesa STK Push callback handler
 * Computes outstanding balance after payment and includes in email + SMS
 */
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { timingSafeEqual, recordWebhookFailure } from "../_shared/webhookHelpers.ts";
import { requireEnv } from "../_shared/env.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const log = (step: string, details?: Record<string, unknown>) =>
  console.log(`[mpesa-callback] ${step}`, details ?? "");

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const url = new URL(req.url);
    const urlSecret = url.searchParams.get("secret");
    if (!urlSecret) {
      return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "Unauthorized" }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const callbackData = await req.json();
    const stkCallback = callbackData?.Body?.stkCallback;
    if (!stkCallback) {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    const { data: transaction, error: txErr } = await supabase
      .from("payment_transactions")
      .select(`*, invoices(id, invoice_number, amount, due_date, tenants(id, name, email, phone), leases(property, unit))`)
      .eq("checkout_request_id", CheckoutRequestID)
      .maybeSingle();

    if (txErr || !transaction) {
      log("Transaction not found", { CheckoutRequestID });
      return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "Transaction not found" }),
        { status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    if (!timingSafeEqual(transaction.callback_secret, urlSecret)) {
      return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "Unauthorized" }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    if (transaction.status !== "pending") {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Already processed" }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const age = Date.now() - new Date(transaction.initiated_at).getTime();
    if (age > 10 * 60 * 1000) {
      await supabase.from("payment_transactions").update({ status: "failed", failure_reason: "Expired" }).eq("id", transaction.id);
      return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "Expired" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    if (ResultCode === 0) {
      const getVal = (name: string) =>
        (CallbackMetadata?.Item ?? []).find((m: { Name: string; Value: unknown }) => m.Name === name)?.Value;

      const paidAmount = Number(getVal("Amount") ?? transaction.amount);
      const mpesaReceiptNumber = String(getVal("MpesaReceiptNumber") ?? "");
      const paidDate = new Date().toISOString().split("T")[0];

      await supabase.from("payment_transactions").update({
        status: "completed",
        mpesa_receipt_number: mpesaReceiptNumber,
        completed_at: new Date().toISOString(),
      }).eq("id", transaction.id);

      const inv = transaction.invoices as any;
      // unit_number is not stored on payment_transactions — derive from the invoice's lease
      const unitNumber = inv?.leases?.unit ?? (transaction as any).unit_number ?? "N/A";

      let allocationInvoiceIds: string[] | undefined;
      const txNotes = (transaction as { notes?: string | null }).notes;
      if (txNotes?.startsWith("{")) {
        try {
          const parsed = JSON.parse(txNotes) as { invoice_ids?: string[] };
          if (Array.isArray(parsed.invoice_ids) && parsed.invoice_ids.length > 0) {
            allocationInvoiceIds = parsed.invoice_ids;
          }
        } catch { /* single-invoice fallback */ }
      }

      // Delegate all allocation, balance tracking, and notifications to
      // process-payment. Critical: this MUST be awaited and its response
      // checked. The tenant has already been debited at this point; if
      // process-payment fails silently the payment is lost on our side
      // while Safaricom thinks everything is fine.
      let processOk = false;
      let processErr: unknown = null;
      try {
        const processResp = await fetch(`${SUPABASE_URL}/functions/v1/process-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({
            tenantId:      transaction.tenant_id ?? inv?.tenants?.id,
            managerId:     transaction.manager_id,
            amount:        paidAmount,
            paymentMethod: transaction.payment_type === "till" ? "mpesa_till" : "mpesa_stk",
            paymentDate:   paidDate,
            reference:     mpesaReceiptNumber,
            invoiceId:     allocationInvoiceIds?.length === 1
              ? allocationInvoiceIds[0]
              : allocationInvoiceIds?.length
                ? undefined
                : transaction.invoice_id,
            invoiceIds:    allocationInvoiceIds?.length
              ? allocationInvoiceIds
              : undefined,
            unitId:        transaction.unit_id,
            propertyId:    transaction.property_id,
            unitNumber,
            phone:         transaction.phone_number,
            transactionId: transaction.id,
          }),
        });
        processOk = processResp.ok;
        if (!processOk) {
          processErr = `process-payment returned ${processResp.status}: ${await processResp.text()}`;
        }
      } catch (e) {
        processErr = e;
      }

      if (!processOk) {
        // Money has moved; our reconciliation failed. Persist to dead-letter
        // so a webhost can replay or reconcile by hand. Do NOT change the
        // transaction status back to pending — the M-Pesa receipt is real.
        log("process-payment failed — dead-lettering", { mpesaReceiptNumber, error: String(processErr) });
        await recordWebhookFailure(
          supabase,
          "mpesa",
          mpesaReceiptNumber,
          {
            transactionId: transaction.id,
            invoiceId:     transaction.invoice_id,
            tenantId:      transaction.tenant_id,
            managerId:     transaction.manager_id,
            amount:        paidAmount,
            paidDate,
            mpesaReceiptNumber,
            unitNumber,
          },
          processErr,
        );
      } else {
        log("Delegated to process-payment", { mpesaReceiptNumber });
      }

    } else {
      await supabase.from("payment_transactions").update({
        status: "failed", failure_reason: ResultDesc ?? "Payment cancelled or failed",
      }).eq("id", transaction.id);
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Callback processed" }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown";
    log("Error", { message: errMsg });

    // The outer catch swallows EVERYTHING — including DB connection failures
    // that happen BEFORE we could mark the transaction completed. We MUST
    // dead-letter so the failure is visible, then still acknowledge to
    // Safaricom (ResultCode 0) so they stop retrying. A retry would not help:
    // if the DB is down, retrying will not bring it back up. The dead-letter
    // gives a human a chance to fix it.
    try {
      await recordWebhookFailure(
        supabase,
        "mpesa",
        null,
        { url: req.url, error: errMsg },
        error,
      );
    } catch { /* never throw from a catch */ }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Callback received" }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
