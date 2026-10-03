import { describe, expect, it } from "vitest";
import {
  decodeMovementCursor,
  encodeMovementCursor,
  formatMovementQuantity,
  MOVEMENT_FILTER_TABS,
  MOVEMENT_FILTER_TYPES,
  movementReferenceLink,
  movementTypesFor,
  parseMovementFilter,
} from "./history";

describe("movement filters (US-INV-03)", () => {
  it("falls back to every type for a missing or unknown filter", () => {
    expect(parseMovementFilter(undefined)).toBe("all");
    expect(parseMovementFilter("bogus")).toBe("all");
    expect(movementTypesFor("all")).toBeNull();
  });

  it("maps each tab to its movement types", () => {
    expect(movementTypesFor(parseMovementFilter("sales"))).toEqual(["VENDA", "CANCELAMENTO"]);
    expect(movementTypesFor("transfers")).toEqual(["TRANSFERENCIA_ENTRADA", "TRANSFERENCIA_SAIDA"]);
    expect(movementTypesFor("adjust")).toEqual(["AJUSTE"]);
  });

  it("covers every movement type exactly once across the tabs", () => {
    const types = Object.values(MOVEMENT_FILTER_TYPES).flat();
    expect(new Set(types).size).toBe(types.length);
    expect(types).toHaveLength(7);
  });

  it("offers a tab for every filter", () => {
    const values = MOVEMENT_FILTER_TABS.map((t) => t.value);
    expect(values).toEqual(["", ...Object.keys(MOVEMENT_FILTER_TYPES)]);
  });
});

describe("movementReferenceLink (BR-INV-06)", () => {
  const id = "6f1c2a8e-1b2c-4d5e-8f90-123456789abc";

  it("links sales and negotiations", () => {
    expect(movementReferenceLink("sale", id)).toEqual({
      href: `/vendas/${id}`,
      label: "Ver venda",
    });
    expect(movementReferenceLink("negotiation", id)?.href).toBe(`/negociacoes/${id}`);
  });

  it("has no link for manual movements", () => {
    expect(movementReferenceLink("manual", null)).toBeNull();
    expect(movementReferenceLink("manual", id)).toBeNull();
    expect(movementReferenceLink(null, null)).toBeNull();
  });
});

describe("formatMovementQuantity", () => {
  it("signs the quantity", () => {
    expect(formatMovementQuantity(20)).toBe("+20");
    expect(formatMovementQuantity(-3)).toBe("-3");
  });
});

describe("movement cursor", () => {
  const cursor = {
    createdAt: "2026-10-03T14:05:12.345678+00:00",
    id: "6f1c2a8e-1b2c-4d5e-8f90-123456789abc",
  };

  it("round-trips through the URL", () => {
    const raw = new URLSearchParams({ antes: encodeMovementCursor(cursor) }).toString();
    expect(decodeMovementCursor(new URLSearchParams(raw).get("antes") ?? undefined)).toEqual(
      cursor,
    );
  });

  it("ignores missing or malformed cursors", () => {
    expect(decodeMovementCursor(undefined)).toBeNull();
    expect(decodeMovementCursor("")).toBeNull();
    expect(decodeMovementCursor("_6f1c2a8e-1b2c-4d5e-8f90-123456789abc")).toBeNull();
    expect(decodeMovementCursor(`ontem_${cursor.id}`)).toBeNull();
    expect(decodeMovementCursor(`${cursor.createdAt}_nao-e-uuid`)).toBeNull();
    expect(decodeMovementCursor("2026-10-03")).toBeNull();
  });
});
