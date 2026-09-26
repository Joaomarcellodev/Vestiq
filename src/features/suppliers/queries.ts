import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";

/**
 * Supplier search for resellers (SPEC-011). Everything goes through the
 * SECURITY DEFINER functions of migration 0017, which only return the
 * factory's public catalog columns — never cost or stock quantity.
 */

export interface SupplierListItem {
  id: string;
  name: string;
  networkNames: string[];
  productCount: number;
}

export interface SupplierProductListItem {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  brand: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  minOrderQuantity: number;
  sizeGrid: string[];
  minPrice: number | null;
  maxPrice: number | null;
  variantCount: number;
  inStock: boolean;
}

export interface SupplierProductVariant {
  id: string;
  color: string | null;
  size: string | null;
  sku: string | null;
  price: number;
  inStock: boolean;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  brand: string | null;
  description: string | null;
  categoryName: string | null;
  imageUrls: string[];
  minOrderQuantity: number;
  sizeGrid: string[];
  variants: SupplierProductVariant[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanQuery(query?: string): string | undefined {
  const q = query?.trim();
  return q ? q : undefined;
}

const toPrice = (n: number | string | null) => (n === null ? null : Number(n));

export async function listSuppliers(query?: string): Promise<SupplierListItem[]> {
  await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_suppliers", { p_query: cleanQuery(query) });
  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    networkNames: s.network_names ?? [],
    productCount: s.product_count,
  }));
}

/** A single supplier the user can see, or `null` (unknown or outside their networks). */
export async function getSupplier(id: string): Promise<SupplierListItem | null> {
  if (!UUID.test(id)) return null;
  const suppliers = await listSuppliers();
  return suppliers.find((s) => s.id === id) ?? null;
}

export async function searchSupplierProducts(
  query?: string,
  supplierId?: string,
): Promise<SupplierProductListItem[]> {
  await requireActiveOrganization();
  if (supplierId !== undefined && !UUID.test(supplierId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_supplier_products", {
    p_query: cleanQuery(query),
    p_supplier_id: supplierId,
  });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    supplierId: p.supplier_id,
    supplierName: p.supplier_name,
    name: p.name,
    brand: p.brand ?? null,
    categoryName: p.category_name ?? null,
    imageUrl: p.image_url ?? null,
    minOrderQuantity: p.min_order_quantity,
    sizeGrid: p.size_grid ?? [],
    minPrice: toPrice(p.min_price),
    maxPrice: toPrice(p.max_price),
    variantCount: p.variant_count,
    inStock: p.in_stock,
  }));
}

/** Product detail with its variants, or `null` when it is not visible to the user. */
export async function getSupplierProduct(id: string): Promise<SupplierProduct | null> {
  await requireActiveOrganization();
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const [product, variants] = await Promise.all([
    supabase.rpc("get_supplier_product", { p_product_id: id }).maybeSingle(),
    supabase.rpc("list_supplier_product_variants", { p_product_id: id }),
  ]);
  if (product.error) throw product.error;
  if (variants.error) throw variants.error;
  const p = product.data;
  if (!p) return null;

  return {
    id: p.id,
    supplierId: p.supplier_id,
    supplierName: p.supplier_name,
    name: p.name,
    brand: p.brand ?? null,
    description: p.description ?? null,
    categoryName: p.category_name ?? null,
    imageUrls: p.image_urls ?? [],
    minOrderQuantity: p.min_order_quantity,
    sizeGrid: p.size_grid ?? [],
    variants: (variants.data ?? []).map((v) => ({
      id: v.id,
      color: v.color ?? null,
      size: v.size ?? null,
      sku: v.sku ?? null,
      price: Number(v.price),
      inStock: v.in_stock,
    })),
  };
}
