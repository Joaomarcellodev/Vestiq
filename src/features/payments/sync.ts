import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCheckout,
  getRecipientStatus,
  type CheckoutUpdate,
  type RefundUpdate,
  type TransfersStatus,
} from "./provider/stripe";
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
 * Records a charge's refunded total read from Stripe (RF-PAY-004). Same
 * service-role reasoning as above; never lowers the amount already recorded.
 */
export async function applyRefund(
  update: RefundUpdate & { refundedBy?: string; reason?: string },
): Promise<PaymentStatus> {
  const { data, error } = await createAdminClient().rpc("apply_supply_order_payment_refund", {
    p_payment_intent_id: update.paymentIntentId,
    p_amount_refunded: update.amountRefunded,
    p_refunded_by: update.refundedBy,
    p_reason: update.reason,
  });
  if (error) throw error;
  return data.status;
}

/**
 * Records whether a supplier's connected account can receive, as just read
 * from Stripe (VES-27). Service role: the factory can't mark itself ready.
 */
export async function applyAccountStatus(
  stripeAccountId: string,
  status: TransfersStatus,
): Promise<void> {
  const { error } = await createAdminClient().rpc("set_factory_payment_account_status", {
    p_stripe_account_id: stripeAccountId,
    p_transfers_status: status,
  });
  if (error) throw error;
}

/** Links a factory to the connected account just created for it on Stripe (VES-27). */
export async function linkPayoutAccount(
  organizationId: string,
  stripeAccountId: string,
  status: TransfersStatus,
): Promise<void> {
  const { error } = await createAdminClient().rpc("link_factory_payment_account", {
    p_organization_id: organizationId,
    p_stripe_account_id: stripeAccountId,
    p_transfers_status: status,
  });
  if (error) throw error;
}

/** Back from the Stripe onboarding, reads whether the factory's account can receive now. */
export async function syncPayoutAccount(stripeAccountId: string): Promise<TransfersStatus> {
  const status = await getRecipientStatus(stripeAccountId);
  await applyAccountStatus(stripeAccountId, status);
  return status;
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
