import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";

import { requireEnv, getEnv } from "../_shared/env.ts";
// NOTE: This function requires the following tables/columns that are NOT yet in the schema:
// - tenants.credit_score (column)
// Run the migration to add these before deploying this function.

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const supabase = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  try {
    const { tenantId } = await req.json();

    if (!tenantId) {
      return new Response(JSON.stringify({ error: "tenantId is required" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Fetch payment history
    const { data: payments } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("tenant_id", tenantId);

    if (!payments || payments.length === 0) {
      return new Response(JSON.stringify({ score: 0 }), {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const total = payments.length;
    let onTime = 0;
    let late = 0;
    let missed = 0;

    for (const p of payments) {
      if (p.status === "paid") {
        if (new Date(p.created_at) <= new Date(p.due_date)) onTime++;
        else late++;
      } else {
        missed++;
      }
    }

    // Scoring logic
    let score =
      (onTime / total) * 70 +
      ((total - missed) / total) * 20 +
      (1 - late / total) * 10;

    score = Math.round(score);

    // Update tenant — requires tenants.credit_score column
    await supabase
      .from("tenants")
      .update({ credit_score: score })
      .eq("id", tenantId);

    return new Response(JSON.stringify({ score }), {
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
