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
  /** VES-27 — the platform's cut and what the supplier receives (`null` percent before Connect). */
  platformFeePercent: number | null;
  platformFeeAmount: number;
  netAmount: number;
}

/** The order's payment state, or `null` when nobody tried to pay it yet (RLS-scoped). */
export async function getSupplyOrderPayment(orderId: string): Promise<SupplyOrderPayment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supply_order_payments")
    .select(
      "status, amount, paid_at, refunded_amount, refunded_at, refund_reason, platform_fee_percent, platform_fee_amount, net_amount, created_at",
    )
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
    platformFeePercent: p.platform_fee_percent === null ? null : Number(p.platform_fee_percent),
    platformFeeAmount: Number(p.platform_fee_amount),
    netAmount: Number(p.net_amount),
  };
}

export interface FactoryPayoutAccount {
  /** `null` until the factory starts the Stripe onboarding. */
  stripeAccountId: string | null;
  transfersStatus: string;
  /** The platform's commission on each paid order (BR-COM-01). */
  platformFeePercent: number;
}

/** The active factory's payout account and commission (VES-27). RLS: its own members only. */
export async function getFactoryPayoutAccount(orgId: string): Promise<FactoryPayoutAccount> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("factory_payment_accounts")
    .select("stripe_account_id, transfers_status, platform_fee_percent")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  return {
    stripeAccountId: data?.stripe_account_id ?? null,
    transfersStatus: data?.transfers_status ?? "pending",
    platformFeePercent: data ? Number(data.platform_fee_percent) : DEFAULT_PLATFORM_FEE_PERCENT,
  };
}

/** Mirrors the column default in migration 0037. */
const DEFAULT_PLATFORM_FEE_PERCENT = 10;
