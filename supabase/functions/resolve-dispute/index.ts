import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv, getEnv } from "../_shared/env.ts";
serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    const supabase = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { disputeId, resolution, resolvedBy, adjustmentAmount, notes } = await req.json();

    if (!disputeId || !resolution) {
      return new Response(JSON.stringify({ error: "disputeId and resolution required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: dispute, error: fetchError } = await supabase
      .from("disputes")
      .select("*, tenants(id, name)")
      .eq("id", disputeId)
      .single();

    if (fetchError || !dispute) throw new Error("Dispute not found");

    const { error } = await supabase
      .from("disputes")
      .update({
        status: "resolved",
        resolution,
        resolved_by: resolvedBy || null,
        adjustment_amount: adjustmentAmount || null,
        resolution_notes: notes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", disputeId);

    if (error) throw error;

    // If there's a credit/debit adjustment, create an other_charge record
    if (adjustmentAmount && dispute.invoice_id) {
      await supabase.from("other_charges").insert({
        tenant_id: dispute.tenant_id,
        invoice_id: dispute.invoice_id,
        description: `Dispute adjustment — ${resolution}`,
        amount: Math.abs(adjustmentAmount),
        charge_type: adjustmentAmount < 0 ? "credit" : "charge",
        status: "pending",
      });
    }

    // Notify tenant
    if (dispute.tenant_id) {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: dispute.tenant_id,
          title: "Dispute resolved",
          body: `Your dispute has been resolved: ${resolution}`,
        },
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true, disputeId, resolution }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
