import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { Resend } from "resend/resend@2.0.0";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv, getEnv } from "../_shared/env.ts";
const resend = new Resend(getEnv("RESEND_API_KEY"));

interface NewManagerSignupRequest {
  managerEmail: string;
  managerName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);


  try {
    const { managerEmail, managerName }: NewManagerSignupRequest = await req.json();

    const supabaseClient = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    // Get all webhost users to notify them
    const { data: webhostRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'webhost');

    if (rolesError) {
      console.error("[NEW-MANAGER-SIGNUP] Error fetching webhost roles:", rolesError);
      throw new Error("Could not find webhost users");
    }

    if (!webhostRoles || webhostRoles.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No webhosts to notify" }), {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Get webhost emails from profiles
    const webhostEmails: string[] = [];
    for (const role of webhostRoles) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('email')
        .eq('id', role.user_id)
        .single();
      
      if (profile?.email) {
        webhostEmails.push(profile.email);
      }
    }

    if (webhostEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No webhost emails found" }), {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">New Manager Signup</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #334155;">A new property manager has signed up and is awaiting your approval:</p>
          
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="color: #64748b; padding: 8px 0;">Name:</td>
                <td style="color: #1e293b; font-weight: bold; padding: 8px 0;">${managerName}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 8px 0;">Email:</td>
                <td style="color: #1e293b; font-weight: bold; padding: 8px 0;">${managerEmail}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 8px 0;">Status:</td>
                <td style="padding: 8px 0;">
                  <span style="background: #fef3c7; color: #d97706; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                    Pending Approval
                  </span>
                </td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 14px; color: #64748b;">
            Please log in to your webhost dashboard to review and approve or reject this manager.
          </p>
          
          <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
            Best regards,<br>
            The RentFlow System
          </p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "RentFlow <onboarding@resend.dev>",
      to: webhostEmails,
      subject: `New Manager Signup: ${managerName} - Pending Approval`,
      html,
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[NEW-MANAGER-SIGNUP] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
