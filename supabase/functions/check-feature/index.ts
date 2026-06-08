import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv, getEnv } from "../_shared/env.ts";
// Feature flags controlled by webhost admin
const PLAN_FEATURES: Record<string, string[]> = {
  free: ["basic_billing", "tenant_portal", "maintenance"],
  pro: ["basic_billing", "tenant_portal", "maintenance", "water_billing", "contracts", "vacation_notices", "payment_reminders", "pdf_export"],
  enterprise: ["basic_billing", "tenant_portal", "maintenance", "water_billing", "contracts", "vacation_notices", "payment_reminders", "pdf_export", "api_access", "white_label", "advanced_analytics", "bulk_sms"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    const supabase = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { managerId, feature } = await req.json();

    if (!managerId || !feature) {
      return new Response(JSON.stringify({ error: "managerId and feature required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Get manager's subscription plan
    const { data: subscription } = await supabase
      .from("manager_subscriptions")
      .select("plan, status, expires_at")
      .eq("manager_id", managerId)
      .eq("status", "active")
      .maybeSingle();

    const plan = subscription?.plan || "pro"; // Default to pro for all active managers
    const planFeatures = PLAN_FEATURES[plan] || PLAN_FEATURES.pro;
    const enabled = planFeatures.includes(feature);

    return new Response(JSON.stringify({ enabled, plan, feature }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
