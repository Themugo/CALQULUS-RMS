import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";

import { requireEnv, getEnv } from "../_shared/env.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const supabase = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  try {
    // Guard: check required tables exist (commission_configs, commissions)
    const { data: tableCheck } = await supabase
      .from("commission_configs")
      .select("id", { count: "exact", head: true });
    if (tableCheck === null) {
      return new Response(JSON.stringify({
        error: "Commission tables not yet created. Apply migration before enabling commission processing.",
        fix: "Run supabase/migrations/ (see AGENTS.md for pending migrations)",
      }), { status: 503, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const { paymentId } = await req.json();

    if (!paymentId) {
      return new Response(JSON.stringify({ error: "paymentId is required" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Get payment
    const { data: payment } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (!payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Get config
    const { data: config } = await supabase
      .from("commission_configs")
      .select("*")
      .eq("landlord_id", payment.landlord_id)
      .single();

    if (!config) {
      return new Response(JSON.stringify({ error: "No commission config for this landlord" }), {
        status: 404,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const platform = (payment.amount * config.platform_percent) / 100;
    const manager = (payment.amount * config.manager_percent) / 100;
    const agent = (payment.amount * config.agent_percent) / 100;

    const net = payment.amount - (platform + manager + agent);

    await supabase.from("commissions").insert({
      payment_id: payment.id,
      landlord_id: payment.landlord_id,
      manager_id: payment.manager_id,
      agent_id: payment.agent_id,
      gross_amount: payment.amount,
      platform_fee: platform,
      manager_fee: manager,
      agent_fee: agent,
      net_landlord: net,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
