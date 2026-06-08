import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import Stripe from "stripe/stripe@18.5.0";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY");
const SUPABASE_URL      = requireEnv("SUPABASE_URL");
const SERVICE_KEY       = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);


  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    });

    // ============================
    // AUTH
    // ============================
    const token = req.headers.get("Authorization")!.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);

    if (!userData.user) throw new Error("Unauthorized");

    const user = userData.user;

    // ============================
    // INPUT
    // ============================
    const { invoiceId } = await req.json();

    if (!invoiceId) throw new Error("Invoice ID required");

    // ============================
    // FETCH INVOICE (🔥 CRITICAL)
    // ============================
    const { data: invoice, error: invoiceError } = await supabase
      .from("manager_invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("manager_user_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status === "paid") {
      throw new Error("Invoice already paid");
    }

    // ============================
    // CREATE PAYMENT RECORD
    // ============================
    const reference = `STRIPE-${Date.now()}`;

    await supabase.from("payments").insert({
      invoice_id: invoice.id,
      reference,
      amount: invoice.amount,
      method: "stripe",
      status: "pending",
    });

    // ============================
    // STRIPE CUSTOMER
    // ============================
    const customers = await stripe.customers.list({
      email: user.email!,
      limit: 1,
    });

    const customerId = customers.data[0]?.id;

    // ============================
    // CHECKOUT SESSION
    // ============================
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [
        {
          price_data: {
            currency: "kes",
            product_data: {
              name: invoice.description || "Platform Fee",
            },
            unit_amount: Math.round(invoice.amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",

      success_url: `${req.headers.get("origin")}/manager-billing?payment=success`,
      cancel_url: `${req.headers.get("origin")}/manager-billing?payment=cancelled`,

      metadata: {
        invoice_id: invoice.id,
        reference,
        manager_user_id: user.id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});