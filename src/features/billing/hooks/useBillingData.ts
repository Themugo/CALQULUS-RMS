/**
 * useBillingData.ts
 *
 * Replaces the manual useState/useEffect/fetchInvoices/fetchLeases/fetchTenants
 * pattern in Billing.tsx with proper React Query hooks.
 *
 * Benefits over the old approach:
 *   - Automatic background refetch when the window regains focus
 *   - Request deduplication: multiple components calling useBillingData()
 *     share a single in-flight request instead of firing N queries
 *   - Typed responses via Database["public"]["Tables"] — no more `as any`
 *   - invalidateQueries after mutations keeps data fresh without manual
 *     fetchInvoices() calls scattered through handlers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { logError } from "@/shared/lib/errorLogger";
import type { Database } from "@/integrations/supabase/types";

// ── Typed row aliases ────────────────────────────────────────────────────────

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type LeaseRow   = Database["public"]["Tables"]["leases"]["Row"];
type TenantRow  = Database["public"]["Tables"]["tenants"]["Row"];
type ExpenditureRow = Database["public"]["Tables"]["expenditures"]["Row"];

// ── Shape returned to the page component ────────────────────────────────────

export interface BillingInvoice extends InvoiceRow {
  leases: { property: string; unit: string } | null;
  tenants: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    photo_url: string | null;
  } | null;
}

export interface BillingLease extends LeaseRow {
  tenants: {
    id: string;
    name: string;
    email: string;
    photo_url: string | null;
  } | null;
}

export type BillingTenant = Pick<
  TenantRow,
  "id" | "name" | "email" | "phone" | "photo_url" | "property" | "unit" | "monthly_rent"
>;

export type BillingExpenditure = ExpenditureRow;

// ── Query keys — centralised so invalidation is consistent ──────────────────

export const billingKeys = {
  invoices:     ["billing", "invoices"]     as const,
  leases:       ["billing", "leases"]       as const,
  tenants:      (managerId: string) => ["billing", "tenants", managerId] as const,
  expenditures: (managerId: string, month: string) =>
                  ["billing", "expenditures", managerId, month] as const,
};

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchInvoices(managerId: string): Promise<BillingInvoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      *,
      leases ( property, unit ),
      tenants ( id, name, email, phone, photo_url )
    `)
    .eq("manager_id", managerId)
    .order("created_at", { ascending: false });

  if (error) {
    logError("billing.fetchInvoices", error);
    throw error;
  }
  return (data ?? []) as BillingInvoice[];
}

async function fetchLeases(managerId: string): Promise<BillingLease[]> {
  const { data, error } = await supabase
    .from("leases")
    .select(`
      id, property, unit, monthly_rent, tenant_id,
      tenants ( id, name, email, photo_url )
    `)
    .eq("manager_id", managerId)
    .eq("status", "active")
    .order("property");

  if (error) {
    logError("billing.fetchLeases", error);
    throw error;
  }
  return (data ?? []) as BillingLease[];
}

async function fetchTenants(managerId: string): Promise<BillingTenant[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select("id, name, email, phone, photo_url, property, unit, monthly_rent")
    .eq("manager_id", managerId)
    .eq("status", "active")
    .order("name");

  if (error) {
    logError("billing.fetchTenants", error);
    throw error;
  }
  return (data ?? []) as BillingTenant[];
}

async function fetchExpenditures(
  managerId: string,
  month: string,  // YYYY-MM
): Promise<BillingExpenditure[]> {
  const monthDate = `${month}-01`;
  const { data, error } = await supabase
    .from("expenditures")
    .select("*")
    .eq("manager_id", managerId)
    .eq("month", monthDate)
    .order("category");

  if (error) {
    logError("billing.fetchExpenditures", error);
    throw error;
  }
  return (data ?? []) as BillingExpenditure[];
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useBillingData(selectedMonth: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invoicesQuery = useQuery({
    queryKey: billingKeys.invoices,
    queryFn: () => fetchInvoices(user!.id),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // treat as fresh for 2 min
  });

  const leasesQuery = useQuery({
    queryKey: billingKeys.leases,
    queryFn: () => fetchLeases(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const tenantsQuery = useQuery({
    queryKey: billingKeys.tenants(user?.id ?? ""),
    queryFn: () => fetchTenants(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const expendituresQuery = useQuery({
    queryKey: billingKeys.expenditures(user?.id ?? "", selectedMonth),
    queryFn: () => fetchExpenditures(user!.id, selectedMonth),
    enabled: !!user?.id,
  });

  /** Call after any mutation that changes invoices to get fresh data. */
  const invalidateInvoices = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: billingKeys.invoices });
  }, [queryClient]);

  /** Call after saving an expenditure. */
  const invalidateExpenditures = useCallback(() => {
    if (!user?.id) return;
    queryClient.invalidateQueries({
      queryKey: billingKeys.expenditures(user.id, selectedMonth),
    });
  }, [queryClient, user?.id, selectedMonth]);

  return {
    // Data
    invoices:     invoicesQuery.data     ?? [],
    leases:       leasesQuery.data       ?? [],
    tenants:      tenantsQuery.data      ?? [],
    expenditures: expendituresQuery.data ?? [],

    // Loading / error states
    isLoading: invoicesQuery.isLoading || leasesQuery.isLoading,
    isExpendituresLoading: expendituresQuery.isLoading,

    // Invalidators (replaces bare fetchInvoices() calls in handlers)
    invalidateInvoices,
    invalidateExpenditures,
  };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Mark an invoice as paid and trigger auto-send receipt. */
export function useMarkInvoicePaid() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
    }: {
      invoiceId: string;
    }) => {
      const paidDate = new Date().toISOString().split("T")[0];
      const { error } = await supabase
        .from("invoices")
        .update({ status: "paid", paid_date: paidDate })
        .eq("id", invoiceId);

      if (error) throw error;

      // Fire-and-forget: auto-send receipt
      if (user) {
        supabase.functions
          .invoke("auto-send-receipt", { body: { invoiceId, managerId: user.id } })
          .catch(() => {/* silent – auto-send is best-effort */});
      }

      return { invoiceId, paidDate };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices });
    },
  });
}

/** Update invoice amount, due_date, description. */
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      amount,
      due_date,
      description,
    }: {
      id: string;
      amount: number;
      due_date: string;
      description: string | null;
    }) => {
      const { error } = await supabase
        .from("invoices")
        .update({ amount, due_date, description, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices });
    },
  });
}

/** Upsert a single expenditure category for the given month. */
export function useSaveExpenditure() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      category,
      amount,
      month,           // YYYY-MM
      existingId,
      label,
    }: {
      category: string;
      amount: number;
      month: string;
      existingId: string | undefined;
      label: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const monthDate = `${month}-01`;

      if (existingId) {
        const { error } = await supabase
          .from("expenditures")
          .update({ amount, updated_at: new Date().toISOString() })
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("expenditures")
          .insert({
            manager_id: user.id,
            category,
            amount,
            month: monthDate,
            description: label,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      if (!user?.id) return;
      queryClient.invalidateQueries({
        queryKey: billingKeys.expenditures(user.id, variables.month),
      });
    },
  });
}
