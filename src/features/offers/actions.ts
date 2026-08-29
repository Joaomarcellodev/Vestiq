"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { cancelOfferSchema, publishOfferSchema } from "./validation";

export type ActionState = { error?: string };

export async function publishOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireActiveOrganization();
  const parsed = publishOfferSchema.safeParse({
    variantId: formData.get("variantId"),
    networkId: formData.get("networkId"),
    quantity: formData.get("quantity"),
    transferPrice: formData.get("transferPrice"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_offer", {
    p_variant_id: parsed.data.variantId,
    p_network_id: parsed.data.networkId,
    p_quantity: parsed.data.quantity,
    p_transfer_price: parsed.data.transferPrice,
    p_note: parsed.data.note || undefined,
  });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  revalidatePath("/rede");
  redirect("/rede?toast=offer-published");
}

export async function cancelOffer(formData: FormData): Promise<void> {
  await requireActiveOrganization();
  const parsed = cancelOfferSchema.safeParse({ offerId: formData.get("offerId") });
  if (!parsed.success) throw new Error("Oferta inválida");

  const supabase = await createClient();
  const { error } = await supabase
    .from("offers")
    .update({ status: "CANCELLED" })
    .eq("id", parsed.data.offerId)
    .in("status", ["ACTIVE", "PARTIALLY_NEGOTIATED"]);
  if (error) throw new Error(error.message);

  revalidatePath("/rede");
  redirect("/rede?toast=offer-cancelled");
}
