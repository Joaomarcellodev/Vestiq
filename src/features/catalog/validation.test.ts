import { describe, expect, it } from "vitest";
import { productSchema, variantSchema } from "./validation";

describe("catalog validation", () => {
  it("requires a product name", () => {
    expect(productSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accepts a product with variants", () => {
    const parsed = productSchema.safeParse({
      name: "Vestido Floral",
      variants: [{ retailPrice: 199.9, size: "P" }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects negative retail price", () => {
    expect(variantSchema.safeParse({ retailPrice: -1 }).success).toBe(false);
  });

  it("coerces numeric strings", () => {
    const v = variantSchema.parse({ retailPrice: "150", costPrice: "90", initialStock: "5" });
    expect(v.retailPrice).toBe(150);
    expect(v.initialStock).toBe(5);
  });
});
