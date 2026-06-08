/**
 * send-sms-notification/index.ts
 *
 * Central SMS sender for receipts, tenant invitations, registration, and
 * manager-triggered messages. Supports Twilio first, with Africa's Talking
 * retained as a configurable fallback.
 */

import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { getEnv } from "../_shared/env.ts";
import { sendSms } from "../_shared/sms.ts";

interface SMSRequest {
  phoneNumber: string;
  message: string;
}

const log = (step: string, details?: unknown) => console.log(`[sms] ${step}`, details ?? "");

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;

    if (!isServiceRole) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized - missing Authorization header" }), {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        getEnv("SUPABASE_URL"),
        getEnv("SUPABASE_ANON_KEY"),
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized - invalid token" }), {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      const { data: rateLimitOk } = await supabase.rpc("check_rate_limit", {
        p_user_id: user.id,
        p_function: "send-sms-notification",
        p_max_per_hour: 10,
      });
      if (rateLimitOk === false) {
        return new Response(
          JSON.stringify({ error: "Too many SMS requests. Please wait before sending more." }),
          { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
        );
      }
    }

    const { phoneNumber, message }: SMSRequest = await req.json();
    const result = await sendSms(phoneNumber, message);
    log("SMS provider result", {
      provider: result.provider,
      to: result.to,
      success: result.success,
      messageId: result.messageId,
    });

    if (!result.success) {
      return new Response(JSON.stringify(result), {
        status: 502,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ...result, message: "SMS sent" }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
