import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";

export interface ProductListItem {
  id: string;
  name: string;
  brand: string | null;
  internalSku: string | null;
  imageUrl: string | null;
  variantCount: number;
  totalStock: number;
  minPrice: number | null;
  archived: boolean;
}

export async function listProducts(
  search?: string,
  scope: "active" | "archived" = "active",
): Promise<ProductListItem[]> {
  await requireActiveOrganization();
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(
      "id, name, brand, internal_sku, image_urls, archived_at, product_variants(retail_price, stock_on_hand, archived_at)",
    )
    .order("created_at", { ascending: false });

  query =
    scope === "archived" ? query.not("archived_at", "is", null) : query.is("archived_at", null);

  if (search && search.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((p) => {
    const variants = p.product_variants ?? [];
    const prices = variants.map((v) => Number(v.retail_price)).filter((n) => n > 0);
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      internalSku: p.internal_sku,
      imageUrl: p.image_urls?.[0] ?? null,
      variantCount: variants.length,
      totalStock: variants.reduce((a, v) => a + v.stock_on_hand, 0),
      minPrice: prices.length ? Math.min(...prices) : null,
      archived: p.archived_at !== null,
    };
  });
}

export async function getProduct(id: string) {
  await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name), product_variants(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function listCategories() {
  await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .is("archived_at", null)
    .order("name");
  if (error) throw error;
  return data ?? [];
}
