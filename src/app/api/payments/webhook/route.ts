import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { InvalidWebhookError, parseWebhook } from "@/features/payments/provider/stripe";
import { applyPaymentStatus } from "@/features/payments/sync";

/**
 * Stripe webhook (RF-PAY-002). Public route — Stripe has no session — so the
 * `Stripe-Signature` header is the only proof the event is genuine. A 5xx makes
 * Stripe retry; events we don't act on are acknowledged with 200.
 */
export async function POST(request: NextRequest) {
  const { STRIPE_WEBHOOK_SECRET } = getServerEnv();
  if (!STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  let update: ReturnType<typeof parseWebhook>;
  try {
    update = parseWebhook(
      await request.text(),
      request.headers.get("stripe-signature"),
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    if (err instanceof InvalidWebhookError) {
      return NextResponse.json({ error: "invalid signature" }, { status: 400 });
    }
    throw err;
  }
  if (!update) return NextResponse.json({ received: true });

  try {
    const status = await applyPaymentStatus(update);
    return NextResponse.json({ received: true, status });
  } catch (err) {
    // A checkout this app never registered (another integration on the same
    // Stripe account): nothing to update, and retrying won't change that.
    if ((err as { code?: string }).code === "P0002") {
      return NextResponse.json({ received: true, ignored: true });
    }
    console.error("[payments] webhook failed", err);
    return NextResponse.json({ error: "could not apply the event" }, { status: 500 });
  }
}
