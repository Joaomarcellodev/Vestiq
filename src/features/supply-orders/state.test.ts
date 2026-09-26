import { describe, expect, it } from "vitest";
import { availableActions, orderCode } from "./state";

describe("availableActions (TC-ORD-10)", () => {
  it("lets the reseller cancel and the supplier answer a pending order", () => {
    expect(availableActions("PENDING", "reseller")).toEqual(["cancel"]);
    expect(availableActions("PENDING", "supplier")).toEqual(["confirm", "reject"]);
  });

  it("hides the answer from supplier members without the admin role", () => {
    expect(availableActions("PENDING", "supplier", { canRespond: false })).toEqual([]);
  });

  it("allows nothing once the order is final", () => {
    for (const status of ["CONFIRMED", "REJECTED", "CANCELLED"] as const) {
      expect(availableActions(status, "reseller")).toEqual([]);
      expect(availableActions(status, "supplier")).toEqual([]);
    }
  });
});

describe("orderCode", () => {
  it("shortens the id", () => {
    expect(orderCode("1a2b3c4d-0000-4000-8000-000000000000")).toBe("#1A2B3C4D");
  });
});
