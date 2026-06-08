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

    const { userId, userEmail, userName, action, entityType, entityId, details } = await req.json();

    if (!userId || !action || !entityType) {
      return new Response(JSON.stringify({ error: "userId, action and entityType are required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase.from("activity_logs").insert({
      user_id: userId,
      user_email: userEmail || "unknown",
      user_name: userName || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || null,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
