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

    const { name, email, phone, unit, property, propertyId, unitId, managerId, moveInDate, deposit } = await req.json();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: "name and email are required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Create the tenant record
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        unit: unit || null,
        property: property || null,
        property_id: propertyId || null,
        unit_id: unitId || null,
        manager_id: managerId || null,
        move_in_date: moveInDate || null,
        deposit: deposit || 0,
        status: "active",
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // Mark unit as occupied if unitId provided
    if (unitId) {
      await supabase
        .from("units")
        .update({ status: "occupied", tenant_id: tenant.id })
        .eq("id", unitId);
      // Update property occupied count
      const { data: unitData } = await supabase
        .from("units")
        .select("property_id")
        .eq("id", unitId)
        .single();
      if (unitData?.property_id) {
        const { count } = await supabase
          .from("units")
          .select("id", { count: "exact", head: true })
          .eq("property_id", unitData.property_id)
          .eq("status", "occupied");
        await supabase
          .from("properties")
          .update({ occupied: count || 0 })
          .eq("id", unitData.property_id);
      }
    }

    // Send welcome email
    await supabase.functions.invoke("send-welcome-email", {
      body: { tenantId: tenant.id },
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true, tenant }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
