import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, requireActiveOrganization } from "@/features/organizations/queries";
import type { Database } from "@/types/database";
import { matchesOfferQuery } from "./search";

export type NetworkOffer = {
  id: string;
  remaining: number;
  price: number;
  note: string | null;
  isMine: boolean;
  sellerName: string;
  productName: string;
  brand: string | null;
  imageUrl: string | null;
  descriptor: string;
};

export type OfferDetail = {
  id: string;
  status: Database["public"]["Enums"]["offer_status"];
  remaining: number;
  price: number;
  note: string | null;
  sellerName: string;
  productName: string;
  brand: string | null;
  descriptor: string;
  imageUrls: string[];
  /** The offer's own photos (owner only, for editing) — `imageUrls` falls back to the product's. */
  ownImageUrls: string[];
};

/**
 * Active offers of the reseller's networks, optionally narrowed by a search query.
 * Reads the public projection (migration 0022) so peers get the product too.
 */
export async function listNetworkOffers(query?: string): Promise<NetworkOffer[]> {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("list_visible_offers")
    .in("status", ["ACTIVE", "PARTIALLY_NEGOTIATED"]);
  if (error) throw error;

  const offers = (data ?? []).map((o) => ({
    id: o.id,
    remaining: o.quantity_remaining,
    price: Number(o.transfer_price),
    note: o.note ?? null,
    isMine: o.organization_id === org.id,
    sellerName: o.seller_name,
    productName: o.product_name,
    brand: o.brand ?? null,
    imageUrl: o.image_urls?.[0] ?? null,
    descriptor: [o.color, o.size].filter(Boolean).join(" / ") || "Único",
  }));
  return offers.filter((o) => matchesOfferQuery(o, query));
}

export async function getOffer(id: string) {
  await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_visible_offers", { p_offer_id: id }).single();
  if (error) throw error;
  const active = await getActiveOrganization();
  const isMine = data.organization_id === active?.id;
  let ownImageUrls: string[] = [];
  if (isMine) {
    const { data: own } = await supabase.from("offers").select("image_urls").eq("id", id).single();
    ownImageUrls = own?.image_urls ?? [];
  }
  const offer: OfferDetail = {
    id: data.id,
    status: data.status,
    remaining: data.quantity_remaining,
    price: Number(data.transfer_price),
    note: data.note ?? null,
    sellerName: data.seller_name,
    productName: data.product_name,
    brand: data.brand ?? null,
    descriptor: [data.color, data.size].filter(Boolean).join(" / "),
    imageUrls: data.image_urls ?? [],
    ownImageUrls,
  };
  return { offer, isMine };
}

/** Reseller's own variants + the networks they belong to, for the publish form. */
export async function getPublishOptions() {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  const [{ data: variants }, { data: networks }, { data: openOffers }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, size, color, stock_on_hand, products(name)")
      .eq("organization_id", org.id)
      .is("archived_at", null)
      .gt("stock_on_hand", 0)
      .order("created_at"),
    supabase.from("factory_networks").select("id, name"),
    supabase
      .from("offers")
      .select("product_variant_id, quantity_remaining")
      .eq("organization_id", org.id)
      .in("status", ["ACTIVE", "PARTIALLY_NEGOTIATED"]),
  ]);

  // BR-OFFER-11 — only the stock not already in open offers can be offered.
  const offered = new Map<string, number>();
  for (const o of openOffers ?? []) {
    offered.set(
      o.product_variant_id,
      (offered.get(o.product_variant_id) ?? 0) + o.quantity_remaining,
    );
  }

  return {
    variants: (variants ?? [])
      .map((v) => ({ ...v, free: v.stock_on_hand - (offered.get(v.id) ?? 0) }))
      .filter((v) => v.free > 0)
      .map((v) => ({
        id: v.id,
        label: `${v.products?.name ?? "—"} · ${[v.color, v.size].filter(Boolean).join(" / ") || "Único"} (${v.free} un. livres)`,
      })),
    networks: networks ?? [],
  };
}
