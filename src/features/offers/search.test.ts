import { describe, expect, it } from "vitest";
import { cleanOfferQuery, matchesOfferQuery } from "./search";

const bag = {
  productName: "Bolsa Chanel Classic Flap",
  brand: "Chanel",
  descriptor: "Preto / Único",
  sellerName: "Atelier Sarah",
};

describe("cleanOfferQuery", () => {
  it("trims, and treats a blank query as no query", () => {
    expect(cleanOfferQuery("  bolsa ")).toBe("bolsa");
    expect(cleanOfferQuery("   ")).toBeUndefined();
    expect(cleanOfferQuery(undefined)).toBeUndefined();
  });
});

describe("matchesOfferQuery", () => {
  it("matches everything without a query", () => {
    expect(matchesOfferQuery(bag)).toBe(true);
    expect(matchesOfferQuery(bag, "  ")).toBe(true);
  });

  it("searches product, brand, colour/size and seller", () => {
    expect(matchesOfferQuery(bag, "classic")).toBe(true);
    expect(matchesOfferQuery(bag, "chanel")).toBe(true);
    expect(matchesOfferQuery(bag, "preto")).toBe(true);
    expect(matchesOfferQuery(bag, "sarah")).toBe(true);
    expect(matchesOfferQuery(bag, "gucci")).toBe(false);
  });

  it("ignores case and accents on both sides", () => {
    expect(matchesOfferQuery(bag, "UNICO")).toBe(true);
    expect(matchesOfferQuery({ ...bag, sellerName: "Clara Boutique" }, "clará")).toBe(true);
  });

  it("requires every word, in any order and across fields", () => {
    expect(matchesOfferQuery(bag, "preto chanel")).toBe(true);
    expect(matchesOfferQuery(bag, "chanel azul")).toBe(false);
  });

  it("works without a brand", () => {
    expect(matchesOfferQuery({ ...bag, brand: null }, "bolsa")).toBe(true);
  });
});
