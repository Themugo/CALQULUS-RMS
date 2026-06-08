import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv, getEnv } from "../_shared/env.ts";
// This function returns structured JSON data that the frontend
// uses to generate PDFs client-side with jsPDF + autoTable.
// Heavy PDF generation happens client-side to avoid timeout limits.
serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    const supabase = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { type, id, managerId, month, tenantId, propertyId } = await req.json();

    let data: any = {};

    switch (type) {
      case "receipt": {
        const { data: payment } = await supabase
          .from("payments")
          .select("*, invoices(invoice_number, due_date, amount, tenants(name, email, phone, unit, property))")
          .eq("id", id)
          .single();
        const { data: settings } = await supabase
          .from("manager_settings")
          .select("company_name, address, phone, email, receipt_footer, logo_url")
          .eq("manager_id", managerId)
          .maybeSingle();
        data = { type: "receipt", payment, settings };
        break;
      }
      case "invoice": {
        const { data: invoice } = await supabase
          .from("invoices")
          .select("*, tenants(name, email, phone, unit, property), other_charges(*)")
          .eq("id", id)
          .single();
        const { data: settings } = await supabase
          .from("manager_settings")
          .select("company_name, address, phone, email, logo_url")
          .eq("manager_id", managerId)
          .maybeSingle();
        data = { type: "invoice", invoice, settings };
        break;
      }
      case "statement": {
        const { data: invoices } = await supabase
          .from("invoices")
          .select("*, payments(*)")
          .eq("tenant_id", tenantId)
          .order("due_date", { ascending: false });
        const { data: tenant } = await supabase
          .from("tenants")
          .select("name, email, phone, unit, property")
          .eq("id", tenantId)
          .single();
        const { data: settings } = await supabase
          .from("manager_settings")
          .select("company_name, address, phone, email, logo_url")
          .eq("manager_id", managerId)
          .maybeSingle();
        data = { type: "statement", invoices, tenant, settings };
        break;
      }
      case "property_statement": {
        const { data: property } = await supabase
          .from("properties")
          .select("name, address")
          .eq("id", propertyId)
          .single();
        const { data: invoices } = await supabase
          .from("invoices")
          .select("amount, status, paid_date, tenants(name, unit)")
          .eq("property_id", propertyId)
          .gte("due_date", `${month}-01`)
          .lte("due_date", `${month}-31`);
        data = { type: "property_statement", property, invoices, month };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown export type" }), {
          status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
