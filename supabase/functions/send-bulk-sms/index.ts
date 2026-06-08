import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { getEnv } from "../_shared/env.ts";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "../_shared/rateLimit.ts";
import { sendSms, type SmsRecipient } from "../_shared/sms.ts";

interface BulkSMSRequest {
  recipients: SmsRecipient[];
  message: string;
  customMessages?: Record<string, string>;
}

interface SMSResult {
  phoneNumber: string;
  name?: string;
  success: boolean;
  provider?: string;
  error?: string;
  messageId?: string;
}

const MISSING_RECIPIENT_STATUSES_ERROR = "Provider did not return recipient delivery statuses.";
const MISSING_SINGLE_STATUS_ERROR = "Provider did not return a status for this recipient.";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const isServiceCall = authHeader === `Bearer ${serviceKey}`;

    if (!isServiceCall) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
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
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      if (!await checkRateLimit(supabase, user.id, "send-bulk-sms", RATE_LIMITS["send-bulk-sms"])) {
        return rateLimitResponse(req);
      }
    }

    const { recipients, message, customMessages }: BulkSMSRequest = await req.json();

    if (!recipients?.length) throw new Error("At least one recipient is required");
    if (!message && !customMessages) throw new Error("Message is required");
    if (recipients.length > 500) throw new Error("Bulk SMS is limited to 500 recipients per request");

    const results: SMSResult[] = [];
    for (const recipient of recipients) {
      const body = customMessages?.[recipient.phoneNumber] ?? message;
      try {
        const result = await sendSms(recipient.phoneNumber, body);
        const hasBooleanStatus = typeof result.success === "boolean";
        results.push({
          phoneNumber: result.to,
          name: recipient.name,
          success: hasBooleanStatus ? result.success : false,
          provider: result.provider,
          messageId: result.messageId,
          error: hasBooleanStatus ? result.error : MISSING_SINGLE_STATUS_ERROR,
        });
      } catch (error) {
        results.push({
          phoneNumber: recipient.phoneNumber,
          name: recipient.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter((result) => result.success).length;
    const hasProviderStatuses = results.some((result) => result.success || !!result.error);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} of ${recipients.length} messages`,
        warning: hasProviderStatuses ? undefined : MISSING_RECIPIENT_STATUSES_ERROR,
        summary: {
          total: recipients.length,
          success: successCount,
          failed: recipients.length - successCount,
        },
        results,
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
