/**
 * Pure order-form logic (SPEC-012): catalog → colour × size grid, and the
 * running summary with the per-product minimum order (BR-ORD-03).
 * The database re-checks everything in `place_supply_order`.
 */

export const MAX_QUANTITY = 100_000;
export const MAX_VARIANTS = 200;

export interface OrderCatalogVariant {
  id: string;
  color: string | null;
  size: string | null;
  sku: string | null;
  price: number;
  inStock: boolean;
}

export interface OrderCatalogProduct {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  minOrderQuantity: number;
  /** Row labels (colours; "Único" when the product has none). */
  colors: string[];
  /** Column labels, in the product's size-grid order. */
  sizes: string[];
  variants: OrderCatalogVariant[];
}

export const NO_VALUE = "Único";

export interface OrderCatalogRow {
  product_id: string;
  product_name: string;
  brand: string | null;
  image_url: string | null;
  min_order_quantity: number;
  size_grid: string[] | null;
  variant_id: string;
  color: string | null;
  size: string | null;
  sku: string | null;
  price: number | string;
  in_stock: boolean;
}

/** Groups the flat catalog rows (already ordered by the database) into products. */
export function groupCatalog(rows: OrderCatalogRow[]): OrderCatalogProduct[] {
  const byId = new Map<string, OrderCatalogProduct>();
  for (const r of rows) {
    let product = byId.get(r.product_id);
    if (!product) {
      product = {
        id: r.product_id,
        name: r.product_name,
        brand: r.brand ?? null,
        imageUrl: r.image_url ?? null,
        minOrderQuantity: r.min_order_quantity,
        colors: [],
        sizes: [],
        variants: [],
      };
      byId.set(r.product_id, product);
    }
    product.variants.push({
      id: r.variant_id,
      color: r.color ?? null,
      size: r.size ?? null,
      sku: r.sku ?? null,
      price: Number(r.price),
      inStock: r.in_stock,
    });
  }

  for (const product of byId.values()) {
    const grid = rows.find((r) => r.product_id === product.id)?.size_grid ?? [];
    const colors = new Set<string>();
    const sizes = new Set<string>();
    for (const v of product.variants) {
      colors.add(v.color ?? NO_VALUE);
      sizes.add(v.size ?? NO_VALUE);
    }
    product.colors = [...colors];
    product.sizes = [
      ...grid.filter((s) => sizes.has(s)),
      ...[...sizes].filter((s) => !grid.includes(s)),
    ];
  }
  return [...byId.values()];
}

/** The variant at a colour × size cell, if the supplier offers it. */
export function variantAt(
  product: OrderCatalogProduct,
  color: string,
  size: string,
): OrderCatalogVariant | undefined {
  return product.variants.find(
    (v) => (v.color ?? NO_VALUE) === color && (v.size ?? NO_VALUE) === size,
  );
}

/** Parses a quantity input: blank/invalid → 0, clamped to 0..MAX_QUANTITY, whole pieces. */
export function parseQuantity(raw: string): number {
  const n = Math.floor(Number(raw.trim()));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, MAX_QUANTITY);
}

export type Quantities = Record<string, number>;

export interface ProductSummary {
  productId: string;
  name: string;
  pieces: number;
  amount: number;
  minOrderQuantity: number;
  /** Pieces still missing to reach the minimum (0 when met or not ordered). */
  shortfall: number;
  /** Ordered variants without a price (cannot be ordered). */
  unpriced: number;
}

export interface OrderSummary {
  products: ProductSummary[];
  totalPieces: number;
  totalAmount: number;
  variantCount: number;
  /** Why the order cannot be sent yet; empty when it can. */
  blockers: string[];
}

export function summarizeOrder(
  catalog: OrderCatalogProduct[],
  quantities: Quantities,
): OrderSummary {
  const products: ProductSummary[] = [];
  let variantCount = 0;

  for (const product of catalog) {
    let pieces = 0;
    let amount = 0;
    let unpriced = 0;
    for (const v of product.variants) {
      const q = quantities[v.id] ?? 0;
      if (q <= 0) continue;
      variantCount += 1;
      pieces += q;
      amount += q * v.price;
      if (v.price <= 0) unpriced += 1;
    }
    if (pieces === 0) continue;
    products.push({
      productId: product.id,
      name: product.name,
      pieces,
      amount: Math.round(amount * 100) / 100,
      minOrderQuantity: product.minOrderQuantity,
      shortfall: Math.max(0, product.minOrderQuantity - pieces),
      unpriced,
    });
  }

  const blockers: string[] = [];
  if (products.length === 0) blockers.push("Adicione ao menos um item");
  for (const p of products) {
    if (p.shortfall > 0) {
      blockers.push(
        `Faltam ${p.shortfall} peça${p.shortfall === 1 ? "" : "s"} para o mínimo de ${p.name}`,
      );
    }
    if (p.unpriced > 0) blockers.push(`${p.name} tem variação sem preço definido`);
  }
  if (variantCount > MAX_VARIANTS) blockers.push(`O pedido pode ter até ${MAX_VARIANTS} variações`);

  return {
    products,
    totalPieces: products.reduce((a, p) => a + p.pieces, 0),
    totalAmount: Math.round(products.reduce((a, p) => a + p.amount, 0) * 100) / 100,
    variantCount,
    blockers,
  };
}

/** Payload for `place_supply_order`: only the variants with a quantity. */
export function toOrderItems(quantities: Quantities): { variantId: string; quantity: number }[] {
  return Object.entries(quantities)
    .filter(([, q]) => q > 0)
    .map(([variantId, quantity]) => ({ variantId, quantity }));
}
