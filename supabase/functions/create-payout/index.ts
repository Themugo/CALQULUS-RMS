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

    const { landlordId, amount, method, bankAccount, mpesaPhone, reference, managerId } = await req.json();

    if (!landlordId || !amount || !method) {
      return new Response(JSON.stringify({ error: "landlordId, amount, and method are required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Verify sufficient wallet balance
    const { data: wallet } = await supabase
      .from("landlord_wallets")
      .select("balance")
      .eq("landlord_id", landlordId)
      .single();

    const currentBalance = Number(wallet?.balance || 0);
    if (currentBalance < Number(amount)) {
      return new Response(JSON.stringify({ error: "Insufficient wallet balance" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Create payout record
    const { data: payout, error } = await supabase
      .from("payouts")
      .insert({
        landlord_id: landlordId,
        manager_id: managerId || null,
        amount: Number(amount),
        method,
        bank_account: bankAccount || null,
        mpesa_phone: mpesaPhone || null,
        reference: reference || null,
        status: "pending",
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Deduct from wallet
    await supabase
      .from("landlord_wallets")
      .update({ balance: currentBalance - Number(amount) })
      .eq("landlord_id", landlordId);

    // Log wallet transaction
    await supabase.from("wallet_transactions").insert({
      landlord_id: landlordId,
      type: "debit",
      amount: Number(amount),
      description: `Withdrawal via ${method}`,
      reference: payout.id,
      balance_after: currentBalance - Number(amount),
    });

    return new Response(JSON.stringify({ success: true, payout }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
