import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv, getEnv } from "../_shared/env.ts";
// Subscription tier configuration
const SUBSCRIPTION_TIERS = {
  perProperty: {
    name: "Per-Property Subscription",
    amountPerProperty: 2500,
    maxProperties: 9,
    description: "KES 2,500 per property/month (up to 9 properties)",
  },
  agency: {
    name: "Agency Flat Rate",
    amount: 20000,
    minProperties: 10,
    description: "KES 20,000/month flat rate (10+ properties)",
  },
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
};

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);


  const supabaseClient = createClient(
    getEnv("SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { phoneNumber, propertyCount } = await req.json();
    logStep("Request body parsed", { phoneNumber, propertyCount });

    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    if (!propertyCount || propertyCount < 1) {
      throw new Error("Property count must be at least 1");
    }

    // Calculate subscription amount based on property count
    let amount: number;
    let tier: string;
    let tierName: string;

    if (propertyCount >= SUBSCRIPTION_TIERS.agency.minProperties) {
      amount = SUBSCRIPTION_TIERS.agency.amount;
      tier = "agency";
      tierName = SUBSCRIPTION_TIERS.agency.name;
    } else {
      amount = propertyCount * SUBSCRIPTION_TIERS.perProperty.amountPerProperty;
      tier = "perProperty";
      tierName = SUBSCRIPTION_TIERS.perProperty.name;
    }

    logStep("Calculated subscription", { tier, tierName, amount, propertyCount });

    // Format phone number for M-Pesa (should be 254XXXXXXXXX)
    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '');
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }
    logStep("Formatted phone number", { original: phoneNumber, formatted: formattedPhone });

    // Get Africa's Talking credentials
    const apiKey = getEnv("AFRICASTALKING_API_KEY");
    const username = getEnv("AFRICASTALKING_USERNAME");

    if (!apiKey || !username) {
      throw new Error("Africa's Talking credentials not configured");
    }

    // Generate unique reference
    const reference = `SUB-${Date.now()}-${user.id.substring(0, 8)}`;
    
    // Initiate M-Pesa STK Push via Africa's Talking
    const paymentResponse = await fetch("https://payments.africastalking.com/mobile/b2c/request", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "apiKey": apiKey,
      },
      body: JSON.stringify({
        username: username,
        productName: "RentFlow",
        recipients: [{
          phoneNumber: formattedPhone,
          amount: amount,
          currencyCode: "KES",
          metadata: {
            type: "subscription",
            tier: tier,
            propertyCount: propertyCount.toString(),
            userId: user.id,
            reference: reference,
          },
        }],
      }),
    });

    const paymentResult = await paymentResponse.json();
    logStep("M-Pesa payment initiated", { result: paymentResult });

    // Store pending subscription record
    const { error: subscriptionError } = await supabaseClient
      .from('manager_subscriptions')
      .upsert({
        manager_user_id: user.id,
        tier: tier,
        property_count: propertyCount,
        amount: amount,
        status: 'pending',
        payment_method: 'mpesa',
        payment_reference: reference,
        phone_number: formattedPhone,
      }, {
        onConflict: 'manager_user_id',
      });

    if (subscriptionError) {
      logStep("Error storing subscription", { error: subscriptionError.message });
      // Don't fail the request, just log it
    }

    return new Response(JSON.stringify({
      success: true,
      message: `M-Pesa payment of KES ${amount.toLocaleString()} initiated. Check your phone for the STK push prompt.`,
      tier: tier,
      tierName: tierName,
      amount: amount,
      propertyCount: propertyCount,
      reference: reference,
      display_text: `Please enter your M-Pesa PIN to complete the payment of KES ${amount.toLocaleString()} for your ${tierName} subscription.`,
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
