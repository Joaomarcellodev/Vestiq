import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCheckout, type CheckoutUpdate } from "./provider/stripe";
import type { PaymentStatus } from "./status";

/**
 * Records a status read from Stripe itself — a signed webhook event or our own
 * API read of the session. Service role: `apply_supply_order_payment_status`
 * is granted to nobody else, so a signed-in user can't mark an order paid.
 * Idempotent (RF-PAY-002).
 */
export async function applyPaymentStatus(update: CheckoutUpdate): Promise<PaymentStatus> {
  const { data, error } = await createAdminClient().rpc("apply_supply_order_payment_status", {
    p_checkout_session_id: update.checkoutSessionId,
    p_status: update.status,
    p_amount: update.amount ?? undefined,
    p_payment_intent_id: update.paymentIntentId ?? undefined,
  });
  if (error) throw error;
  return data.status;
}

/**
 * Back from the checkout, reads the session from Stripe and records its
 * outcome, so the order shows as paid even before (or without) the webhook —
 * e.g. in local development. Returns the recorded status, or `null` when the
 * session is still open, unknown, or belongs to another order.
 */
export async function syncCheckout(
  orderId: string,
  checkoutSessionId: string,
): Promise<PaymentStatus | null> {
  const checkout = await getCheckout(checkoutSessionId);
  if (checkout.orderId !== orderId || !checkout.outcome) return null;
  return applyPaymentStatus({
    checkoutSessionId: checkout.id,
    status: checkout.outcome,
    amount: checkout.amount,
    paymentIntentId: checkout.paymentIntentId,
  });
}
