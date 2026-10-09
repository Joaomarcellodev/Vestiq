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
  /** Wholesale conditions (factory products — RF-PROD-007). */
  minOrderQuantity: number;
  sizeGrid: string[];
}

export async function listProducts(
  search?: string,
  scope: "active" | "archived" = "active",
  categoryId?: string,
): Promise<ProductListItem[]> {
  await requireActiveOrganization();
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(
      "id, name, brand, internal_sku, image_urls, archived_at, min_order_quantity, size_grid, product_variants(retail_price, stock_on_hand, archived_at)",
    )
    .order("created_at", { ascending: false });

  query =
    scope === "archived" ? query.not("archived_at", "is", null) : query.is("archived_at", null);

  if (search && search.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }
  if (categoryId) query = query.eq("category_id", categoryId);

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
      minOrderQuantity: p.min_order_quantity,
      sizeGrid: p.size_grid ?? [],
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

export interface ArchiveOption {
  variantId: string;
  label: string;
  stock: number;
  costPrice: number;
}

/**
 * AC-PROD-006-03 — what the archive step offers: the product's variants with
 * stock (prefilled with all of it at cost price) and the networks the
 * organization can publish to.
 */
export async function getArchiveOptions(productId: string) {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  const [{ data: product, error }, { data: networks }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, archived_at, product_variants(id, size, color, stock_on_hand, cost_price, archived_at)",
      )
      .eq("id", productId)
      .maybeSingle(),
    supabase
      .from("network_members")
      .select("factory_networks(id, name)")
      .eq("reseller_id", org.id)
      .eq("status", "ACTIVE"),
  ]);
  if (error) throw error;
  if (!product) return null;

  const options: ArchiveOption[] = (product.product_variants ?? [])
    .filter((v) => v.archived_at === null && v.stock_on_hand > 0)
    .map((v) => ({
      variantId: v.id,
      label: [v.color, v.size].filter(Boolean).join(" / ") || "Único",
      stock: v.stock_on_hand,
      costPrice: Number(v.cost_price),
    }));

  return {
    product: { id: product.id, name: product.name, archived: product.archived_at !== null },
    variants: options,
    networks: (networks ?? []).flatMap((m) => (m.factory_networks ? [m.factory_networks] : [])),
  };
}

export interface CategoryListItem {
  id: string;
  name: string;
  archived: boolean;
  productCount: number;
}

/** Every category of the organization, archived ones included (category management screen). */
export async function listCategoriesForManagement(): Promise<CategoryListItem[]> {
  await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, archived_at, products(count)")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    archived: c.archived_at !== null,
    productCount: c.products?.[0]?.count ?? 0,
  }));
}
