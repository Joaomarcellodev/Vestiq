import { describe, expect, it } from "vitest";
import { availableActions, isAccepted, orderCode } from "./state";

describe("availableActions (TC-ORD-10)", () => {
  it("lets the reseller cancel and the supplier answer a pending order", () => {
    expect(availableActions("PENDING", "reseller")).toEqual(["cancel"]);
    expect(availableActions("PENDING", "supplier")).toEqual(["confirm", "reject"]);
  });

  it("hides the answer from supplier members without the admin role", () => {
    expect(availableActions("PENDING", "supplier", { canRespond: false })).toEqual([]);
  });

  it("allows nothing once the order is final", () => {
    for (const status of ["DELIVERED", "REJECTED", "CANCELLED"] as const) {
      expect(availableActions(status, "reseller")).toEqual([]);
      expect(availableActions(status, "supplier")).toEqual([]);
    }
  });

  it("lets the supplier admin start production or ship a confirmed order (VES-32)", () => {
    expect(availableActions("CONFIRMED", "supplier")).toEqual(["start_production", "ship"]);
    expect(availableActions("IN_PRODUCTION", "supplier")).toEqual(["ship"]);
    expect(availableActions("SHIPPED", "supplier")).toEqual([]);
    expect(availableActions("CONFIRMED", "supplier", { canRespond: false })).toEqual([]);
  });

  it("lets the reseller mark only a shipped order received (VES-32)", () => {
    expect(availableActions("CONFIRMED", "reseller")).toEqual([]);
    expect(availableActions("IN_PRODUCTION", "reseller")).toEqual([]);
    expect(availableActions("SHIPPED", "reseller")).toEqual(["receive"]);
  });
});

describe("isAccepted (BR-PAY-01)", () => {
  it("holds from confirmation through delivery", () => {
    for (const status of ["CONFIRMED", "IN_PRODUCTION", "SHIPPED", "DELIVERED"] as const) {
      expect(isAccepted(status)).toBe(true);
    }
    for (const status of ["PENDING", "REJECTED", "CANCELLED"] as const) {
      expect(isAccepted(status)).toBe(false);
    }
  });
});

describe("orderCode", () => {
  it("shortens the id", () => {
    expect(orderCode("1a2b3c4d-0000-4000-8000-000000000000")).toBe("#1A2B3C4D");
  });
});
