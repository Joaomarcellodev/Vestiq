import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { classifyStock, DEFAULT_LOW_STOCK_THRESHOLD, type StockLevel } from "./classify";
import {
  movementTypesFor,
  type MovementCursor,
  type MovementFilter,
  type MovementType,
} from "./history";

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

export const MOVEMENT_PAGE_SIZE = 30;

export interface MovementRow {
  id: string;
  type: MovementType;
  quantity: number;
  balanceAfter: number;
  note: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

/** RF-INV-004 — a variant's movements, newest first, one page at a time. */
export async function listMovements(
  variantId: string,
  {
    filter = "all",
    before = null,
    limit = MOVEMENT_PAGE_SIZE,
  }: { filter?: MovementFilter; before?: MovementCursor | null; limit?: number } = {},
): Promise<{ items: MovementRow[]; nextCursor: MovementCursor | null }> {
  await requireActiveOrganization();
  const supabase = await createClient();

  let query = supabase
    .from("inventory_movements")
    .select("id, type, quantity, balance_after, note, reference_type, reference_id, created_at")
    .eq("product_variant_id", variantId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  const types = movementTypesFor(filter);
  if (types) query = query.in("type", types);
  if (before) {
    query = query.or(
      `created_at.lt."${before.createdAt}",and(created_at.eq."${before.createdAt}",id.lt.${before.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const items: MovementRow[] = rows.slice(0, limit).map((m) => ({
    id: m.id,
    type: m.type,
    quantity: m.quantity,
    balanceAfter: m.balance_after,
    note: m.note,
    referenceType: m.reference_type,
    referenceId: m.reference_id,
    createdAt: m.created_at,
  }));
  const last = items.at(-1);
  const nextCursor =
    rows.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null;

  return { items, nextCursor };
}

export interface VariantHeader {
  variantId: string;
  productId: string;
  productName: string;
  brand: string | null;
  descriptor: string;
  sku: string | null;
  stock: number;
  level: StockLevel;
}

/** Header of the history screen; `null` if the variant is not this product's (or not visible). */
export async function getVariantHeader(
  productId: string,
  variantId: string,
): Promise<VariantHeader | null> {
  await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, size, color, sku, stock_on_hand, product_id, products(name, brand)")
    .eq("id", variantId)
    .eq("product_id", productId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    variantId: data.id,
    productId: data.product_id,
    productName: data.products?.name ?? "—",
    brand: data.products?.brand ?? null,
    descriptor: [data.color, data.size].filter(Boolean).join(" / ") || "Único",
    sku: data.sku,
    stock: data.stock_on_hand,
    level: classifyStock(data.stock_on_hand, DEFAULT_LOW_STOCK_THRESHOLD),
  };
}
