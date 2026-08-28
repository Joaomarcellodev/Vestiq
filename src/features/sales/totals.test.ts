import { describe, expect, it } from "vitest";
import { averageTicket, computeTotals, lineTotal, validateDiscount } from "./totals";

describe("sale totals", () => {
  it("computes line and grand totals (BR-SALE-02)", () => {
    const lines = [
      { quantity: 1, unitPrice: 18500 },
      { quantity: 2, unitPrice: 1200 },
    ];
    expect(lineTotal(lines[1]!)).toBe(2400);
    const t = computeTotals(lines, 900);
    expect(t.subtotal).toBe(20900);
    expect(t.total).toBe(20000);
  });

  it("clamps negative discount to zero", () => {
    expect(computeTotals([{ quantity: 1, unitPrice: 100 }], -50).discount).toBe(0);
  });

  it("validates discount vs subtotal", () => {
    expect(validateDiscount(100, 20)).toBeNull();
    expect(validateDiscount(100, 120)).toBe("Desconto maior que o subtotal");
    expect(validateDiscount(100, -1)).toBe("Desconto não pode ser negativo");
  });

  it("computes average ticket (BR-DASH-03)", () => {
    expect(averageTicket(12450, 3)).toBe(4150);
    expect(averageTicket(0, 0)).toBe(0);
  });
});
