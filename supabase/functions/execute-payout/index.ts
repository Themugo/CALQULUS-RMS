import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { payoutId } = await req.json();
    if (!payoutId) {
      return new Response(JSON.stringify({ error: "payoutId required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: payout, error } = await supabase
      .from("payouts")
      .select("*")
      .eq("id", payoutId)
      .single();

    if (error || !payout) throw new Error("Payout not found");
    if (payout.status !== "pending") {
      return new Response(JSON.stringify({ error: "Payout is not in pending status" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const executionResult: any = { method: payout.method };

    if (payout.method === "mpesa" && payout.mpesa_phone) {
      // Initiate M-Pesa B2C via Daraja
      const b2cResult = await supabase.functions.invoke("initiate-mpesa-payment", {
        body: {
          phone: payout.mpesa_phone,
          amount: payout.amount,
          reference: payoutId,
          remarks: "Landlord payout",
        },
      });
      executionResult.mpesa = b2cResult.data;
    }

    // Mark payout as processing
    await supabase
      .from("payouts")
      .update({ status: "processing", processed_at: new Date().toISOString(), execution_result: executionResult })
      .eq("id", payoutId);

    // Send notification
    await supabase.functions.invoke("send-push-notification", {
      body: {
        userId: payout.landlord_id,
        title: "Payout initiated",
        body: `Your withdrawal of KES ${Number(payout.amount).toLocaleString()} is being processed.`,
      },
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true, payoutId, status: "processing" }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
