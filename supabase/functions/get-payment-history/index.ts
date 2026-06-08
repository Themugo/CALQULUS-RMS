import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import Stripe from "stripe/stripe@18.5.0";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv, getEnv } from "../_shared/env.ts";
const logStep = (step: string, details?: any) => {
  console.log(`[get-payment-history] ${step}`, details ?? '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);


  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseClient = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get the tenant_id for this user
    const { data: userRoleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('role', 'tenant')
      .maybeSingle();

    if (roleError) {
      logStep("Role query error (continuing without tenant ID)", { error: roleError.message });
    }

    const tenantId = userRoleData?.tenant_id;
    logStep("Got tenant ID", { tenantId });

    const allPayments: any[] = [];

    // 1. Fetch database payment transactions (M-Pesa, manual payments keyed in by manager)
    if (tenantId) {
      const { data: dbTransactions, error: dbError } = await supabaseClient
        .from('payment_transactions')
        .select(`
          id,
          amount,
          status,
          phone_number,
          payment_type,
          payment_method,
          mpesa_receipt_number,
          bank_reference,
          initiated_at,
          completed_at,
          invoice_id
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (dbError) {
        logStep("Database query error", { error: dbError.message });
      } else if (dbTransactions) {
        logStep("Found database transactions", { count: dbTransactions.length });
        
        // Get invoice numbers for these transactions
        const invoiceIds = dbTransactions
          .filter(t => t.invoice_id)
          .map(t => t.invoice_id);
        
        let invoiceMap: Record<string, string> = {};
        if (invoiceIds.length > 0) {
          const { data: invoices, error: invoiceError } = await supabaseClient
            .from('invoices')
            .select('id, invoice_number')
            .in('id', invoiceIds);
          
          if (invoiceError) {
            logStep("Invoice query error", { error: invoiceError.message });
          } else if (invoices) {
            invoiceMap = invoices.reduce((acc, inv) => {
              acc[inv.id] = inv.invoice_number;
              return acc;
            }, {} as Record<string, string>);
          }
        }

        for (const tx of dbTransactions) {
          const paymentMethod = tx.payment_method || tx.payment_type || 'payment';
          allPayments.push({
            id: tx.id,
            amount: Number(tx.amount),
            currency: paymentMethod?.startsWith('mpesa') || tx.mpesa_receipt_number ? 'KES' : 'KES',
            status: 'paid',
            created: tx.completed_at || tx.initiated_at,
            invoiceNumber: tx.invoice_id ? invoiceMap[tx.invoice_id] || null : null,
            invoiceId: tx.invoice_id,
            paymentMethod: paymentMethod?.startsWith('mpesa') ? 'M-Pesa' : paymentMethod,
            receiptUrl: null,
            mpesaReceipt: tx.mpesa_receipt_number || tx.bank_reference,
            source: 'database'
          });
        }
      }
    }

    // 2. Fetch Stripe payments
    const stripeKey = getEnv("STRIPE_SECRET_KEY");
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

        // Find customer by email
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        
        if (customers.data.length > 0) {
          const customerId = customers.data[0].id;
          logStep("Found Stripe customer", { customerId });

          // Fetch completed checkout sessions for this customer
          const sessions = await stripe.checkout.sessions.list({
            customer: customerId,
            limit: 50,
          });

          // Filter successful payments and format
          const stripePayments = sessions.data
            .filter((session: Stripe.Checkout.Session) => session.payment_status === 'paid')
            .map((session: Stripe.Checkout.Session) => ({
              id: session.id,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              currency: session.currency?.toUpperCase() || 'USD',
              status: 'paid',
              created: new Date(session.created * 1000).toISOString(),
              invoiceNumber: session.metadata?.invoice_number || null,
              invoiceId: session.metadata?.invoice_id || null,
              paymentMethod: 'Card',
              receiptUrl: null as string | null,
              paymentIntent: session.payment_intent as string | null,
              source: 'stripe'
            }));

          // Get payment intents for receipt URLs
          for (const payment of stripePayments) {
            try {
              if (payment.paymentIntent) {
                const paymentIntent = await stripe.paymentIntents.retrieve(payment.paymentIntent);
                if (paymentIntent.latest_charge) {
                  const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
                  payment.receiptUrl = charge.receipt_url;
                }
              }
            } catch (e) {
              logStep("Could not get receipt URL", { paymentId: payment.id });
            }
          }

          allPayments.push(...stripePayments);
          logStep("Added Stripe payments", { count: stripePayments.length });
        }
      } catch (stripeError) {
        logStep("Stripe error (continuing with DB data)", { error: String(stripeError) });
      }
    } else {
      logStep("No Stripe key configured, using database transactions only");
    }

    // Sort all payments by date, newest first
    allPayments.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    logStep("Total payments", { count: allPayments.length });

    return new Response(JSON.stringify({ payments: allPayments }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
