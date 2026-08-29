import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { averageTicket } from "./totals";

export async function listSales() {
  await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("id, status, total, payment_method, created_at, customers(name), sale_items(quantity)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    status: s.status,
    total: Number(s.total),
    paymentMethod: s.payment_method,
    createdAt: s.created_at,
    customerName: s.customers?.name ?? "Venda avulsa",
    itemCount: (s.sale_items ?? []).reduce((a, i) => a + i.quantity, 0),
  }));
}

export async function getSalesSummary() {
  await requireActiveOrganization();
  const supabase = await createClient();
  const { data } = await supabase.from("sales").select("total, status").eq("status", "CONFIRMED");
  const confirmed = data ?? [];
  const revenue = Math.round(confirmed.reduce((a, s) => a + Number(s.total), 0) * 100) / 100;
  return {
    revenue,
    count: confirmed.length,
    averageTicket: averageTicket(revenue, confirmed.length),
  };
}

export async function getSale(id: string) {
  await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*, customers(name), sale_items(*, product_variants(size, color, products(name)))")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/** Variants available to sell (in stock, not archived). */
export async function listSellableVariants(search?: string) {
  await requireActiveOrganization();
  const supabase = await createClient();
  let query = supabase
    .from("product_variants")
    .select("id, size, color, retail_price, stock_on_hand, products(name)")
    .is("archived_at", null)
    .gt("stock_on_hand", 0)
    .order("stock_on_hand", { ascending: false })
    .limit(50);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []).map((v) => ({
    id: v.id,
    label: `${v.products?.name ?? "—"} · ${[v.color, v.size].filter(Boolean).join(" / ") || "Único"}`,
    price: Number(v.retail_price),
    stock: v.stock_on_hand,
  }));
  return search?.trim()
    ? rows.filter((r) => r.label.toLowerCase().includes(search.trim().toLowerCase()))
    : rows;
}

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  minPrice: number;
  variants: { id: string; label: string; price: number; stock: number }[];
}

/**
 * Visual catalog for the sale screen: in-stock products grouped by product,
 * each with its photo and sellable variants. Browsed before / alongside the
 * text search.
 */
export async function listSellableCatalog(): Promise<CatalogProduct[]> {
  await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, brand, image_urls, product_variants(id, size, color, retail_price, stock_on_hand, archived_at)",
    )
    .is("archived_at", null)
    .order("name");
  if (error) throw error;

  return (data ?? [])
    .map((p) => {
      const variants = (p.product_variants ?? [])
        .filter((v) => v.archived_at === null && v.stock_on_hand > 0)
        .map((v) => ({
          id: v.id,
          label: [v.color, v.size].filter(Boolean).join(" / ") || "Único",
          price: Number(v.retail_price),
          stock: v.stock_on_hand,
        }));
      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        imageUrl: p.image_urls?.[0] ?? null,
        minPrice: variants.length ? Math.min(...variants.map((v) => v.price)) : 0,
        variants,
      };
    })
    .filter((p) => p.variants.length > 0);
}

export async function listCustomerOptions() {
  await requireActiveOrganization();
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, name")
    .is("archived_at", null)
    .order("name");
  return data ?? [];
}
