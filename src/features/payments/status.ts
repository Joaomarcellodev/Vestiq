import type { Database } from "@/types/database";

/** Payment lifecycle (SPEC-014). Mirrors `apply_supply_order_payment_status`. */

export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

/**
 * The fields of a Stripe Checkout Session the status depends on. Plain strings:
 * Stripe may add values, which are treated as "not final yet".
 */
export interface CheckoutSessionLike {
  status: string | null; // "open" | "complete" | "expired"
  payment_status: string; // "paid" | "unpaid" | "no_payment_required"
}

/**
 * The final status a checkout session reached, or `null` while it is still
 * open or its payment is still processing.
 */
export function sessionOutcome(session: CheckoutSessionLike): PaymentStatus | null {
  if (session.status === "expired") return "EXPIRED";
  if (session.status === "complete" && session.payment_status === "paid") return "PAID";
  return null;
}

/** Checkout events the webhook acts on (BR-PAY-05); any other type is ignored. */
export const CHECKOUT_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
] as const;

export type CheckoutEventType = (typeof CHECKOUT_EVENTS)[number];

/** Sent for every refund on a charge, from the Vestiq or from the Stripe Dashboard. */
export const REFUND_EVENT = "charge.refunded";

export function isCheckoutEvent(type: string): type is CheckoutEventType {
  return (CHECKOUT_EVENTS as readonly string[]).includes(type);
}

/** The status a checkout event moves the payment to, or `null` to wait for the next one. */
export function eventOutcome(
  type: CheckoutEventType,
  session: CheckoutSessionLike,
): PaymentStatus | null {
  switch (type) {
    case "checkout.session.async_payment_succeeded":
      return "PAID";
    case "checkout.session.async_payment_failed":
      return "FAILED";
    case "checkout.session.expired":
      return "EXPIRED";
    case "checkout.session.completed":
      // A delayed method completes the session unpaid; its async event follows.
      return sessionOutcome(session);
  }
}

/** BRL amount → Stripe's smallest unit (centavos). */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Stripe's smallest unit (centavos) → BRL amount. */
export function fromCents(cents: number): number {
  return cents / 100;
}
