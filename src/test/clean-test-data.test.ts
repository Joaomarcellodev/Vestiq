import { describe, expect, it, vi } from "vitest";
import {
  E2E_CUSTOMER,
  E2E_OFFER_NOTE,
  E2E_ORDER_NOTE,
  E2E_PRODUCT,
  TEST_EMAIL,
  cleanTestData,
  isLocalUrl,
} from "../../scripts/clean-test-data.mjs";

// VES-94 — the cleanup only ever runs against this machine's Supabase.
describe("clean-test-data", () => {
  it("accepts only a local Supabase URL", () => {
    expect(isLocalUrl("http://127.0.0.1:54421")).toBe(true);
    expect(isLocalUrl("http://localhost:54321")).toBe(true);
    expect(isLocalUrl("https://inixwmfxufnsxgpvlfku.supabase.co")).toBe(false);
    expect(isLocalUrl("http://127.0.0.1.evil.com")).toBe(false);
    expect(isLocalUrl("")).toBe(false);
  });

  it("skips without touching anything when the URL is not local or keys are missing", async () => {
    const log = vi.fn();
    expect(
      await cleanTestData({ url: "https://x.supabase.co", secretKey: "sb_secret_x", log }),
    ).toBeNull();
    expect(await cleanTestData({ url: "http://127.0.0.1:54421", secretKey: "", log })).toBeNull();
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/pulado/));
  });

  it("recognises only what the tests create, never the demo data", () => {
    for (const name of ["Peça Foto 12345", "Peça Ofertada 7", "Peça Fábrica 99"]) {
      expect(E2E_PRODUCT.test(name)).toBe(true);
    }
    for (const name of ["Bolsa Classic Flap", "Peça Foto", "Peça Foto rara 12"]) {
      expect(E2E_PRODUCT.test(name)).toBe(false);
    }
    expect(E2E_CUSTOMER.test("Cliente E2E 4521 (editado)")).toBe(true);
    expect(E2E_CUSTOMER.test("Maria Rodrigues")).toBe(false);
    expect(E2E_OFFER_NOTE.test("Foto e2e 123")).toBe(true);
    expect(E2E_ORDER_NOTE.test("E2E 1730000000000")).toBe(true);
    expect(E2E_ORDER_NOTE.test("Entrega na segunda")).toBe(false);
    expect(TEST_EMAIL.test("user-1-1-abc@vestiq.test")).toBe(true);
    expect(TEST_EMAIL.test("revenda@vestiq.dev")).toBe(false);
  });
});
