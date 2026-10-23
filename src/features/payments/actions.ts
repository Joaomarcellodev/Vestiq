"use server";

import { redirect } from "next/navigation";
import { z } from "@/lib/zod";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { rpcErrorMessage } from "@/lib/supabase/errors";
import { getCurrentUser } from "@/features/auth/queries";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { orderCode } from "@/features/supply-orders/state";
import { createCheckout, expireCheckout, getCheckout, paymentsConfigured } from "./provider/stripe";
import { applyPaymentStatus } from "./sync";

export type ActionState = { error?: string };

const PAYMENTS_UNAVAILABLE = "Os pagamentos estão indisponíveis no momento.";
const CHECKOUT_FAILED = "Não foi possível abrir o pagamento. Tente novamente.";

/**
 * RF-PAY-001 — sends the reseller to the Stripe checkout to pay a confirmed
 * supply order by card, in full. A checkout still open for the order is
 * reused instead of opening a second one (BR-PAY-03).
 */
export async function payOrderWithCard(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireActiveOrganization();
  const parsed = z.string().uuid().safeParse(formData.get("orderId"));
  if (!parsed.success) return { error: "Pedido não encontrado" };
  const orderId = parsed.data;

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("supply_orders")
    .select(
      "id, status, reseller_id, total_amount, supplier:organizations!supply_orders_supplier_id_fkey(name)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) return { error: rpcErrorMessage(error) };
  if (!order) return { error: "Pedido não encontrado" };
  if (order.reseller_id !== org.id) return { error: "Somente a revendedora do pedido pode pagar" };
  if (order.status !== "CONFIRMED") {
    return { error: "Só é possível pagar um pedido confirmado pelo fornecedor" };
  }
  if (!paymentsConfigured()) return { error: PAYMENTS_UNAVAILABLE };

  const orderPage = `${publicEnv.NEXT_PUBLIC_SITE_URL}/pedidos/${orderId}`;

  const { data: pending } = await supabase
    .from("supply_order_payments")
    .select("checkout_session_id")
    .eq("order_id", orderId)
    .eq("status", "PENDING")
    .maybeSingle();
  if (pending) {
    let resumed: Awaited<ReturnType<typeof resumeCheckout>>;
    try {
      resumed = await resumeCheckout(pending.checkout_session_id);
    } catch (err) {
      console.error("[payments] resumeCheckout failed", err);
      return { error: CHECKOUT_FAILED };
    }
    if (resumed === "paid") redirect(`/pedidos/${orderId}?toast=supply-order-paid`);
    if (resumed) redirect(resumed);
  }

  const user = await getCurrentUser();
  let checkout: Awaited<ReturnType<typeof createCheckout>>;
  try {
    checkout = await createCheckout({
      orderId,
      description: `Pedido ${orderCode(orderId)} · ${order.supplier?.name ?? "Fornecedor"}`,
      amount: Number(order.total_amount),
      customerEmail: user?.email,
      successUrl: `${orderPage}?checkout={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${orderPage}?toast=supply-order-payment-cancelled`,
    });
  } catch (err) {
    console.error("[payments] createCheckout failed", err);
    return { error: CHECKOUT_FAILED };
  }

  const { error: rpcError } = await supabase.rpc("register_supply_order_payment", {
    p_order_id: orderId,
    p_checkout_session_id: checkout.id,
    p_amount: Number(order.total_amount),
  });
  if (rpcError) {
    // Nobody can pay a checkout the database doesn't know about.
    await expireCheckout(checkout.id).catch(() => {});
    return { error: rpcErrorMessage(rpcError) };
  }

  redirect(checkout.url);
}

/**
 * The open checkout's URL, `"paid"` if it was paid meanwhile, or `null` when
 * it is over (its final status is recorded, freeing the order for a new one).
 */
async function resumeCheckout(checkoutSessionId: string): Promise<string | "paid" | null> {
  const checkout = await getCheckout(checkoutSessionId);
  if (!checkout.outcome) {
    if (checkout.url) return checkout.url;
    // Processing with no page to go back to: let the webhook settle it.
    return null;
  }
  const status = await applyPaymentStatus({
    checkoutSessionId: checkout.id,
    status: checkout.outcome,
    amount: checkout.amount,
    paymentIntentId: checkout.paymentIntentId,
  });
  return status === "PAID" ? "paid" : null;
}
