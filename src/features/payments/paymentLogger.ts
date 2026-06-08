import { supabase } from "@/integrations/supabase/client";

export const paymentLogger = {
  async logPayment(data: {
    invoiceId: string;
    tenantId: string;
    landlordId: string;
    amount: number;
    method: string;
    transactionCode: string;
    phone: string;
  }) {
    // 1. Save payment
    const { data: payment } = await supabase
      .from("payment_logs")
      .insert({
        invoice_id: data.invoiceId,
        tenant_id: data.tenantId,
        landlord_id: data.landlordId,
        amount: data.amount,
        method: data.method,
        transaction_code: data.transactionCode,
        phone_number: data.phone,
        status: "pending",
      })
      .select()
      .single();

    return payment;
  },

  async markVerified(paymentId: string) {
    await supabase
      .from("payment_logs")
      .update({ status: "verified" })
      .eq("id", paymentId);

    return true;
  },
};