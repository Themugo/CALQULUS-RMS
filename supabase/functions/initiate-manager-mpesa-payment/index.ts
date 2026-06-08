import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv, getEnv } from "../_shared/env.ts";
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
};

interface PaymentRequest {
  invoiceId: string;
  amount: number;
  phoneNumber: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);


  try {
    logStep("Function started");

    const paystackKey = getEnv("PAYSTACK_SECRET_KEY");
    if (!paystackKey) throw new Error("PAYSTACK_SECRET_KEY is not set");

    const supabaseClient = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_ANON_KEY")
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { invoiceId, amount, phoneNumber, description }: PaymentRequest = await req.json();
    logStep("Request data", { invoiceId, amount, phoneNumber, description });

    if (!invoiceId || !amount || !phoneNumber) {
      throw new Error("Invoice ID, amount, and phone number are required");
    }

    // Format phone number for M-Pesa (Kenya)
    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '');
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }
    logStep("Formatted phone", { formattedPhone });

    // Convert to cents (Paystack expects smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    // Initiate M-Pesa payment via Paystack
    const response = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountInCents,
        currency: "KES",
        mobile_money: {
          phone: formattedPhone,
          provider: "mpesa",
        },
        metadata: {
          invoice_id: invoiceId,
          manager_user_id: user.id,
          description: description || "Manager Platform Fee",
        },
      }),
    });

    const result = await response.json();
    logStep("Paystack response", { status: result.status, message: result.message });

    if (!result.status) {
      throw new Error(result.message || "Failed to initiate M-Pesa payment");
    }

    return new Response(JSON.stringify({
      success: true,
      message: "M-Pesa payment initiated. Check your phone for the STK push.",
      reference: result.data?.reference,
      display_text: result.data?.display_text,
    }), {
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
