/**
 * paymentAllocation.test.ts
 *
 * Tests the multi-invoice payment allocation logic used inside
 * `process-payment`. The Deno function can't be imported into Vitest
 * directly so we re-implement the allocation algorithm here under
 * test. The algorithm must stay identical to the one in
 * `supabase/functions/process-payment/index.ts`.
 *
 * Coverage:
 *   - Oldest-first allocation
 *   - Exact-fit payment
 *   - Partial-fit payment
 *   - Overpayment → advance credit
 *   - Multi-invoice spillover
 *   - Skips invoices with zero balance_due
 *   - Closure detection
 */

import { describe, it, expect } from "vitest";

// ── Types matching process-payment ────────────────────────────────────

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  original_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  due_date: string;
  status: "pending" | "overdue" | "paid";
}

interface Allocation {
  invoiceId: string;
  alloc: number;
  closes: boolean;
}

interface AllocationResult {
  allocations: Allocation[];
  closedInvoiceNumbers: string[];
  /** Money left over after all invoices are paid → goes to advance credit. */
  remaining: number;
  /** Total amount applied to invoices (i.e. amount - remaining). */
  applied: number;
}

// ── Algorithm under test (mirrors process-payment) ────────────────────

function allocatePayment(invoices: Invoice[], amount: number): AllocationResult {
  let remaining = amount;
  const allocations: Allocation[] = [];
  const closedInvoiceNumbers: string[] = [];

  // process-payment receives invoices already ordered by due_date asc.
  // We do NOT re-sort here so the test catches accidental re-ordering.
  for (const inv of invoices) {
    if (remaining <= 0) break;

    const owed = Number(
      inv.balance_due ?? (Number(inv.original_amount ?? inv.amount) - Number(inv.paid_amount ?? 0)),
    );
    if (owed <= 0) continue;

    const alloc = Math.min(remaining, owed);
    const closes = alloc >= owed;
    remaining -= alloc;

    allocations.push({ invoiceId: inv.id, alloc, closes });
    if (closes) closedInvoiceNumbers.push(inv.invoice_number);
  }

  return { allocations, closedInvoiceNumbers, remaining, applied: amount - remaining };
}

// ── Fixtures ──────────────────────────────────────────────────────────

const inv = (over: Partial<Invoice>): Invoice => ({
  id:             "inv-" + Math.random().toString(36).slice(2, 8),
  invoice_number: "INV-001",
  amount:         10_000,
  paid_amount:    0,
  balance_due:    10_000,
  due_date:       "2026-05-01",
  status:         "pending",
  ...over,
});

// ── Tests ─────────────────────────────────────────────────────────────

describe("allocatePayment — single invoice", () => {
  it("closes an invoice when payment exactly matches the balance", () => {
    const r = allocatePayment([inv({ balance_due: 5_000, invoice_number: "INV-A" })], 5_000);
    expect(r.allocations).toHaveLength(1);
    expect(r.allocations[0]).toMatchObject({ alloc: 5_000, closes: true });
    expect(r.closedInvoiceNumbers).toEqual(["INV-A"]);
    expect(r.remaining).toBe(0);
  });

  it("partial payment leaves invoice open", () => {
    const r = allocatePayment([inv({ balance_due: 5_000, invoice_number: "INV-A" })], 2_000);
    expect(r.allocations[0]).toMatchObject({ alloc: 2_000, closes: false });
    expect(r.closedInvoiceNumbers).toEqual([]);
    expect(r.remaining).toBe(0);
    expect(r.applied).toBe(2_000);
  });

  it("overpayment closes the invoice and reports remaining", () => {
    const r = allocatePayment([inv({ balance_due: 5_000, invoice_number: "INV-A" })], 8_000);
    expect(r.allocations[0]).toMatchObject({ alloc: 5_000, closes: true });
    expect(r.remaining).toBe(3_000); // becomes advance credit downstream
    expect(r.applied).toBe(5_000);
  });

  it("falls back to amount - paid_amount when balance_due is missing", () => {
    // Some legacy invoice rows have no balance_due column populated.
    const r = allocatePayment(
      [{ id: "1", invoice_number: "L-1", amount: 10_000, paid_amount: 3_000,
         balance_due: undefined as any, due_date: "2026-05-01", status: "pending" }],
      4_000,
    );
    expect(r.allocations[0].alloc).toBe(4_000);
    expect(r.allocations[0].closes).toBe(false);
  });

  it("skips fully-paid invoices (balance_due = 0)", () => {
    const r = allocatePayment([inv({ balance_due: 0, invoice_number: "DONE" })], 5_000);
    expect(r.allocations).toHaveLength(0);
    expect(r.remaining).toBe(5_000); // entire payment becomes credit
  });
});

describe("allocatePayment — multiple invoices", () => {
  it("pays oldest invoice first when payment covers only one", () => {
    const invoices = [
      inv({ id: "1", invoice_number: "INV-OLD",   balance_due: 5_000, due_date: "2026-04-01" }),
      inv({ id: "2", invoice_number: "INV-NEW",   balance_due: 5_000, due_date: "2026-05-01" }),
    ];
    const r = allocatePayment(invoices, 5_000);
    expect(r.closedInvoiceNumbers).toEqual(["INV-OLD"]);
    expect(r.allocations).toHaveLength(1);
  });

  it("spills over from older to newer invoice", () => {
    const invoices = [
      inv({ id: "1", invoice_number: "INV-OLD", balance_due: 5_000, due_date: "2026-04-01" }),
      inv({ id: "2", invoice_number: "INV-NEW", balance_due: 5_000, due_date: "2026-05-01" }),
    ];
    const r = allocatePayment(invoices, 7_500);
    expect(r.allocations).toEqual([
      { invoiceId: "1", alloc: 5_000, closes: true },
      { invoiceId: "2", alloc: 2_500, closes: false },
    ]);
    expect(r.closedInvoiceNumbers).toEqual(["INV-OLD"]);
    expect(r.remaining).toBe(0);
  });

  it("closes multiple invoices and reports them all", () => {
    const invoices = [
      inv({ id: "1", invoice_number: "INV-A", balance_due: 3_000 }),
      inv({ id: "2", invoice_number: "INV-B", balance_due: 4_000 }),
      inv({ id: "3", invoice_number: "INV-C", balance_due: 2_000 }),
    ];
    const r = allocatePayment(invoices, 9_000);
    expect(r.closedInvoiceNumbers).toEqual(["INV-A", "INV-B", "INV-C"]);
    expect(r.remaining).toBe(0);
  });

  it("closes some, leaves last partial, no credit", () => {
    const invoices = [
      inv({ id: "1", invoice_number: "INV-A", balance_due: 3_000 }),
      inv({ id: "2", invoice_number: "INV-B", balance_due: 4_000 }),
      inv({ id: "3", invoice_number: "INV-C", balance_due: 5_000 }),
    ];
    const r = allocatePayment(invoices, 10_000);
    expect(r.closedInvoiceNumbers).toEqual(["INV-A", "INV-B"]);
    expect(r.allocations[2]).toEqual({ invoiceId: "3", alloc: 3_000, closes: false });
    expect(r.remaining).toBe(0);
  });

  it("pays everything and leaves credit when payment exceeds total owed", () => {
    const invoices = [
      inv({ id: "1", invoice_number: "INV-A", balance_due: 3_000 }),
      inv({ id: "2", invoice_number: "INV-B", balance_due: 4_000 }),
    ];
    const r = allocatePayment(invoices, 10_000);
    expect(r.closedInvoiceNumbers).toEqual(["INV-A", "INV-B"]);
    expect(r.remaining).toBe(3_000);
    expect(r.applied).toBe(7_000);
  });

  it("invariant: applied + remaining always equals payment", () => {
    const invoices = [
      inv({ id: "1", balance_due: 1_234 }),
      inv({ id: "2", balance_due: 5_678 }),
      inv({ id: "3", balance_due: 9_012 }),
    ];
    for (const payment of [0, 1, 500, 1_234, 6_900, 15_924, 20_000]) {
      const r = allocatePayment(invoices, payment);
      expect(r.applied + r.remaining).toBe(payment);
    }
  });

  it("handles a payment of zero (no allocation, no credit)", () => {
    const invoices = [inv({ balance_due: 5_000 })];
    const r = allocatePayment(invoices, 0);
    expect(r.allocations).toEqual([]);
    expect(r.remaining).toBe(0);
    expect(r.applied).toBe(0);
  });
});

// ── Auto-send-receipt balance calculation (regression for the bug fix) ─

describe("auto-send-receipt outstandingBalance (fixed)", () => {
  /** Mirrors the corrected reducer in auto-send-receipt/index.ts. */
  function outstandingBalance(unpaid: Array<{
    amount?: number;
    paid_amount?: number;
    balance_due?: number;
    original_amount?: number;
  }>): number {
    return (unpaid || []).reduce((s, i) => {
      const bd = Number(i.balance_due ?? NaN);
      if (Number.isFinite(bd)) return s + Math.max(0, bd);
      const amt  = Number(i.original_amount ?? i.amount ?? 0);
      const paid = Number(i.paid_amount ?? 0);
      return s + Math.max(0, amt - paid);
    }, 0);
  }

  it("uses balance_due when present (regression — was summing amount)", () => {
    // Before the fix: would return 50_000 (sum of amount).
    // After the fix: returns 30_000 (sum of balance_due).
    expect(outstandingBalance([
      { amount: 50_000, paid_amount: 20_000, balance_due: 30_000 },
    ])).toBe(30_000);
  });

  it("falls back to amount - paid_amount when balance_due is missing", () => {
    expect(outstandingBalance([
      { amount: 50_000, paid_amount: 20_000 },
    ])).toBe(30_000);
  });

  it("falls back to original_amount - paid_amount", () => {
    expect(outstandingBalance([
      { original_amount: 50_000, paid_amount: 20_000 },
    ])).toBe(30_000);
  });

  it("clamps negative balances to zero (paid_amount > amount can happen with credit)", () => {
    expect(outstandingBalance([
      { amount: 5_000, paid_amount: 10_000 },
    ])).toBe(0);
  });

  it("sums across multiple invoices", () => {
    expect(outstandingBalance([
      { balance_due: 5_000 },
      { balance_due: 7_500 },
      { balance_due: 2_500 },
    ])).toBe(15_000);
  });

  it("returns 0 for an empty list", () => {
    expect(outstandingBalance([])).toBe(0);
  });
});
