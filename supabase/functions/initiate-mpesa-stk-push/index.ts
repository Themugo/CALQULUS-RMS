/**
 * initiate-mpesa-stk-push/index.ts
 *
 * FIX SUMMARY:
 * 1. Resolves manager M-Pesa settings via unit → property → manager chain
 *    instead of trusting a client-supplied managerId alone.
 * 2. Uses unit_number as AccountReference (when use_unit_as_account_ref=true)
 *    so landlords can reconcile payments in their M-Pesa statement by unit.
 * 3. Stores unit_id, property_id, unit_number in payment_transactions for
 *    downstream receipts, SMS, and WhatsApp.
 * 4. Validates that the authenticated user is the tenant on the invoice
 *    (prevents one tenant initiating payment on another's invoice).
 */

import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

// Module-level env reads — fail fast at cold start, not mid-request.
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[initiate-mpesa-stk-push] ${step}`, details ?? "");
};

interface STKPushRequest {
  /** Single-invoice payment (legacy) */
  invoiceId?: string;
  /** Combined payment across selected bills */
  invoiceIds?: string[];
  amount: number;
  phoneNumber: string;
  paymentType: "paybill" | "till";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);


  try {
    logStep("Starting M-Pesa STK Push");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Authentication failed");

    logStep("User authenticated", { userId: user.id });

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("role", "tenant")
      .maybeSingle();
    if (roleError || !roleRow?.tenant_id) {
      throw new Error("Tenant account is not linked to a rental profile");
    }
    const callerTenantId = roleRow.tenant_id;

    const { invoiceId, invoiceIds, amount, phoneNumber, paymentType }: STKPushRequest =
      await req.json();

    const targetIds: string[] = (invoiceIds?.length
      ? invoiceIds
      : invoiceId
        ? [invoiceId]
        : []
    ).filter(Boolean);

    if (!targetIds.length || !amount || !phoneNumber || !paymentType) {
      throw new Error(
        "Missing required fields: invoiceId or invoiceIds, amount, phoneNumber, paymentType"
      );
    }

    if (targetIds.length > 20) {
      throw new Error("Too many invoices in one payment (max 20)");
    }

    const invoiceSelect = `
        id,
        tenant_id,
        lease_id,
        unit_id,
        property_id,
        amount,
        balance_due,
        paid_amount,
        invoice_number,
        status,
        leases (
          unit_id,
          property_id,
          units ( id, unit_number, property_id ),
          properties!leases_property_id_fkey ( id, manager_id, name )
        )
      `;

    const { data: invoiceRows, error: invoicesError } = await supabase
      .from("invoices")
      .select(invoiceSelect)
      .in("id", targetIds)
      .in("status", ["pending", "overdue"]);

    if (invoicesError || !invoiceRows?.length) {
      throw new Error("One or more invoices not found or already paid");
    }

    if (invoiceRows.length !== targetIds.length) {
      throw new Error("Some selected bills are no longer payable");
    }

    for (const row of invoiceRows) {
      if (row.tenant_id !== callerTenantId) {
        throw new Error("Forbidden: only the tenant can initiate payment for their own bills");
      }
    }

    const expectedTotal = invoiceRows.reduce((sum, inv) => {
      const owed = Number(
        inv.balance_due ??
          (Number(inv.amount) - Number(inv.paid_amount ?? 0))
      );
      return sum + Math.max(0, owed);
    }, 0);

    if (Math.abs(Math.round(amount) - Math.round(expectedTotal)) > 1) {
      throw new Error(
        `Amount mismatch: expected KES ${Math.round(expectedTotal)}, received KES ${Math.round(amount)}`
      );
    }

    // Primary invoice drives unit → manager chain (unit-first guarantee)
    const invoice = invoiceRows[0];
    const primaryInvoiceId = invoice.id;
    const allocationNote = targetIds.length > 1
      ? JSON.stringify({ invoice_ids: targetIds })
      : null;

    // ── Rate limit: max 5 STK push attempts per tenant per hour ──────
    const { data: rateLimitOk } = await supabase.rpc("check_rate_limit", {
      p_user_id:      user.id,
      p_function:     "initiate-mpesa-stk-push",
      p_max_per_hour: 5,
    });
    if (!rateLimitOk) {
      return new Response(JSON.stringify({ error: "Too many payment requests. Please wait before trying again." }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Resolve unit & manager from lease chain if invoice columns not yet set
    const lease = invoice.leases as {
      unit_id: string | null;
      property_id: string | null;
      units: { id: string; unit_number: string; property_id: string } | null;
      properties: { id: string; manager_id: string | null; name: string } | null;
    } | null;

    const unitId =
      invoice.unit_id ?? lease?.unit_id ?? lease?.units?.id ?? null;
    const propertyId =
      invoice.property_id ??
      lease?.property_id ??
      lease?.units?.property_id ??
      null;
    const managerId = lease?.properties?.manager_id ?? null;
    const unitNumber = lease?.units?.unit_number ?? "N/A";
    const propertyName = lease?.properties?.name ?? "Property";

    if (!managerId) {
      throw new Error(
        "Payment configuration error: this unit does not have an assigned manager. " +
          "Please contact the property manager."
      );
    }

    logStep("Unit chain resolved", {
      unitId,
      propertyId,
      managerId,
      unitNumber,
      propertyName,
    });

    // ── Resolve payment destination (who receives the money) ───────────────
    //    property_landlords.payment_destination controls routing:
    //      'manager'  (default) → payment goes to manager_mpesa_settings
    //      'landlord'           → payment goes to landlord_mpesa_settings
    let paymentReceiverType: "manager" | "landlord" = "manager";
    let landlordId: string | null = null;

    if (propertyId) {
      const { data: pl } = await supabase
        .from("property_landlords")
        .select("landlord_user_id, payment_destination")
        .eq("property_id", propertyId)
        .maybeSingle();

      if (pl?.payment_destination === "landlord" && pl?.landlord_user_id) {
        paymentReceiverType = "landlord";
        landlordId = pl.landlord_user_id;
      }
    }

    logStep("Payment destination resolved", { paymentReceiverType, landlordId });

    // ── Load the correct M-Pesa settings based on payment destination ────
    let mpesaSettings: Record<string, unknown> | null = null;

    if (paymentReceiverType === "landlord" && landlordId) {
      // Try property-scoped landlord settings first, fall back to global
      const { data: propSettings } = await supabase
        .from("landlord_mpesa_settings")
        .select("*")
        .eq("landlord_user_id", landlordId)
        .eq("property_id", propertyId)
        .maybeSingle();

      const { data: globalSettings } = propSettings ? { data: propSettings } : await supabase
        .from("landlord_mpesa_settings")
        .select("*")
        .eq("landlord_user_id", landlordId)
        .is("property_id", null)
        .maybeSingle();

      mpesaSettings = (propSettings ?? globalSettings) as Record<string, unknown> | null;

      if (!mpesaSettings) {
        throw new Error(
          "The landlord hasn't configured M-Pesa payments yet. " +
            "Please contact your property manager."
        );
      }
    } else {
      // Default: use manager's M-Pesa settings (try property-scoped first)
      const { data: propSettings } = await supabase
        .from("manager_mpesa_settings")
        .select("*")
        .eq("manager_user_id", managerId)
        .eq("property_id", propertyId)
        .maybeSingle();

      const { data: globalSettings } = propSettings ? { data: propSettings } : await supabase
        .from("manager_mpesa_settings")
        .select("*")
        .eq("manager_user_id", managerId)
        .is("property_id", null)
        .maybeSingle();

      mpesaSettings = (propSettings ?? globalSettings) as Record<string, unknown> | null;

      if (!mpesaSettings) {
        throw new Error(
          "The property manager hasn't configured M-Pesa payments yet. " +
            "Please contact your property manager."
        );
      }
    }

    if (paymentType === "paybill" && !mpesaSettings.paybill_enabled) {
      throw new Error("Paybill is not enabled for this property manager");
    }
    if (paymentType === "till" && !mpesaSettings.till_enabled) {
      throw new Error("Till/Buy Goods is not enabled for this property manager");
    }
    if (!mpesaSettings.consumer_key || !mpesaSettings.consumer_secret) {
      throw new Error("M-Pesa API credentials not configured");
    }

    const shortcode =
      paymentType === "paybill"
        ? mpesaSettings.paybill_shortcode
        : mpesaSettings.till_shortcode;
    const passkey =
      paymentType === "paybill"
        ? mpesaSettings.paybill_passkey
        : mpesaSettings.till_passkey;

    if (!shortcode || !passkey) {
      throw new Error(
        `${paymentType === "paybill" ? "Paybill" : "Till"} shortcode or passkey not configured`
      );
    }

    // ── AccountReference: use unit_number for easy landlord reconciliation ─
    //    e.g. tenant in unit "A3" → reference "A3" appears in M-Pesa statement
    const useUnitRef = mpesaSettings.use_unit_as_account_ref !== false; // default true
    const accountReference = useUnitRef
      ? unitNumber.slice(0, 12) // M-Pesa max 12 chars
      : mpesaSettings.paybill_account_reference?.slice(0, 12) ??
        unitNumber.slice(0, 12);

    logStep("AccountReference set", { accountReference, unitNumber });

    // ── Phone formatting ──────────────────────────────────────────────────
    let formattedPhone = phoneNumber
      .replace(/\s+/g, "")
      .replace(/^(\+?254|0)/, "254");
    if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    // ── M-Pesa OAuth token ────────────────────────────────────────────────
    const apiBaseUrl = mpesaSettings.is_live
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    const credentials = btoa(
      `${mpesaSettings.consumer_key}:${mpesaSettings.consumer_secret}`
    );
    const tokenResponse = await fetch(
      `${apiBaseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: "GET",
        headers: { Authorization: `Basic ${credentials}` },
      }
    );

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      logStep("OAuth token error", { status: tokenResponse.status, err });
      throw new Error("Failed to get M-Pesa access token");
    }

    const { access_token: accessToken } = await tokenResponse.json();
    logStep("OAuth token obtained");

    // ── STK Push ──────────────────────────────────────────────────────────
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, "")
      .slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);
    const callbackSecret = crypto.randomUUID();

    const stkPushPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType:
        paymentType === "paybill"
          ? "CustomerPayBillOnline"
          : "CustomerBuyGoodsOnline",
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: `${SUPABASE_URL}/functions/v1/mpesa-callback?secret=${callbackSecret}`,
      AccountReference: accountReference,
      TransactionDesc: targetIds.length > 1
        ? `Bills x${targetIds.length} - ${unitNumber}`
        : `Rent - ${unitNumber} - ${invoice.invoice_number ?? primaryInvoiceId.slice(0, 8)}`,
    };

    const stkResponse = await fetch(
      `${apiBaseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPushPayload),
      }
    );

    const stkResult = await stkResponse.json();
    logStep("STK Push response", stkResult);

    if (stkResult.ResponseCode === "0") {
      const { CheckoutRequestID, MerchantRequestID } = stkResult;

      // ── Save transaction with full unit context ────────────────────────
      const { data: transaction, error: txError } = await supabase
        .from("payment_transactions")
        .insert({
          invoice_id: primaryInvoiceId,
          tenant_id: invoice.tenant_id ?? null,
          manager_id: managerId,
          landlord_id: landlordId,
          payment_receiver_type: paymentReceiverType,
          unit_id: unitId,
          property_id: propertyId,
          unit_number: unitNumber,
          amount,
          phone_number: formattedPhone,
          payment_type: paymentType,
          checkout_request_id: CheckoutRequestID,
          merchant_request_id: MerchantRequestID,
          status: "pending",
          initiated_at: new Date().toISOString(),
          callback_secret: callbackSecret,
          notes: allocationNote,
        })
        .select()
        .single();

      if (txError) {
        logStep("Transaction record error (non-fatal)", {
          error: txError.message,
        });
      }

      logStep("STK Push successful", { CheckoutRequestID });

      return new Response(
        JSON.stringify({
          success: true,
          message: "M-Pesa payment prompt sent to your phone",
          checkoutRequestId: CheckoutRequestID,
          merchantRequestId: MerchantRequestID,
          transactionId: transaction?.id,
          invoiceId: primaryInvoiceId,
          invoiceIds: targetIds.length > 1 ? targetIds : undefined,
          unitNumber,
          accountReference,
        }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    } else {
      throw new Error(
        stkResult.errorMessage ||
          stkResult.ResponseDescription ||
          "STK Push failed"
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logStep("Error", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
