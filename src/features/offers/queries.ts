import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, requireActiveOrganization } from "@/features/organizations/queries";

export async function listNetworkOffers() {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select(
      "id, quantity_remaining, transfer_price, note, status, organization_id, organizations(name), product_variants(size, color, products(name, brand))",
    )
    .in("status", ["ACTIVE", "PARTIALLY_NEGOTIATED"])
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((o) => ({
    id: o.id,
    remaining: o.quantity_remaining,
    price: Number(o.transfer_price),
    note: o.note,
    isMine: o.organization_id === org.id,
    sellerName: o.organizations?.name ?? "—",
    productName: o.product_variants?.products?.name ?? "—",
    brand: o.product_variants?.products?.brand ?? null,
    descriptor:
      [o.product_variants?.color, o.product_variants?.size].filter(Boolean).join(" / ") || "Único",
  }));
}

export async function getOffer(id: string) {
  await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select(
      "*, organizations(name), product_variants(size, color, sku, products(name, brand, description))",
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  const active = await getActiveOrganization();
  return { offer: data, isMine: data.organization_id === active?.id };
}

/** Reseller's own variants + the networks they belong to, for the publish form. */
export async function getPublishOptions() {
  await requireActiveOrganization();
  const supabase = await createClient();
  const [{ data: variants }, { data: networks }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, size, color, stock_on_hand, products(name)")
      .is("archived_at", null)
      .gt("stock_on_hand", 0),
    supabase.from("factory_networks").select("id, name"),
  ]);
  return {
    variants: (variants ?? []).map((v) => ({
      id: v.id,
      label: `${v.products?.name ?? "—"} · ${[v.color, v.size].filter(Boolean).join(" / ") || "Único"} (${v.stock_on_hand} un.)`,
    })),
    networks: networks ?? [],
  };
}
