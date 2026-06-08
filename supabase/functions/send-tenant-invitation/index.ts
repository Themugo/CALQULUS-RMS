import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv, getEnv } from "../_shared/env.ts";
import { formatPhoneNumber, sendSms } from "../_shared/sms.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = requireEnv("SUPABASE_ANON_KEY");

// Optional vendor keys
const RESEND_API_KEY = getEnv("RESEND_API_KEY");
const WHATSAPP_ACCESS_TOKEN = getEnv("WHATSAPP_ACCESS_TOKEN");
const PHONE_NUMBER_ID = getEnv("PHONE_NUMBER_ID");

const logStep = (step: string, details?: Record<string, unknown>) => {
};

interface InvitationRequest {
  email?: string;
  phone?: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unit?: string;
  monthlyRent?: number;
  houseDeposit?: number;
  waterDeposit?: number;
}

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sendSms(phone, message);
    logStep("SMS sent", { result });
    return { success: result.success, error: result.error };
  } catch (error) {
    logStep("SMS error", { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: error instanceof Error ? error.message : "SMS failed" };
  }
}

// Send WhatsApp via Meta Business API
async function sendWhatsApp(phone: string, tenantName: string, propertyName: string, unit: string | undefined, invitationUrl: string): Promise<{ success: boolean; error?: string }> {
  if (!WHATSAPP_ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    logStep("WhatsApp skipped - Meta Business API not configured");
    return { success: false, error: "WhatsApp provider not configured" };
  }

  try {
    const formattedPhone = formatPhoneNumber(phone).replace("+", "");
    
    // Send a text message (for template messages, you'd need approved templates)
    const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: {
          body: `Hi ${tenantName}! 👋\n\nYou've been invited to join ${propertyName}${unit ? ` (Unit ${unit})` : ""} on RentFlow.\n\nClick the link below to create your tenant account:\n${invitationUrl}\n\nWith RentFlow, you can:\n✅ View your lease details\n✅ Pay rent online via M-Pesa\n✅ Submit maintenance requests\n✅ Download statements and receipts`
        }
      }),
    });

    const result = await response.json();
    logStep("WhatsApp sent", { result });
    return { success: response.ok };
  } catch (error) {
    logStep("WhatsApp error", { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: error instanceof Error ? error.message : "WhatsApp failed" };
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    logStep("Starting invitation process");

    const supabaseUrl = SUPABASE_URL;
    const supabaseServiceKey = SERVICE_KEY;
    
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("Error: No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      logStep("User auth error", { error: userError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    logStep("Authenticated user", { userId: user.id, email: user.email });

    // Rate limit: max 10 invitations per manager per hour
    const { data: rateLimitOk } = await supabaseUser.rpc("check_rate_limit", {
      p_user_id:      user.id,
      p_function:     "send-tenant-invitation",
      p_max_per_hour: 10,
    });
    if (rateLimitOk === false) {
      return new Response(
        JSON.stringify({ error: "Too many invitations sent. Please wait before sending more." }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, phone, tenantName, propertyId, propertyName, unit, monthlyRent, houseDeposit, waterDeposit }: InvitationRequest = await req.json();
    
    // Require tenant name, property, and at least one contact method
    if (!tenantName || !propertyId || !propertyName) {
      logStep("Missing required fields", { tenantName, propertyId, propertyName });
      return new Response(JSON.stringify({ error: "Missing required fields: tenantName, propertyId, propertyName" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!email && !phone) {
      logStep("No contact method provided", { email, phone });
      return new Response(JSON.stringify({ error: "At least one contact method (email or phone) is required" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    logStep("Creating invitation", { email, phone, tenantName, propertyName, unit });

    // Use service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if invitation already exists (by email OR phone)
    let existingInvitation = null;
    
    if (email) {
      const { data } = await supabaseAdmin
        .from("tenant_invitations")
        .select("id, status, token")
        .eq("email", email)
        .eq("property_id", propertyId)
        .eq("status", "pending")
        .maybeSingle();
      existingInvitation = data;
    }
    let invitation;

    if (existingInvitation) {
      // Update existing invitation with new token and resend
      logStep("Resending existing invitation", { invitationId: existingInvitation.id });
      
      const newToken = crypto.randomUUID();
      const { data: updatedInvitation, error: updateError } = await supabaseAdmin
        .from("tenant_invitations")
        .update({
          token: newToken,
          tenant_name: tenantName,
          unit: unit || null,
          created_at: new Date().toISOString(),
        })
        .eq("id", existingInvitation.id)
        .select()
        .single();

      if (updateError) {
        logStep("Error updating invitation", { error: updateError.message });
        return new Response(JSON.stringify({ error: "Failed to resend invitation" }), {
          status: 500,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      
      invitation = updatedInvitation;
    } else {
      // Create new invitation - email can be null/undefined for phone-only invitations
      const { data: newInvitation, error: insertError } = await supabaseAdmin
        .from("tenant_invitations")
        .insert({
          email: email || `phone-${phone}@placeholder.rentflow`, // Use placeholder if no email
          tenant_name: tenantName,
          phone: phone || null,
          property_id: propertyId,
          property_name: propertyName,
          unit: unit || null,
          invited_by: user.id,
          // Payment details stored on invitation so create-tenant-account can use them
          monthly_rent:   monthlyRent   || null,
          house_deposit:  houseDeposit  || null,
          water_deposit:  waterDeposit  || null,
        })
        .select()
        .single();

      if (insertError) {
        logStep("Error creating invitation", { error: insertError.message });
        return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
          status: 500,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      
      invitation = newInvitation;
    }

    logStep("Invitation created", { invitationId: invitation.id, token: invitation.token });

    // Get manager info for the email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const managerName = profile?.full_name || user.email;

    // Build the invitation URL - Use the published app URL
    const appUrl = getEnv("SITE_URL", "https://rentflow.ink");
    const invitationUrl = `${appUrl}/tenant/invitation?token=${invitation.token}`;

    logStep("Invitation URL generated", { url: invitationUrl });

    // Track notification results
    const notificationResults = {
      email: { sent: false, error: null as string | null },
      sms: { sent: false, error: null as string | null },
      whatsapp: { sent: false, error: null as string | null },
    };

    // Send SMS if phone is provided
    if (phone) {
      const smsMessage = `Hi ${tenantName}! You've been invited to join ${propertyName}${unit ? ` (Unit ${unit})` : ""} on RentFlow. Create your account: ${invitationUrl}`;
      const smsResult = await sendSMS(phone, smsMessage);
      notificationResults.sms.sent = smsResult.success;
      notificationResults.sms.error = smsResult.error || null;
      
      // Also attempt WhatsApp
      const whatsappResult = await sendWhatsApp(phone, tenantName, propertyName, unit, invitationUrl);
      notificationResults.whatsapp.sent = whatsappResult.success;
      notificationResults.whatsapp.error = whatsappResult.error || null;
    }

    // If no email provided, return success with phone notification results
    if (!email || email.includes('@placeholder.rentflow')) {
      logStep("No email provided - invitation sent via phone channels", { notificationResults });
      return new Response(JSON.stringify({ 
        success: true, 
        invitation: { id: invitation.id },
        invitationUrl,
        notifications: notificationResults,
        message: notificationResults.sms.sent || notificationResults.whatsapp.sent 
          ? "Invitation sent via SMS/WhatsApp" 
          : "Invitation created. Share the link manually." 
      }), {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Check if RESEND_API_KEY is configured
    if (!RESEND_API_KEY) {
      logStep("Warning: RESEND_API_KEY not configured, skipping email");
      return new Response(JSON.stringify({ 
        success: true, 
        invitation: { id: invitation.id },
        invitationUrl,
        notifications: notificationResults,
        warning: "Email not sent - RESEND_API_KEY not configured" 
      }), {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Build the email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to RentFlow</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${tenantName}!</h2>
          
          <p style="color: #555; font-size: 16px;">
            <strong>${managerName}</strong> has invited you to join <strong>${propertyName}</strong>${unit ? ` (Unit ${unit})` : ""} as a tenant on RentFlow.
          </p>
          
          <p style="color: #555; font-size: 16px;">
            RentFlow makes it easy to:
          </p>
          
          <ul style="color: #555; font-size: 16px;">
            <li>View your lease details and contracts</li>
            <li>Pay rent online via M-Pesa</li>
            <li>Submit and track maintenance requests</li>
            <li>Download statements and receipts</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #888; font-size: 14px;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          
          <p style="color: #888; font-size: 12px; text-align: center;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${invitationUrl}" style="color: #10b981;">${invitationUrl}</a>
          </p>
        </div>
      </body>
      </html>
    `;

    logStep("Sending email via Resend", { to: email });

    // Send the invitation email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: getEnv("RESEND_FROM_EMAIL", "RentFlow <onboarding@resend.dev>"),
        to: [email],
        subject: `You've been invited to join ${propertyName} on RentFlow`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      logStep("Email sending failed", { status: emailResponse.status, result: emailResult });
      notificationResults.email.error = emailResult.message || "Failed to send email";
    } else {
      logStep("Email sent successfully", { emailId: emailResult.id });
      notificationResults.email.sent = true;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      invitation: { id: invitation.id }, 
      invitationUrl,
      notifications: notificationResults
    }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("Error in send-tenant-invitation", { error: errorMessage, stack: errorStack });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
