import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { classifyStock, DEFAULT_LOW_STOCK_THRESHOLD, type StockLevel } from "./classify";

export interface InventoryRow {
  variantId: string;
  productId: string;
  productName: string;
  brand: string | null;
  descriptor: string;
  sku: string | null;
  retailPrice: number;
  stock: number;
  level: StockLevel;
}

export type InventoryFilter = "all" | "in" | "low" | "out";

export async function listInventory(filter: InventoryFilter = "all", search?: string) {
  await requireActiveOrganization();
  const supabase = await createClient();

  let query = supabase
    .from("product_variants")
    .select("id, size, color, sku, retail_price, stock_on_hand, products(id, name, brand)")
    .is("archived_at", null)
    .order("stock_on_hand", { ascending: true });

  if (search?.trim()) {
    query = query.or(`sku.ilike.%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows: InventoryRow[] = (data ?? []).map((v) => ({
    variantId: v.id,
    productId: v.products?.id ?? "",
    productName: v.products?.name ?? "—",
    brand: v.products?.brand ?? null,
    descriptor: [v.color, v.size].filter(Boolean).join(" / ") || "Único",
    sku: v.sku,
    retailPrice: Number(v.retail_price),
    stock: v.stock_on_hand,
    level: classifyStock(v.stock_on_hand, DEFAULT_LOW_STOCK_THRESHOLD),
  }));

  return rows.filter((r) => {
    if (filter === "in") return r.level !== "out";
    if (filter === "low") return r.level === "low";
    if (filter === "out") return r.level === "out";
    return true;
  });
}

export async function listMovements(variantId: string) {
  await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("id, type, quantity, balance_after, note, created_at")
    .eq("product_variant_id", variantId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
