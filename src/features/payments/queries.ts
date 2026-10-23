import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus } from "./status";

export interface SupplyOrderPayment {
  /** The settled checkout's status (`PAID`/`REFUNDED`), else the latest attempt's. */
  status: PaymentStatus;
  amount: number;
  paidAt: string | null;
  /** Refunded so far — the whole amount once `REFUNDED`, less for a partial refund. */
  refundedAmount: number;
  refundedAt: string | null;
  refundReason: string | null;
}

/** The order's payment state, or `null` when nobody tried to pay it yet (RLS-scoped). */
export async function getSupplyOrderPayment(orderId: string): Promise<SupplyOrderPayment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supply_order_payments")
    .select("status, amount, paid_at, refunded_amount, refunded_at, refund_reason, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data?.length) return null;

  const p = data.find((row) => row.status === "PAID" || row.status === "REFUNDED") ?? data[0]!;
  return {
    status: p.status,
    amount: Number(p.amount),
    paidAt: p.paid_at,
    refundedAmount: Number(p.refunded_amount),
    refundedAt: p.refunded_at,
    refundReason: p.refund_reason,
  };
}
