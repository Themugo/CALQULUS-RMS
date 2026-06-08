import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv, getEnv } from "../_shared/env.ts";
const RESEND_API_KEY = getEnv("RESEND_API_KEY");

interface CreateTenantRequest {
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  property: string;
  property_id?: string;
  unit: string;
  move_in_date?: string;
  companyName?: string;
  portalUrl?: string;
  manager_id?: string;
  sendSms?: boolean;
  sendWhatsapp?: boolean;
  monthlyRent?: number;
  depositAmount?: number;
}

// HTML escape function
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Send activation email with secure link (no password)
async function sendActivationEmail(
  email: string,
  name: string,
  activationToken: string,
  companyName: string,
  property: string,
  unit: string,
  portalUrl: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping activation email");
    return;
  }

  const safeName = escapeHtml(name);
  const safeCompany = escapeHtml(companyName);
  const safeProperty = escapeHtml(property);
  const safeUnit = escapeHtml(unit);
  
  // Build activation URL - ensure proper URL construction
  const baseUrl = portalUrl.replace(/\/+$/, ''); // Remove trailing slashes
  const activationUrl = `${baseUrl}/activate?token=${encodeURIComponent(activationToken)}`;

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${safeCompany} <onboarding@resend.dev>`,
      to: [email],
      subject: `Welcome to ${safeCompany} - Activate Your Tenant Portal`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px 20px; background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none; }
            .info-box { background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .info-box h3 { color: #0369a1; margin: 0 0 15px 0; font-size: 18px; }
            .info-row { background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px; margin-bottom: 8px; }
            .info-label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .info-value { color: #111827; font-weight: 600; font-size: 16px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .security-note { background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .security-title { color: #059669; font-weight: 600; margin-bottom: 5px; }
            .expiry-notice { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .expiry-title { color: #b45309; font-weight: 600; margin-bottom: 5px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${safeCompany}!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Activate Your Tenant Portal</p>
            </div>
            <div class="content">
              <p>Dear ${safeName},</p>
              <p>Welcome to your new home at <strong>${safeProperty} - Unit ${safeUnit}</strong>! Your tenant portal account is ready to be activated.</p>
              
              <div class="info-box">
                <h3>🏠 Your Property Details</h3>
                <div class="info-row">
                  <div class="info-label">Property</div>
                  <div class="info-value">${safeProperty}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Unit</div>
                  <div class="info-value">${safeUnit}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Email</div>
                  <div class="info-value">${escapeHtml(email)}</div>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${activationUrl}" class="cta-button">🔐 Activate Your Account</a>
              </div>

              <div class="security-note">
                <div class="security-title">🔒 Secure Activation</div>
                <p style="margin: 0; color: #047857;">Click the button above to set your own secure password. You'll choose your password during activation - no temporary password is sent via email for your security.</p>
              </div>

              <div class="expiry-notice">
                <div class="expiry-title">⏰ Link Expires in 24 Hours</div>
                <p style="margin: 0; color: #92400e;">For security, this activation link will expire in 24 hours. If you don't activate within this time, please contact your property manager for a new link.</p>
              </div>

              <p>Through the tenant portal, you can:</p>
              <ul>
                <li>View and sign your lease agreement</li>
                <li>Check payment history and upcoming invoices</li>
                <li>Submit maintenance requests</li>
                <li>Access important documents</li>
              </ul>

              <p>If you have any questions, please contact us.</p>
              <p>Best regards,<br><strong>${safeCompany}</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message from ${safeCompany}.</p>
              <p>If you did not expect this email, please ignore it or contact us.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }),
  });

  const responseData = await emailResponse.json();
  if (!emailResponse.ok) {
    console.error("Failed to send activation email:", responseData);
  }
}

// Send SMS notification with activation details
async function sendActivationSms(
  phone: string,
  name: string,
  activationToken: string,
  companyName: string,
  property: string,
  unit: string,
  portalUrl: string
): Promise<void> {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const baseUrl = portalUrl.replace(/\/+$/, '');
  const activationUrl = `${baseUrl}/activate?token=${encodeURIComponent(activationToken)}`;
  
  const message = `Welcome to ${companyName}, ${name}! Your tenant account for ${property} - ${unit} is ready. Activate here: ${activationUrl} (Link expires in 24hrs)`;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber: phone,
        message,
      }),
    });

    const result = await response.json();
    if (!result.success) {
      console.error("SMS sending failed:", result.error);
    }
  } catch (error) {
    console.error("Error sending SMS:", error);
  }
}

// Send WhatsApp notification with activation details
async function sendActivationWhatsapp(
  whatsappNumber: string,
  name: string,
  activationToken: string,
  companyName: string,
  property: string,
  unit: string,
  portalUrl: string
): Promise<void> {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const baseUrl = portalUrl.replace(/\/+$/, '');
  const activationUrl = `${baseUrl}/activate?token=${encodeURIComponent(activationToken)}`;
  
  const message = `Welcome to ${companyName}, ${name}! 🏠\n\nYour tenant account for ${property} - ${unit} is ready.\n\n🔐 Activate your account here:\n${activationUrl}\n\n⏰ This link expires in 24 hours.`;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber: whatsappNumber,
        message,
        type: 'invoice', // Using 'invoice' type for general notification
      }),
    });

    const result = await response.json();
    if (!result.success) {
      console.error("WhatsApp sending failed:", result.message || result.error);
    }
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {

    // Verify caller is authenticated manager
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Check caller has manager or webhost role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (roleData?.role !== "manager" && roleData?.role !== "webhost") {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const { name, email, phone, whatsapp, property, property_id, unit, move_in_date, companyName, portalUrl, manager_id, sendSms, sendWhatsapp, monthlyRent, depositAmount }: CreateTenantRequest = await req.json();

    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Name and email are required" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Use the caller's ID as manager_id if not explicitly provided
    const effectiveManagerId = manager_id || caller.id;

    // Use service role client to create auth user
    const supabaseAdmin = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;
    let isNewUser = false;
    let activationToken: string | null = null;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new auth user with a random password they won't know
      // They will set their own password via the activation flow
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

      if (createError) {
        console.error("Error creating auth user:", createError);
        throw new Error(`Failed to create user account: ${createError.message}`);
      }

      userId = newUser.user.id;
      isNewUser = true;

      // Create activation token for secure password setup
      const { data: activation, error: activationError } = await supabaseAdmin
        .from("account_activations")
        .insert({
          user_id: userId,
          // token is auto-generated via database default
        })
        .select("token")
        .single();

      if (activationError) {
        console.error("Error creating activation token:", activationError);
        // Clean up the user we just created
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Failed to create activation token: ${activationError.message}`);
      }

      activationToken = activation.token;
    }

    // Look up or create unit record for proper FK linkage
    let unitId: string | null = null;
    if (property_id && unit) {
      // Check if unit exists
      const { data: existingUnit } = await supabaseAdmin
        .from("units")
        .select("id")
        .eq("property_id", property_id)
        .eq("unit_number", unit)
        .maybeSingle();

      if (existingUnit) {
        unitId = existingUnit.id;
        // Update existing unit status to occupied + set rent if provided
        const { error: unitUpdateError } = await supabaseAdmin
          .from("units")
          .update({
            status: "occupied",
            ...(monthlyRent ? { monthly_rent: monthlyRent } : {}),
          })
          .eq("id", unitId);
        if (unitUpdateError) throw new Error(`Failed to mark unit occupied: ${unitUpdateError.message}`);
      } else {
        // Auto-create unit record
        const { data: newUnit, error: unitCreateError } = await supabaseAdmin
          .from("units")
          .insert({
            property_id,
            unit_number: unit,
            label: unit,
            monthly_rent: monthlyRent || null,
            house_deposit: depositAmount || null,
            status: "occupied",
          })
          .select("id")
          .single();
        if (unitCreateError) throw new Error(`Failed to create unit record: ${unitCreateError.message}`);
        if (newUnit) unitId = newUnit.id;
      }

      // Recalculate and update property.occupied count from live units table
      const { count: occupiedCount } = await supabaseAdmin
        .from("units")
        .select("id", { count: "exact", head: true })
        .eq("property_id", property_id)
        .eq("status", "occupied");

      if (occupiedCount !== null) {
        await supabaseAdmin
          .from("properties")
          .update({ occupied: occupiedCount })
          .eq("id", property_id);
      }
    }

    // Create tenant record - linked to the manager and unit
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .insert({
        name,
        email,
        phone: phone || null,
        property,
        property_id: property_id || null,
        unit,
        unit_id: unitId,
        status: "active",
        move_in_date: move_in_date || null,
        manager_id: effectiveManagerId,
        monthly_rent: monthlyRent || null,
        deposit_amount: depositAmount || null,
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Error creating tenant:", tenantError);
      if (isNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      throw new Error(`Failed to create tenant record: ${tenantError.message}`);
    }

    // Check if user_role already exists
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "tenant",
          tenant_id: tenant.id,
        });

      if (roleError) {
        console.error("Error creating user role:", roleError);
        throw new Error(`Failed to create user role: ${roleError.message}`);
      }
    } else {
      const { error: updateRoleError } = await supabaseAdmin
        .from("user_roles")
        .update({ tenant_id: tenant.id })
        .eq("user_id", userId);

      if (updateRoleError) {
        console.error("Error updating user role:", updateRoleError);
      }
    }

    // ── Sync payment details to tenant portal ─────────────────────────
    // Get manager's M-Pesa settings so tenant can see paybill details
    let paybillNumber: string | null = null;
    let accountReference: string | null = unit || null;
    if (effectiveManagerId) {
      const { data: mpesaSettings } = await supabaseAdmin
        .from("mpesa_settings")
        .select("paybill_shortcode, paybill_enabled, paybill_account_reference")
        .eq("manager_id", effectiveManagerId)
        .maybeSingle();
      if (mpesaSettings?.paybill_enabled) {
        paybillNumber  = (mpesaSettings as any).paybill_shortcode || null;
        accountReference = (mpesaSettings as any).paybill_account_reference || unit || null;
      }
    }

    // Call sync_tenant_payment_details to populate the portal's payment details
    await supabaseAdmin.rpc("sync_tenant_payment_details", {
      p_tenant_id:          tenant.id,
      p_manager_id:         effectiveManagerId || null,
      p_property_id:        property_id || null,
      p_unit_id:            unitId || null,
      p_monthly_rent:       monthlyRent || null,
      p_house_deposit:      depositAmount || null,
      p_water_deposit:      null,
      p_other_charges:      null,
      p_other_charges_desc: null,
      p_payment_day:        1,
      p_paybill:            paybillNumber,
      p_account_ref:        accountReference,
      p_tenancy_type:       "standard",
    }).catch((err: Error) => console.warn("Payment details sync failed (non-critical):", err.message));

    // Send activation notifications if new user
    let emailSent = false;
    let smsSent = false;
    let whatsappSent = false;
    
    if (isNewUser && activationToken) {
      // Always send email
      await sendActivationEmail(
        email,
        name,
        activationToken,
        companyName || "RentFlow Properties",
        property,
        unit,
        portalUrl || getEnv("SITE_URL", "https://rentflow.ink")
      );
      emailSent = true;

      // Also send SMS if requested and phone is provided
      if (sendSms && phone) {
        await sendActivationSms(
          phone,
          name,
          activationToken,
          companyName || "RentFlow Properties",
          property,
          unit,
          portalUrl || getEnv("SITE_URL", "https://rentflow.ink")
        );
        smsSent = true;
      }

      // Send WhatsApp notification if requested and whatsapp number is provided
      if (sendWhatsapp && whatsapp) {
        await sendActivationWhatsapp(
          whatsapp,
          name,
          activationToken,
          companyName || "RentFlow Properties",
          property,
          unit,
          portalUrl || getEnv("SITE_URL", "https://rentflow.ink")
        );
        whatsappSent = true;
      }
    }

    const methods = [];
    if (emailSent) methods.push('email');
    if (smsSent) methods.push('SMS');
    if (whatsappSent) methods.push('WhatsApp');

    return new Response(
      JSON.stringify({
        success: true,
        tenant,
        isNewUser,
        emailSent,
        smsSent,
        whatsappSent,
        message: isNewUser 
          ? `Tenant account created. Activation sent via ${methods.join(', ')}.`
          : "Tenant linked to existing user account",
      }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in create-tenant-account:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
