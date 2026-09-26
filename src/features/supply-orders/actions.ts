"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import {
  cancelSupplyOrderSchema,
  parseJsonArray,
  placeSupplyOrderSchema,
  respondSupplyOrderSchema,
} from "./validation";

export type ActionState = { error?: string };

/** Database errors are already in Portuguese; only the auth ones need a friendly text. */
function friendly(message: string): string {
  if (/not authorized|not authenticated|permission denied/i.test(message)) {
    return "Você não tem permissão para esta ação";
  }
  return message;
}

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
  if (error) return { error: friendly(error.message) };

  revalidateOrders(data.id);
  redirect(`/pedidos/${data.id}?toast=supply-order-placed`);
}

export async function respondSupplyOrder(formData: FormData): Promise<void> {
  await requireActiveOrganization();
  const parsed = respondSupplyOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_supply_order", {
    p_order_id: parsed.data.orderId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note || undefined,
  });
  if (error) throw new Error(friendly(error.message));

  revalidateOrders(parsed.data.orderId);
  const toast =
    parsed.data.decision === "confirm" ? "supply-order-confirmed" : "supply-order-rejected";
  redirect(`/pedidos/${parsed.data.orderId}?toast=${toast}`);
}

export async function cancelSupplyOrder(formData: FormData): Promise<void> {
  await requireActiveOrganization();
  const parsed = cancelSupplyOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_supply_order", {
    p_order_id: parsed.data.orderId,
    p_reason: parsed.data.reason || undefined,
  });
  if (error) throw new Error(friendly(error.message));

  revalidateOrders(parsed.data.orderId);
  redirect(`/pedidos/${parsed.data.orderId}?toast=supply-order-cancelled`);
}
