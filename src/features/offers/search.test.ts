import { describe, expect, it } from "vitest";
import { cleanOfferQuery } from "./search";

describe("cleanOfferQuery", () => {
  it("trims, and treats a blank query as no query", () => {
    expect(cleanOfferQuery("  bolsa ")).toBe("bolsa");
    expect(cleanOfferQuery("   ")).toBeUndefined();
    expect(cleanOfferQuery(undefined)).toBeUndefined();
  });
});
