import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv, getEnv } from "../_shared/env.ts";
const RESEND_API_KEY = getEnv("RESEND_API_KEY");

interface BankDetailsNotificationRequest {
  tenantEmails: { email: string; name: string }[];
  managerName: string;
  accountLabel: string;
  isNew: boolean;
  bankDetails: {
    bank_name: string;
    account_name: string;
    account_number: string;
    branch_name?: string;
    paybill_number?: string;
    till_number?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);


  try {
    // Auth check: require authenticated user with manager role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Verify caller is a manager
    const supabaseAdmin = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["manager", "webhost"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: manager role required" }), {
        status: 403,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const { tenantEmails, managerName, accountLabel, isNew, bankDetails }: BankDetailsNotificationRequest = await req.json();

    if (!tenantEmails || tenantEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No recipients to notify" }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const action = isNew ? "added new" : "updated";
    const subject = `Payment Details ${isNew ? "Added" : "Updated"} - RentFlow`;

    const results = [];

    for (const tenant of tenantEmails) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Payment Details ${isNew ? "Added" : "Updated"}</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin-top: 0;">Hello ${tenant.name || "Tenant"},</p>
            
            <p>Your landlord${managerName ? ` (${managerName})` : ""} has ${action} bank details${accountLabel ? ` for <strong>${accountLabel}</strong>` : ""}.</p>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #16a34a; font-size: 16px;">Bank Transfer Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 40%;">Bank Name</td>
                  <td style="padding: 8px 0; font-weight: 600;">${bankDetails.bank_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Account Name</td>
                  <td style="padding: 8px 0; font-weight: 600;">${bankDetails.account_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Account Number</td>
                  <td style="padding: 8px 0; font-weight: 600;">${bankDetails.account_number}</td>
                </tr>
                ${bankDetails.branch_name ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Branch</td>
                  <td style="padding: 8px 0; font-weight: 600;">${bankDetails.branch_name}</td>
                </tr>
                ` : ""}
              </table>
              
              ${bankDetails.paybill_number || bankDetails.till_number ? `
              <h3 style="margin-top: 20px; color: #16a34a; font-size: 16px;">M-Pesa Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${bankDetails.paybill_number ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 40%;">Paybill Number</td>
                  <td style="padding: 8px 0; font-weight: 600;">${bankDetails.paybill_number}</td>
                </tr>
                ` : ""}
                ${bankDetails.till_number ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Till Number</td>
                  <td style="padding: 8px 0; font-weight: 600;">${bankDetails.till_number}</td>
                </tr>
                ` : ""}
              </table>
              ` : ""}
            </div>
            
            <p>You can also view these details anytime in your tenant portal.</p>
            
            <p style="margin-bottom: 0; color: #64748b; font-size: 14px;">
              Best regards,<br>
              <strong>RentFlow Team</strong>
            </p>
          </div>
        </body>
        </html>
      `;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "RentFlow <notifications@resend.dev>",
            to: [tenant.email],
            subject,
            html: emailHtml,
          }),
        });

        const data = await res.json();
        results.push({ email: tenant.email, success: res.ok, data });
      } catch (error) {
        console.error(`Failed to send email to ${tenant.email}:`, error);
        results.push({ email: tenant.email, success: false, error: String(error) });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${successCount} of ${tenantEmails.length} emails`,
        results 
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending bank details notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
