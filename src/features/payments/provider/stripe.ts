import "server-only";

import Stripe from "stripe";
import { getServerEnv } from "@/lib/env";
import {
  eventOutcome,
  fromCents,
  isCheckoutEvent,
  REFUND_EVENT,
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

/** What a checkout event changes on a payment. */
export interface CheckoutUpdate {
  checkoutSessionId: string;
  status: PaymentStatus;
  amount: number | null;
  paymentIntentId: string | null;
}

/** A charge's refunded total, as Stripe reports it (RF-PAY-004). */
export interface RefundUpdate {
  paymentIntentId: string;
  /** Total refunded so far on the charge, in BRL — not this refund alone. */
  amountRefunded: number;
}

export type WebhookUpdate =
  ({ kind: "checkout" } & CheckoutUpdate) | ({ kind: "refund" } & RefundUpdate);

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
  /** Destination charge (VES-27): the supplier's connected account and the platform's cut. */
  transfer: { destination: string; platformFee: number };
}): Promise<Checkout & { url: string }> {
  const metadata = { supply_order_id: input.orderId };
  const fee = toCents(input.transfer.platformFee);
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
    payment_intent_data: {
      metadata,
      transfer_data: { destination: input.transfer.destination },
      ...(fee > 0 && { application_fee_amount: fee }),
    },
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

/**
 * Refunds what is left of a payment, in full (RF-PAY-004). The idempotency key
 * makes a double submit refund once. Returns the charge's refunded total.
 */
export async function refundPayment(input: {
  paymentIntentId: string;
  orderId: string;
  idempotencyKey: string;
  /** Destination charge: take the money back from the supplier and return the commission. */
  destinationCharge: boolean;
}): Promise<RefundUpdate> {
  const refund = await stripe().refunds.create(
    {
      payment_intent: input.paymentIntentId,
      reason: "requested_by_customer",
      metadata: { supply_order_id: input.orderId },
      ...(input.destinationCharge && { reverse_transfer: true, refund_application_fee: true }),
    },
    { idempotencyKey: input.idempotencyKey },
  );
  if (refund.status === "failed" || refund.status === "canceled") {
    throw new Error(`Stripe refund ${refund.id} ${refund.status}`);
  }
  const intent = await stripe().paymentIntents.retrieve(input.paymentIntentId, {
    expand: ["latest_charge"],
  });
  const charge = intent.latest_charge as Stripe.Charge | null;
  return {
    paymentIntentId: input.paymentIntentId,
    amountRefunded: fromCents(charge?.amount_refunded ?? refund.amount),
  };
}

// ---------------------------------------------------------------------------
// Connected accounts (VES-27) — Accounts v2, marketplace recipients
// ---------------------------------------------------------------------------

export type TransfersStatus = "active" | "pending" | "restricted" | "rejected" | "unsupported";

const TRANSFERS_STATUSES: readonly string[] = [
  "active",
  "pending",
  "restricted",
  "rejected",
  "unsupported",
];

function transfersStatus(account: Stripe.V2.Core.Account): TransfersStatus {
  const status =
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
  return status && TRANSFERS_STATUSES.includes(status) ? (status as TransfersStatus) : "pending";
}

/**
 * Creates the supplier's connected account: a Brazilian recipient that can
 * receive transfers from the platform, with the Express Dashboard. The platform
 * collects Stripe's fees and covers losses (marketplace with destination charges).
 * Stripe only grants `stripe_transfers` to a Brazilian account that also
 * requests `card_payments`, hence the merchant configuration.
 */
export async function createRecipientAccount(input: {
  organizationId: string;
  name: string;
  email?: string;
}): Promise<{ id: string; transfersStatus: TransfersStatus }> {
  const account = await stripe().v2.core.accounts.create(
    {
      display_name: input.name,
      contact_email: input.email,
      dashboard: "express",
      identity: { country: "br" },
      defaults: {
        responsibilities: { fees_collector: "application", losses_collector: "application" },
      },
      configuration: {
        merchant: { capabilities: { card_payments: { requested: true } } },
        recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
      },
      metadata: { organization_id: input.organizationId },
      include: ["configuration.recipient"],
    },
    // one account per factory, even on a double submit
    { idempotencyKey: `vestiq-recipient-${input.organizationId}` },
  );
  return { id: account.id, transfersStatus: transfersStatus(account) };
}

/** Whether the connected account can receive transfers now (checked before every payment). */
export async function getRecipientStatus(accountId: string): Promise<TransfersStatus> {
  const account = await stripe().v2.core.accounts.retrieve(accountId, {
    include: ["configuration.recipient"],
  });
  return transfersStatus(account);
}

/** Stripe-hosted onboarding for the connected account; the link is single-use and short-lived. */
export async function createOnboardingLink(input: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<string> {
  const link = await stripe().v2.core.accountLinks.create({
    account: input.accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        refresh_url: input.refreshUrl,
        return_url: input.returnUrl,
      },
    },
  });
  return link.url;
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
): WebhookUpdate | null {
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature ?? "", secret);
  } catch (err) {
    throw new InvalidWebhookError(err instanceof Error ? err.message : "invalid signature");
  }

  if (event.type === REFUND_EVENT) {
    const charge = event.data.object as Stripe.Charge;
    const pi = charge.payment_intent;
    const id = typeof pi === "string" ? pi : pi?.id;
    if (!id) return null;
    return {
      kind: "refund",
      paymentIntentId: id,
      amountRefunded: fromCents(charge.amount_refunded),
    };
  }
  if (!isCheckoutEvent(event.type)) return null;

  const session = event.data.object as Stripe.Checkout.Session;
  const status = eventOutcome(event.type, session);
  if (!status) return null;
  return {
    kind: "checkout",
    checkoutSessionId: session.id,
    status,
    amount: session.amount_total === null ? null : fromCents(session.amount_total),
    paymentIntentId: paymentIntentId(session),
  };
}
