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

    const { landlordId, month, propertyId } = await req.json();
    if (!landlordId || !month) {
      return new Response(JSON.stringify({ error: "landlordId and month required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const start = `${month}-01`;
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0)
      .toISOString().slice(0, 10);

    // Fetch payments for landlord's properties this month
    let paymentsQuery = supabase
      .from("payments")
      .select("*, invoices(invoice_number, due_date, tenants(name, unit))")
      .gte("paid_at", start)
      .lte("paid_at", end + "T23:59:59");

    if (propertyId) {
      paymentsQuery = paymentsQuery.eq("property_id", propertyId);
    } else {
      // Get all property IDs for this landlord
      const { data: props } = await supabase
        .from("properties")
        .select("id")
        .eq("landlord_id", landlordId);
      const propIds = (props || []).map((p: any) => p.id);
      if (propIds.length > 0) {
        paymentsQuery = paymentsQuery.in("property_id", propIds);
      }
    }

    const { data: payments, error: paymentsError } = await paymentsQuery;
    if (paymentsError) throw paymentsError;

    // Fetch deductions (commissions, expenses) for the period
    const { data: deductions } = await supabase
      .from("property_deductions")
      .select("*")
      .eq("landlord_id", landlordId)
      .or(`is_recurring.eq.true,and(effective_date.gte.${start},effective_date.lte.${end})`);

    const totalIncome = (payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);

    // Calculate deductions
    let totalDeductions = 0;
    const deductionItems: any[] = [];
    for (const d of deductions || []) {
      const amount = d.deduction_type === "percentage"
        ? (totalIncome * Number(d.amount)) / 100
        : Number(d.amount);
      totalDeductions += amount;
      deductionItems.push({ name: d.name, type: d.deduction_type, raw: d.amount, computed: amount });
    }

    const net = totalIncome - totalDeductions;

    return new Response(JSON.stringify({
      month,
      landlordId,
      payments: payments || [],
      deductions: deductionItems,
      summary: { totalIncome, totalDeductions, net },
    }), { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
