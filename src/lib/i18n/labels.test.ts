import { describe, expect, it } from "vitest";
import {
  MEMBER_ROLE,
  MEMBER_STATUS,
  NEGOTIATION_EVENT,
  NEGOTIATION_STATUS,
  OFFER_STATUS,
  PAYMENT_METHOD,
  SALE_STATUS,
} from "./labels";

const ENUM_VALUES: Record<string, string[]> = {
  MEMBER_STATUS: ["ACTIVE", "INVITED", "DISABLED"],
  OFFER_STATUS: ["ACTIVE", "PARTIALLY_NEGOTIATED", "FULFILLED", "CANCELLED"],
  NEGOTIATION_STATUS: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "COMPLETED"],
  NEGOTIATION_EVENT: ["CREATED", "MESSAGE", "ACCEPTED", "REJECTED", "CANCELLED", "COMPLETED"],
  SALE_STATUS: ["CONFIRMED", "CANCELLED"],
  PAYMENT_METHOD: ["PIX", "CARTAO", "DINHEIRO"],
  MEMBER_ROLE: ["PLATFORM_ADMIN", "FACTORY_ADMIN", "RESELLER"],
};

const MAPS = {
  MEMBER_STATUS,
  OFFER_STATUS,
  NEGOTIATION_STATUS,
  NEGOTIATION_EVENT,
  SALE_STATUS,
  PAYMENT_METHOD,
  MEMBER_ROLE,
} as Record<string, Record<string, unknown>>;

describe("i18n labels", () => {
  for (const [name, values] of Object.entries(ENUM_VALUES)) {
    it(`${name} has a pt-BR label for every enum value`, () => {
      for (const value of values) {
        const entry = MAPS[name]![value];
        expect(entry, `${name}.${value}`).toBeDefined();
        const label = typeof entry === "string" ? entry : (entry as { label: string }).label;
        expect(label).toMatch(/[a-zà-ú]/i);
      }
    });
  }

  it("badge tones are valid where present", () => {
    const toned = [MEMBER_STATUS, OFFER_STATUS, NEGOTIATION_STATUS];
    const valid = ["neutral", "primary", "success", "warning", "error", "info"];
    for (const map of toned) {
      for (const entry of Object.values(map)) {
        expect(valid).toContain((entry as { tone: string }).tone);
      }
    }
  });
});
