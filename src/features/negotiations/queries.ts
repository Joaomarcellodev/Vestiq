import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";

export async function listNegotiations() {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("negotiations")
    .select(
      "id, quantity, amount, status, seller_org_id, buyer_org_id, created_at, seller:organizations!negotiations_seller_org_id_fkey(name), buyer:organizations!negotiations_buyer_org_id_fkey(name), offers(product_variants(products(name)))",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((n) => ({
    id: n.id,
    quantity: n.quantity,
    amount: Number(n.amount),
    status: n.status,
    createdAt: n.created_at,
    direction: n.seller_org_id === org.id ? ("received" as const) : ("sent" as const),
    counterparty: n.seller_org_id === org.id ? n.buyer?.name : n.seller?.name,
    productName: n.offers?.product_variants?.products?.name ?? "—",
  }));
}

export async function getNegotiation(id: string) {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  const [{ data: negotiation, error }, { data: events }] = await Promise.all([
    supabase
      .from("negotiations")
      .select(
        "*, seller:organizations!negotiations_seller_org_id_fkey(name), buyer:organizations!negotiations_buyer_org_id_fkey(name), offers(transfer_price, product_variants(size, color, products(name, brand)))",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("negotiation_events")
      .select("id, type, body, created_at, actor_id")
      .eq("negotiation_id", id)
      .order("created_at"),
  ]);
  if (error) throw error;

  const isSeller = negotiation.seller_org_id === org.id;
  return { negotiation, events: events ?? [], isSeller, party: isSeller ? "seller" : "buyer" };
}
