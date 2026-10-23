import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus } from "./status";

export interface SupplyOrderPayment {
  /** `PAID` once any checkout was paid; otherwise the latest attempt's status. */
  status: PaymentStatus;
  amount: number;
  paidAt: string | null;
}

/** The order's payment state, or `null` when nobody tried to pay it yet (RLS-scoped). */
export async function getSupplyOrderPayment(orderId: string): Promise<SupplyOrderPayment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supply_order_payments")
    .select("status, amount, paid_at, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data?.length) return null;

  const p = data.find((row) => row.status === "PAID") ?? data[0]!;
  return { status: p.status, amount: Number(p.amount), paidAt: p.paid_at };
}
