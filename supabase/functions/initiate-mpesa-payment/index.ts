import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv, getEnv } from "../_shared/env.ts";
const logStep = (step: string, details?: any) => {
  console.log(`[initiate-mpesa-payment] ${step}`, details ?? "");
};

interface PaymentRequest {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  phoneNumber: string;
  email: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);


  try {
    logStep("Function started");

    const paystackKey = getEnv("PAYSTACK_SECRET_KEY");
    if (!paystackKey) {
      throw new Error("PAYSTACK_SECRET_KEY is not set");
    }
    logStep("Paystack key verified");

    // Authenticate user
    const supabaseClient = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_ANON_KEY")
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });
    // Rate limit: 5 payment initiations per user per hour
    if (!await checkRateLimit(supabaseClient, user.id, "initiate-mpesa-payment", RATE_LIMITS["initiate-mpesa-payment"])) {
      return rateLimitResponse(req);
    }

    const body: PaymentRequest = await req.json();
    const { invoiceId, invoiceNumber, amount, phoneNumber, email, description } = body;

    logStep("Payment request received", { invoiceId, amount, phoneNumber });

    // Validate phone number format (should start with 254)
    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '');
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }
    logStep("Phone number formatted", { original: phoneNumber, formatted: formattedPhone });

    // Convert amount to smallest currency unit (cents/kobo for Paystack)
    const amountInCents = Math.round(amount * 100);

    // Create Paystack charge for mobile money
    const paystackResponse = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email || user.email,
        amount: amountInCents,
        currency: "KES",
        mobile_money: {
          phone: formattedPhone,
          provider: "mpesa",
        },
        metadata: {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber,
          custom_fields: [
            {
              display_name: "Invoice Number",
              variable_name: "invoice_number",
              value: invoiceNumber,
            },
            {
              display_name: "Description",
              variable_name: "description",
              value: description || "Rent Payment",
            },
          ],
        },
      }),
    });

    const paystackData = await paystackResponse.json();
    logStep("Paystack response", paystackData);

    if (!paystackResponse.ok || !paystackData.status) {
      throw new Error(paystackData.message || "Failed to initiate M-Pesa payment");
    }

    // Check if STK push was sent successfully
    if (paystackData.data?.status === "send_otp" || paystackData.data?.status === "pending") {
      logStep("STK push initiated successfully", { reference: paystackData.data?.reference });
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "M-Pesa payment request sent. Please check your phone and enter your PIN.",
          reference: paystackData.data?.reference,
          status: paystackData.data?.status,
        }),
        {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // If payment is already successful
    if (paystackData.data?.status === "success") {
      logStep("Payment completed immediately");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment completed successfully!",
          reference: paystackData.data?.reference,
          status: "success",
        }),
        {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Return the response for other statuses
    return new Response(
      JSON.stringify({
        success: true,
        message: paystackData.data?.display_text || "Payment initiated",
        reference: paystackData.data?.reference,
        status: paystackData.data?.status,
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
