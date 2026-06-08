import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const log = (step: string, details?: unknown) =>
  console.log(`[auto-generate-invoices] ${step}`, details ?? "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── Authentication ─────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceCall = authHeader === `Bearer ${SERVICE_KEY}`;

  let callerUserId: string | null = null;

  if (!isServiceCall) {
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
    const { data: roleRow } = await supabase.from("user_roles")
      .select("role").eq("user_id", caller.id).maybeSingle();
    if (!["webhost", "manager"].includes((roleRow as any)?.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: only webhosts and managers may auto-generate invoices" }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
    callerUserId = caller.id;

    const allowed = await checkRateLimit(
      supabase, caller.id, "auto-generate-invoices", 3,
      { failClosed: true },
    );
    if (!allowed) return rateLimitResponse(req);
  }

  try {
    log("Starting automatic monthly invoice generation");

    const { data: activeLeases, error: leasesError } = await supabase
      .from("leases")
      .select(`
        id,
        tenant_id,
        property,
        unit,
        monthly_rent,
        property_id,
        tenants (
          name,
          email,
          manager_id
        )
      `)
      .eq("status", "active");

    if (leasesError) {
      log("Error fetching leases", leasesError);
      throw leasesError;
    }

    if (!activeLeases || activeLeases.length === 0) {
      log("No active leases found");
      return new Response(
        JSON.stringify({ message: "No active leases found", invoicesCreated: 0 }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    log(`Found ${activeLeases.length} active leases`);

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 5);
    const dueDateStr = dueDate.toISOString().split("T")[0];
    
    const monthName = nextMonth.toLocaleString("default", { month: "long", year: "numeric" });

    const monthStart = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    const monthEnd = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);

    const { data: existingInvoices, error: existingError } = await supabase
      .from("invoices")
      .select("lease_id")
      .gte("due_date", monthStart.toISOString().split("T")[0])
      .lte("due_date", monthEnd.toISOString().split("T")[0]);

    if (existingError) {
      log("Error checking existing invoices", existingError);
      throw existingError;
    }

    const existingLeaseIds = new Set(existingInvoices?.map((inv) => inv.lease_id) || []);
    log(`Found ${existingLeaseIds.size} existing invoices for ${monthName}`);

    const leasesToInvoice = activeLeases.filter(
      (lease) => !existingLeaseIds.has(lease.id)
    );

    if (leasesToInvoice.length === 0) {
      log("All active leases already have invoices for this month");
      return new Response(
        JSON.stringify({
          message: `All invoices already generated for ${monthName}`,
          invoicesCreated: 0,
          month: monthName,
        }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    log(`Creating invoices for ${leasesToInvoice.length} leases`);

    const invoicesToCreate = leasesToInvoice.map((lease) => ({
      invoice_number: "",
      lease_id: lease.id,
      tenant_id: lease.tenant_id,
      amount: lease.monthly_rent,
      description: `${monthName} Rent - ${lease.property} ${lease.unit}`,
      due_date: dueDateStr,
      status: "pending" as const,
      manager_id: (lease.tenants as unknown as { manager_id: string | null })?.manager_id || null,
    }));

    const { data: createdInvoices, error: insertError } = await supabase
      .from("invoices")
      .insert(invoicesToCreate)
      .select();

    if (insertError) {
      log("Error creating invoices", insertError);
      throw insertError;
    }

    const invoiceCount = createdInvoices?.length || 0;
    log(`Successfully created ${invoiceCount} invoices for ${monthName}`);

    createdInvoices?.forEach((inv) => {
      log(`Invoice created`, {
        invoice_number: inv.invoice_number,
        tenant_id: inv.tenant_id,
        amount: inv.amount,
        due_date: inv.due_date,
      });
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully generated ${invoiceCount} invoices for ${monthName}`,
        invoicesCreated: invoiceCount,
        month: monthName,
        dueDate: dueDateStr,
        invoices: createdInvoices?.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          amount: inv.amount,
        })),
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log("Error in auto-generate-invoices", { error: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
