import { describe, expect, it } from "vitest";
import { formatSizeGrid, minOrderLabel, parseSizeGrid, parseWholesaleForm } from "./wholesale";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe("parseSizeGrid (BR-CAT-12)", () => {
  it("splits on commas, semicolons and line breaks, trimming blanks", () => {
    expect(parseSizeGrid(" P, M ;G\nGG ,, ")).toEqual(["P", "M", "G", "GG"]);
  });

  it("drops repeated sizes case-insensitively, keeping the first spelling", () => {
    expect(parseSizeGrid("P, p, M, m, P")).toEqual(["P", "M"]);
  });

  it("keeps the given order and returns [] for blank input", () => {
    expect(parseSizeGrid("46, 36, 38")).toEqual(["46", "36", "38"]);
    expect(parseSizeGrid("   ")).toEqual([]);
  });

  it("round-trips through formatSizeGrid", () => {
    expect(parseSizeGrid(formatSizeGrid(["PP", "P", "M"]))).toEqual(["PP", "P", "M"]);
  });
});

describe("minOrderLabel", () => {
  it("describes the minimum only when there is one", () => {
    expect(minOrderLabel(12)).toBe("Pedido mínimo: 12 peças");
    expect(minOrderLabel(1)).toBe("Sem pedido mínimo");
  });
});

describe("parseWholesaleForm (BR-CAT-11/12)", () => {
  it("defaults to no minimum and an empty grid", () => {
    const r = parseWholesaleForm(new FormData());
    expect(r.success && r.data).toEqual({ minOrderQuantity: 1, sizeGrid: [] });
  });

  it("accepts a minimum order and a grid", () => {
    const r = parseWholesaleForm(form({ minOrderQuantity: "12", sizeGrid: "P, M, G" }));
    expect(r.success && r.data).toEqual({ minOrderQuantity: 12, sizeGrid: ["P", "M", "G"] });
  });

  it.each([
    ["0", /pelo menos 1 peça/],
    ["2.5", /número inteiro/],
    ["10001", /até 10000 peças/],
    ["abc", /informe o pedido mínimo/i],
  ])("rejects a minimum order of %s", (value, message) => {
    const r = parseWholesaleForm(form({ minOrderQuantity: value }));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(message);
  });

  it("rejects more than 20 sizes or a size longer than 20 characters", () => {
    const many = Array.from({ length: 21 }, (_, i) => `T${i}`).join(",");
    expect(parseWholesaleForm(form({ sizeGrid: many })).error?.issues[0]?.message).toMatch(
      /até 20 tamanhos/,
    );
    expect(
      parseWholesaleForm(form({ sizeGrid: "X".repeat(21) })).error?.issues[0]?.message,
    ).toMatch(/até 20 caracteres/);
  });
});
