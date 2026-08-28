import { describe, expect, it } from "vitest";
import { saleSchema } from "./validation";

const variantId = "11111111-1111-1111-1111-111111111111";

describe("sale validation", () => {
  it("requires at least one item (RF-SALE-002)", () => {
    const r = saleSchema.safeParse({ paymentMethod: "PIX", items: [] });
    expect(r.success).toBe(false);
  });

  it("accepts a valid sale", () => {
    const r = saleSchema.safeParse({
      paymentMethod: "PIX",
      discount: 0,
      items: [{ variantId, quantity: 2, unitPrice: 100 }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects non-positive quantity", () => {
    const r = saleSchema.safeParse({
      paymentMethod: "CARTAO",
      items: [{ variantId, quantity: 0, unitPrice: 100 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown payment method", () => {
    const r = saleSchema.safeParse({
      paymentMethod: "BOLETO",
      items: [{ variantId, quantity: 1, unitPrice: 1 }],
    });
    expect(r.success).toBe(false);
  });
});
