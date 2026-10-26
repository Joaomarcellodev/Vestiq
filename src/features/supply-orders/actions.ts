"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rpcErrorMessage } from "@/lib/supabase/errors";
import { requireActiveOrganization } from "@/features/organizations/queries";
import {
  advanceSupplyOrderSchema,
  cancelSupplyOrderSchema,
  parseJsonArray,
  placeSupplyOrderSchema,
  receiveSupplyOrderSchema,
  respondSupplyOrderSchema,
} from "./validation";

export type ActionState = { error?: string };

function revalidateOrders(orderId: string) {
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${orderId}`);
}

export async function placeSupplyOrder(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireActiveOrganization();
  if (org.type !== "RESELLER") return { error: "Somente revendedoras fazem pedidos" };

  const parsed = placeSupplyOrderSchema.safeParse({
    supplierId: formData.get("supplierId"),
    items: parseJsonArray(formData.get("items")),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_supply_order", {
    p_reseller_id: org.id,
    p_supplier_id: parsed.data.supplierId,
    p_items: parsed.data.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
    p_note: parsed.data.note || undefined,
  });
  if (error) return { error: rpcErrorMessage(error) };

  revalidateOrders(data.id);
  redirect(`/pedidos/${data.id}?toast=supply-order-placed`);
}

export async function respondSupplyOrder(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActiveOrganization();
  const parsed = respondSupplyOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_supply_order", {
    p_order_id: parsed.data.orderId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note || undefined,
  });
  if (error) return { error: rpcErrorMessage(error) };

  revalidateOrders(parsed.data.orderId);
  const toast =
    parsed.data.decision === "confirm" ? "supply-order-confirmed" : "supply-order-rejected";
  redirect(`/pedidos/${parsed.data.orderId}?toast=${toast}`);
}

export async function cancelSupplyOrder(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActiveOrganization();
  const parsed = cancelSupplyOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_supply_order", {
    p_order_id: parsed.data.orderId,
    p_reason: parsed.data.reason || undefined,
  });
  if (error) return { error: rpcErrorMessage(error) };

  revalidateOrders(parsed.data.orderId);
  redirect(`/pedidos/${parsed.data.orderId}?toast=supply-order-cancelled`);
}

/** VES-32 — the factory starts production or ships (with an optional tracking code). */
export async function advanceSupplyOrder(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActiveOrganization();
  const parsed = advanceSupplyOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    stage: formData.get("stage"),
    trackingCode: formData.get("trackingCode") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("advance_supply_order", {
    p_order_id: parsed.data.orderId,
    p_stage: parsed.data.stage,
    p_tracking_code: parsed.data.trackingCode || undefined,
  });
  if (error) return { error: rpcErrorMessage(error) };

  revalidateOrders(parsed.data.orderId);
  const toast =
    parsed.data.stage === "IN_PRODUCTION" ? "supply-order-in-production" : "supply-order-shipped";
  redirect(`/pedidos/${parsed.data.orderId}?toast=${toast}`);
}

/** VES-32 — the reseller marks a shipped order received; its pieces enter her stock. */
export async function receiveSupplyOrder(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActiveOrganization();
  const parsed = receiveSupplyOrderSchema.safeParse({ orderId: formData.get("orderId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("receive_supply_order", {
    p_order_id: parsed.data.orderId,
  });
  if (error) return { error: rpcErrorMessage(error) };

  revalidateOrders(parsed.data.orderId);
  revalidatePath("/produtos");
  redirect(`/pedidos/${parsed.data.orderId}?toast=supply-order-received`);
}
