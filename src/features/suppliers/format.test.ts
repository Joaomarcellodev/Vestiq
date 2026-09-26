import { describe, expect, it } from "vitest";
import { priceRangeLabel, variantLabel } from "./format";

const nbsp = (s: string) => s.replace(/\s/g, " ");

describe("priceRangeLabel", () => {
  it("shows a single price when min equals max", () => {
    expect(nbsp(priceRangeLabel(79.9, 79.9))).toBe("R$ 79,90");
  });

  it("shows a range when prices differ", () => {
    expect(nbsp(priceRangeLabel(79.9, 120))).toBe("R$ 79,90 – R$ 120,00");
  });

  it("falls back when the supplier has no price", () => {
    expect(priceRangeLabel(null, null)).toBe("Preço sob consulta");
  });
});

describe("variantLabel", () => {
  it("joins colour and size", () => {
    expect(variantLabel("Preto", "P")).toBe("Preto / P");
    expect(variantLabel(null, "M")).toBe("M");
    expect(variantLabel("Azul", null)).toBe("Azul");
    expect(variantLabel(null, null)).toBe("Único");
  });
});
