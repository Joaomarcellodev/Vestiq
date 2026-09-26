import { describe, expect, it } from "vitest";
import {
  groupCatalog,
  parseQuantity,
  summarizeOrder,
  toOrderItems,
  variantAt,
  type OrderCatalogRow,
} from "./order-math";

const row = (over: Partial<OrderCatalogRow>): OrderCatalogRow => ({
  product_id: "dress",
  product_name: "Vestido Midi",
  brand: "Modah",
  image_url: null,
  min_order_quantity: 12,
  size_grid: ["P", "M", "G"],
  variant_id: "v",
  color: "Preto",
  size: "P",
  sku: null,
  price: "79.90",
  in_stock: true,
  ...over,
});

const rows: OrderCatalogRow[] = [
  row({ variant_id: "d-pt-p", size: "P" }),
  row({ variant_id: "d-pt-g", size: "G" }),
  row({ variant_id: "d-pt-m", size: "M" }),
  row({ variant_id: "d-az-m", color: "Azul", size: "M", in_stock: false }),
  row({ variant_id: "d-pt-xg", size: "XG" }),
  row({
    product_id: "bag",
    product_name: "Bolsa",
    min_order_quantity: 1,
    size_grid: [],
    variant_id: "b-u",
    color: null,
    size: null,
    price: 150,
  }),
];

describe("groupCatalog", () => {
  it("builds one product per id with a colour × size grid in grid order", () => {
    const [dress, bag] = groupCatalog(rows);
    expect(dress).toMatchObject({ name: "Vestido Midi", minOrderQuantity: 12 });
    expect(dress!.colors).toEqual(["Preto", "Azul"]);
    // grid order first, off-grid sizes after
    expect(dress!.sizes).toEqual(["P", "M", "G", "XG"]);
    expect(dress!.variants[0]!.price).toBe(79.9);
    expect(bag!.colors).toEqual(["Único"]);
    expect(bag!.sizes).toEqual(["Único"]);
  });

  it("finds the variant of a cell, or nothing for combinations not offered", () => {
    const [dress, bag] = groupCatalog(rows);
    expect(variantAt(dress!, "Azul", "M")?.id).toBe("d-az-m");
    expect(variantAt(dress!, "Azul", "P")).toBeUndefined();
    expect(variantAt(bag!, "Único", "Único")?.id).toBe("b-u");
  });
});

describe("parseQuantity", () => {
  it("accepts whole pieces and clamps the rest", () => {
    expect(parseQuantity("6")).toBe(6);
    expect(parseQuantity(" 7 ")).toBe(7);
    expect(parseQuantity("2.9")).toBe(2);
    expect(parseQuantity("")).toBe(0);
    expect(parseQuantity("-3")).toBe(0);
    expect(parseQuantity("abc")).toBe(0);
    expect(parseQuantity("999999")).toBe(100_000);
  });
});

describe("summarizeOrder (TC-ORD-04)", () => {
  const catalog = groupCatalog(rows);

  it("asks for at least one item", () => {
    const s = summarizeOrder(catalog, {});
    expect(s.totalPieces).toBe(0);
    expect(s.blockers).toEqual(["Adicione ao menos um item"]);
  });

  it("reports how many pieces are missing for the minimum", () => {
    const s = summarizeOrder(catalog, { "d-pt-p": 4, "d-az-m": 6 });
    expect(s.products).toEqual([
      expect.objectContaining({ productId: "dress", pieces: 10, shortfall: 2 }),
    ]);
    expect(s.blockers).toEqual(["Faltam 2 peças para o mínimo de Vestido Midi"]);
  });

  it("sums pieces and amount across products and ignores products not ordered", () => {
    const s = summarizeOrder(catalog, { "d-pt-p": 6, "d-pt-m": 6, "b-u": 1, "d-pt-g": 0 });
    expect(s.blockers).toEqual([]);
    expect(s.products.map((p) => p.productId)).toEqual(["dress", "bag"]);
    expect(s.totalPieces).toBe(13);
    expect(s.totalAmount).toBe(1108.8); // 12 × 79.90 + 150
    expect(s.variantCount).toBe(3);
  });

  it("blocks variants without a price", () => {
    const catalog2 = groupCatalog([row({ variant_id: "free", price: 0, min_order_quantity: 1 })]);
    expect(summarizeOrder(catalog2, { free: 1 }).blockers).toEqual([
      "Vestido Midi tem variação sem preço definido",
    ]);
  });
});

describe("toOrderItems", () => {
  it("keeps only the variants with a quantity", () => {
    expect(toOrderItems({ a: 2, b: 0, c: 5 })).toEqual([
      { variantId: "a", quantity: 2 },
      { variantId: "c", quantity: 5 },
    ]);
  });
});
