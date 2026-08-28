import { describe, expect, it } from "vitest";
import { estimatedMargin, formatBRL, formatPercent, parseBRL } from "./currency";

describe("currency", () => {
  it("formats BRL", () => {
    expect(formatBRL(1234.5)).toBe("R$ 1.234,50");
    expect(formatBRL(0)).toBe("R$ 0,00");
    expect(formatBRL(Number.NaN)).toBe("R$ 0,00");
  });

  it("parses BRL strings", () => {
    expect(parseBRL("R$ 1.234,56")).toBe(1234.56);
    expect(parseBRL("1234,5")).toBe(1234.5);
    expect(parseBRL("1234.56")).toBe(1234.56);
    expect(parseBRL("")).toBe(0);
  });

  it("computes estimated margin (BR-CAT-06)", () => {
    expect(estimatedMargin(60, 100)).toBeCloseTo(0.4);
    expect(estimatedMargin(0, 0)).toBeNull();
    expect(formatPercent(estimatedMargin(60, 100))).toBe("40.0%");
    expect(formatPercent(estimatedMargin(10, 0))).toBe("--");
  });
});
