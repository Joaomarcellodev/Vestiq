"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "@/lib/zod";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { rpcErrorMessage } from "@/lib/supabase/errors";
import { getCurrentUser } from "@/features/auth/queries";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { isAccepted, orderCode } from "@/features/supply-orders/state";
import {
  createCheckout,
  expireCheckout,
  getCheckout,
  getRecipientStatus,
  paymentsConfigured,
  refundPayment,
} from "./provider/stripe";
import { applyAccountStatus, applyPaymentStatus, applyRefund } from "./sync";

export type ActionState = { error?: string };

const PAYMENTS_UNAVAILABLE = "Os pagamentos estão indisponíveis no momento.";
const CHECKOUT_FAILED = "Não foi possível abrir o pagamento. Tente novamente.";
const REFUND_FAILED = "Não foi possível reembolsar o pagamento. Tente novamente.";
const SUPPLIER_NOT_READY = "O fornecedor ainda não pode receber pagamentos pelo Vestiq";

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
  if (!isAccepted(order.status)) {
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

  const destination = await readyDestination(orderId);
  if ("error" in destination) return destination;

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
      transfer: { destination: destination.accountId, platformFee: destination.platformFee },
    });
  } catch (err) {
    console.error("[payments] createCheckout failed", err);
    return { error: CHECKOUT_FAILED };
  }

  const { error: rpcError } = await supabase.rpc("register_supply_order_payment", {
    p_order_id: orderId,
    p_checkout_session_id: checkout.id,
    p_amount: Number(order.total_amount),
    p_platform_fee_amount: destination.platformFee,
    p_destination_account_id: destination.accountId,
  });
  if (rpcError) {
    // Nobody can pay a checkout the database doesn't know about.
    await expireCheckout(checkout.id).catch(() => {});
    return { error: rpcErrorMessage(rpcError) };
  }

  redirect(checkout.url);
}

/**
 * VES-27 — the supplier's connected account and the platform's cut for this
 * order. The account's ability to receive is re-read from Stripe before every
 * payment (it can lose it at any time), and the database copy kept in step.
 */
async function readyDestination(
  orderId: string,
): Promise<{ accountId: string; platformFee: number } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("quote_supply_order_payment", { p_order_id: orderId })
    .single();
  if (error) return { error: rpcErrorMessage(error) };
  if (!data.destination_account_id) return { error: SUPPLIER_NOT_READY };

  let status: Awaited<ReturnType<typeof getRecipientStatus>>;
  try {
    status = await getRecipientStatus(data.destination_account_id);
  } catch (err) {
    console.error("[payments] getRecipientStatus failed", err);
    return { error: CHECKOUT_FAILED };
  }
  if (status !== data.destination_status) {
    await applyAccountStatus(data.destination_account_id, status);
  }
  if (status !== "active") return { error: SUPPLIER_NOT_READY };
  return { accountId: data.destination_account_id, platformFee: Number(data.platform_fee_amount) };
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

const refundSchema = z.object({
  orderId: z.string().uuid("Pedido não encontrado"),
  reason: z.string().trim().max(500, "O motivo pode ter até 500 caracteres").optional(),
  confirm: z.literal("on", { errorMap: () => ({ message: "Confirme o reembolso" }) }),
});

/**
 * RF-PAY-004 — the supplier refunds what is left of a paid order to the
 * reseller's card. The database authorizes it first (BR-PAY-08); the refund is
 * recorded from Stripe's refunded total, and the webhook confirms it.
 */
export async function refundSupplyOrderPayment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActiveOrganization();
  const parsed = refundSchema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason") ?? undefined,
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { orderId, reason } = parsed.data;

  const supabase = await createClient();
  const { data: payment, error } = await supabase.rpc("authorize_supply_order_refund", {
    p_order_id: orderId,
    p_reason: reason || undefined,
  });
  if (error) return { error: rpcErrorMessage(error) };
  if (!paymentsConfigured()) return { error: PAYMENTS_UNAVAILABLE };

  let refunded: Awaited<ReturnType<typeof refundPayment>>;
  try {
    refunded = await refundPayment({
      paymentIntentId: payment.payment_intent_id!,
      orderId,
      idempotencyKey: `vestiq-refund-${payment.id}`,
      destinationCharge: payment.destination_account_id !== null,
    });
  } catch (err) {
    console.error("[payments] refundPayment failed", err);
    return { error: REFUND_FAILED };
  }

  const user = await getCurrentUser();
  try {
    await applyRefund({ ...refunded, refundedBy: user?.id, reason });
  } catch (err) {
    // Stripe already refunded: the `charge.refunded` webhook records it.
    console.error("[payments] applyRefund failed", err);
  }

  revalidatePath(`/pedidos/${orderId}`);
  redirect(`/pedidos/${orderId}?toast=supply-order-refunded`);
}
