import "server-only";

import Stripe from "stripe";
import { getServerEnv } from "@/lib/env";
import {
  eventOutcome,
  fromCents,
  isCheckoutEvent,
  sessionOutcome,
  toCents,
  type PaymentStatus,
} from "../status";

/**
 * The only module that talks to Stripe (ADR-0012). The rest of the app sees
 * `Checkout` and `CheckoutUpdate`, never the SDK's types, so a provider change
 * stays inside `src/features/payments/provider/`.
 */

export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super("STRIPE_SECRET_KEY is not configured — payments unavailable.");
  }
}

let client: Stripe | null = null;

function stripe(): Stripe {
  const { STRIPE_SECRET_KEY } = getServerEnv();
  if (!STRIPE_SECRET_KEY) throw new PaymentsNotConfiguredError();
  client ??= new Stripe(STRIPE_SECRET_KEY, { appInfo: { name: "Vestiq" } });
  return client;
}

export function paymentsConfigured(): boolean {
  return Boolean(getServerEnv().STRIPE_SECRET_KEY);
}

export interface Checkout {
  id: string;
  /** Hosted checkout page; `null` once the session is no longer open. */
  url: string | null;
  orderId: string | null;
  /** Final status reached, or `null` while open / processing. */
  outcome: PaymentStatus | null;
  amount: number | null;
  paymentIntentId: string | null;
}

/** What a webhook event changes on a payment. */
export interface CheckoutUpdate {
  checkoutSessionId: string;
  status: PaymentStatus;
  amount: number | null;
  paymentIntentId: string | null;
}

function toCheckout(session: Stripe.Checkout.Session): Checkout {
  return {
    id: session.id,
    url: session.url,
    orderId: session.metadata?.supply_order_id ?? null,
    outcome: sessionOutcome(session),
    amount: session.amount_total === null ? null : fromCents(session.amount_total),
    paymentIntentId: paymentIntentId(session),
  };
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  return typeof pi === "string" ? pi : (pi?.id ?? null);
}

// Stripe's minimum lifetime for a checkout session.
const CHECKOUT_TTL_SECONDS = 30 * 60;
// Tags our sessions in the Dashboard (the random suffix keeps the label unique).
const INTEGRATION_ID = "vestiq_supply_order_qkzmtrwa";

/** Opens a hosted, card-only, single-payment checkout for a supply order (RF-PAY-001). */
export async function createCheckout(input: {
  orderId: string;
  description: string;
  amount: number;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Checkout & { url: string }> {
  const metadata = { supply_order_id: input.orderId };
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    integration_identifier: INTEGRATION_ID,
    // VES-24 is card, paid in full. Pix on Stripe Brazil is invite-only.
    allowed_payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: toCents(input.amount),
          product_data: { name: input.description },
        },
      },
    ],
    client_reference_id: input.orderId,
    metadata,
    payment_intent_data: { metadata },
    customer_email: input.customerEmail,
    locale: "pt-BR",
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
  if (!session.url) throw new Error(`Stripe returned checkout ${session.id} without a URL`);
  return { ...toCheckout(session), url: session.url };
}

export async function getCheckout(id: string): Promise<Checkout> {
  return toCheckout(await stripe().checkout.sessions.retrieve(id));
}

/** Closes an open checkout so it can no longer be paid. */
export async function expireCheckout(id: string): Promise<void> {
  await stripe().checkout.sessions.expire(id);
}

export class InvalidWebhookError extends Error {}

/**
 * Verifies the `Stripe-Signature` header against the raw body and returns the
 * payment change it carries, or `null` for events the app doesn't act on.
 */
export function parseWebhook(
  rawBody: string,
  signature: string | null,
  secret: string,
): CheckoutUpdate | null {
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature ?? "", secret);
  } catch (err) {
    throw new InvalidWebhookError(err instanceof Error ? err.message : "invalid signature");
  }
  if (!isCheckoutEvent(event.type)) return null;

  const session = event.data.object as Stripe.Checkout.Session;
  const status = eventOutcome(event.type, session);
  if (!status) return null;
  return {
    checkoutSessionId: session.id,
    status,
    amount: session.amount_total === null ? null : fromCents(session.amount_total),
    paymentIntentId: paymentIntentId(session),
  };
}
