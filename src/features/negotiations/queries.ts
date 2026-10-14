import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { variantLabel } from "@/features/suppliers/format";
import type { Database } from "@/types/database";

type ProductRow = Database["public"]["Functions"]["list_negotiation_products"]["Returns"][number];

/** Public fields of the negotiated product — the same for seller and buyer. */
export type NegotiationProduct = {
  name: string;
  brand: string | null;
  variant: string;
  imageUrl: string | null;
};

function toProduct(row: ProductRow | undefined): NegotiationProduct | null {
  if (!row) return null;
  return {
    name: row.product_name,
    brand: row.brand ?? null,
    variant: variantLabel(row.color, row.size),
    imageUrl: row.image_urls?.[0] ?? null,
  };
}

/**
 * The buyer can't read the seller's products (RLS), so the product comes from
 * the `list_negotiation_products` projection (migration 0031, VES-97).
 */
export async function listNegotiations() {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  const [{ data, error }, { data: products, error: productsError }] = await Promise.all([
    supabase
      .from("negotiations")
      .select(
        "id, quantity, amount, status, seller_org_id, buyer_org_id, created_at, seller:organizations!negotiations_seller_org_id_fkey(name), buyer:organizations!negotiations_buyer_org_id_fkey(name)",
      )
      .order("created_at", { ascending: false }),
    supabase.rpc("list_negotiation_products"),
  ]);
  if (error) throw error;
  if (productsError) throw productsError;
  const productOf = new Map((products ?? []).map((p) => [p.negotiation_id, p]));

  return (data ?? []).map((n) => ({
    id: n.id,
    quantity: n.quantity,
    amount: Number(n.amount),
    status: n.status,
    createdAt: n.created_at,
    direction: n.seller_org_id === org.id ? ("received" as const) : ("sent" as const),
    counterparty: n.seller_org_id === org.id ? n.buyer?.name : n.seller?.name,
    product: toProduct(productOf.get(n.id)),
  }));
}

export async function getNegotiation(id: string) {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  const [{ data: negotiation, error }, { data: events }, { data: products }] = await Promise.all([
    supabase
      .from("negotiations")
      .select(
        "*, seller:organizations!negotiations_seller_org_id_fkey(name), buyer:organizations!negotiations_buyer_org_id_fkey(name)",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("negotiation_events")
      .select("id, type, body, created_at, actor_id")
      .eq("negotiation_id", id)
      .order("created_at"),
    supabase.rpc("list_negotiation_products", { p_negotiation_id: id }),
  ]);
  if (error) throw error;

  const isSeller = negotiation.seller_org_id === org.id;
  return {
    negotiation,
    product: toProduct(products?.[0]),
    events: events ?? [],
    isSeller,
    party: isSeller ? "seller" : "buyer",
  };
}
