import { describe, expect, it } from "vitest";
import { editVariantsSchema, fieldErrorsOf, productSchema, variantSchema } from "./validation";

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

  describe("editVariantsSchema (VES-68)", () => {
    const id = "6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b";

    it("accepts existing (with id) and new (empty id) variants", () => {
      const parsed = editVariantsSchema.parse([
        { id, retailPrice: "129.9", costPrice: "50" },
        { id: "", size: "GG", retailPrice: "100", initialStock: "3" },
      ]);
      expect(parsed[0]).toMatchObject({ id, retailPrice: 129.9, costPrice: 50 });
      expect(parsed[1]).toMatchObject({ id: "", initialStock: 3 });
    });

    it("keeps at least one variant (BR-CAT-03)", () => {
      const result = editVariantsSchema.safeParse([]);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("O produto precisa de pelo menos uma variação");
    });

    it("rejects a malformed id", () => {
      expect(editVariantsSchema.safeParse([{ id: "x", retailPrice: 1 }]).success).toBe(false);
    });

    it("keys errors by field path", () => {
      const result = editVariantsSchema.safeParse([
        { id, retailPrice: 10 },
        { id: "", retailPrice: -1, costPrice: -2 },
      ]);
      expect(fieldErrorsOf(result.error!, "variants")).toEqual({
        "variants.1.retailPrice": "Preço de venda inválido",
        "variants.1.costPrice": "Custo inválido",
      });
    });
  });
});
