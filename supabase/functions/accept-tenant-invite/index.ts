import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv } from "../_shared/env.ts";
serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseServiceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, userId, email, name, phone } = await req.json();

    if (!token || !userId) {
      return new Response(JSON.stringify({ error: "token and userId are required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Look up the invite
    const { data: invite, error: inviteError } = await supabase
      .from("tenant_invites")
      .select("*, units(id, unit_number, property_id, properties(name, address))")
      .eq("invite_token", token)
      .eq("status", "pending")
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: "Invalid or expired invite link" }), {
        status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await supabase.from("tenant_invites").update({ status: "expired" }).eq("id", invite.id);
      return new Response(JSON.stringify({ error: "This invite link has expired" }), {
        status: 410, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const unit = Array.isArray(invite.units) ? invite.units[0] : invite.units;
    const property = Array.isArray(unit?.properties) ? unit.properties[0] : unit?.properties;

    // Create tenant record
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        user_id: userId,
        unit_id: invite.unit_id,
        property_id: unit?.property_id || invite.property_id || null,
        name: name || invite.invited_name || email?.split("@")[0] || "Tenant",
        email: email || invite.email,
        phone: phone || invite.phone || null,
        unit: unit?.unit_number || null,
        property: property?.name || null,
        manager_id: invite.manager_id,
        status: "active",
        move_in_date: invite.move_in_date || null,
        deposit: invite.deposit_amount || 0,
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // Mark unit as occupied
    if (invite.unit_id) {
      await supabase
        .from("units")
        .update({ status: "occupied", tenant_id: tenant.id })
        .eq("id", invite.unit_id);
    }

    // Update invite status
    await supabase
      .from("tenant_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq("id", invite.id);

    // Assign tenant role in user_roles
    await supabase.from("user_roles").insert({
      user_id: userId,
      role: "tenant",
      tenant_id: tenant.id,
      approval_status: "approved",
    });

    // Notify manager
    if (invite.manager_id && property?.name) {
      await fetch(`${supabaseUrl}/functions/v1/notify-manager-tenant-signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          managerId: invite.manager_id,
          tenantName: tenant.name,
          tenantEmail: tenant.email,
          propertyName: property.name,
          unit: unit?.unit_number,
        }),
      }).catch(() => {});
    }

    const tenantPhone = phone || invite.phone;
    if (tenantPhone) {
      await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          phoneNumber: tenantPhone,
          message: `Welcome to RentFlow, ${tenant.name}. Your tenant portal is active${property?.name ? ` for ${property.name}` : ""}.`,
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true, tenant, redirect: "/portal" }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("accept-tenant-invite error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
