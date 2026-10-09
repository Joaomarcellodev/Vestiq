"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { keptImages, readImageFiles, removeImages, uploadImages } from "@/features/catalog/images";
import { PRODUCT_IMAGE_MAX_COUNT } from "@/features/catalog/validation";
import { cancelOfferSchema, offerPhotosSchema, publishOfferSchema } from "./validation";

export type ActionState = { error?: string };

export async function publishOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const org = await requireActiveOrganization();
  const parsed = publishOfferSchema.safeParse({
    variantId: formData.get("variantId"),
    networkId: formData.get("networkId"),
    quantity: formData.get("quantity"),
    transferPrice: formData.get("transferPrice"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();

  // AC-OFFER-008-01: photos go up first (the offer id doesn't exist yet) and
  // are removed again if publishing fails.
  const files = readImageFiles(formData, PRODUCT_IMAGE_MAX_COUNT);
  const uploaded = await uploadImages(supabase, `${org.id}/offers/${crypto.randomUUID()}`, files);
  if (uploaded.error) {
    await removeImages(supabase, uploaded.urls);
    return { error: uploaded.error };
  }

  const { data: offer, error } = await supabase.rpc("publish_offer", {
    p_variant_id: parsed.data.variantId,
    p_network_id: parsed.data.networkId,
    p_quantity: parsed.data.quantity,
    p_transfer_price: parsed.data.transferPrice,
    p_note: parsed.data.note || undefined,
  });
  if (error) {
    await removeImages(supabase, uploaded.urls);
    return { error: error.message.replace(/^.*?:\s*/, "") };
  }
  if (uploaded.urls.length) {
    const { error: photoError } = await supabase
      .from("offers")
      .update({ image_urls: uploaded.urls })
      .eq("id", offer.id);
    if (photoError) {
      await removeImages(supabase, uploaded.urls);
      return {
        error:
          "A oferta foi publicada, mas as fotos não foram salvas. Edite a oferta para enviá-las de novo.",
      };
    }
  }

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

const OPEN_STATUSES = ["ACTIVE", "PARTIALLY_NEGOTIATED"];

/**
 * AC-OFFER-008-02 — the owner adds, removes and reorders (first = cover) the
 * photos of an open offer. Removed photos leave the bucket.
 */
export async function updateOfferPhotos(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const org = await requireActiveOrganization();
  const parsed = offerPhotosSchema.safeParse({ offerId: formData.get("offerId") });
  if (!parsed.success) return { error: "Oferta inválida" };
  const { offerId } = parsed.data;

  const supabase = await createClient();
  const { data: offer } = await supabase
    .from("offers")
    .select("organization_id, status, image_urls")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer || offer.organization_id !== org.id) {
    return { error: "Você não tem permissão para esta ação" };
  }
  if (!OPEN_STATUSES.includes(offer.status)) {
    return { error: "Esta oferta não está mais ativa" };
  }

  const kept = keptImages(formData.get("existingImages"), offer.image_urls);
  const room = PRODUCT_IMAGE_MAX_COUNT - kept.length;
  const files = readImageFiles(formData, Math.max(0, room));
  const uploaded = await uploadImages(supabase, `${org.id}/offers/${offerId}`, files);
  if (uploaded.error) {
    await removeImages(supabase, uploaded.urls);
    return { error: uploaded.error };
  }

  const imageUrls = [...kept, ...uploaded.urls];
  const { error } = await supabase
    .from("offers")
    .update({ image_urls: imageUrls })
    .eq("id", offerId);
  if (error) {
    await removeImages(supabase, uploaded.urls);
    return { error: error.message };
  }
  await removeImages(
    supabase,
    offer.image_urls.filter((u) => !imageUrls.includes(u)),
  );

  revalidatePath("/rede");
  revalidatePath(`/rede/ofertas/${offerId}`);
  redirect(`/rede/ofertas/${offerId}?toast=offer-photos-updated`);
}
