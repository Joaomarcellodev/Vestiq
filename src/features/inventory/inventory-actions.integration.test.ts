import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import { clearTestClient, formData, setTestClient } from "@/test/actions";
import { adjustStock, recordEntry } from "./actions";
import { listInventory, listMovements } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("inventory actions + queries (SPEC-005)", () => {
  let ctx: { client: Awaited<ReturnType<typeof makeUser>>["client"]; variantId: string };

  beforeEach(async () => {
    const u = await makeUser();
    const org = await makeOrg(u.userId, "RESELLER");
    const product = await makeProduct(org.id, { name: "Bota" });
    const variant = await makeVariant(product.id, { sku: "BOT-1", retail_price: 200 });
    setTestClient(u.client);
    ctx = { client: u.client, variantId: variant.id };
  });
  afterEach(() => clearTestClient());

  it("recordEntry adds stock and writes a movement", async () => {
    const state = await recordEntry(
      {},
      formData({ variantId: ctx.variantId, quantity: 12, note: "compra" }),
    );
    expect(state.ok).toBe(true);

    const rows = await listInventory();
    expect(rows.find((r) => r.variantId === ctx.variantId)?.stock).toBe(12);

    const moves = await listMovements(ctx.variantId);
    expect(moves[0]).toMatchObject({ type: "ENTRADA", quantity: 12, balance_after: 12 });
  });

  it("recordEntry rejects a non-positive quantity (zod)", async () => {
    const state = await recordEntry({}, formData({ variantId: ctx.variantId, quantity: 0 }));
    expect(state.error).toMatch(/maior que zero/i);
  });

  it("adjustStock applies a signed delta with a reason", async () => {
    await recordEntry({}, formData({ variantId: ctx.variantId, quantity: 10, note: "x" }));
    const state = await adjustStock(
      {},
      formData({ variantId: ctx.variantId, delta: -3, note: "quebra" }),
    );
    expect(state.ok).toBe(true);
    const rows = await listInventory();
    expect(rows.find((r) => r.variantId === ctx.variantId)?.stock).toBe(7);
  });

  it("adjustStock requires a reason and a non-zero delta (zod)", async () => {
    expect(
      (await adjustStock({}, formData({ variantId: ctx.variantId, delta: 5, note: "" }))).error,
    ).toMatch(/motivo/i);
    expect(
      (await adjustStock({}, formData({ variantId: ctx.variantId, delta: 0, note: "y" }))).error,
    ).toMatch(/diferente de zero/i);
  });

  it("adjustStock cannot drive stock negative (RPC guard)", async () => {
    const state = await adjustStock(
      {},
      formData({ variantId: ctx.variantId, delta: -5, note: "erro" }),
    );
    expect(state.error).toBeTruthy();
  });

  it("listInventory filters by level and search", async () => {
    await recordEntry({}, formData({ variantId: ctx.variantId, quantity: 2, note: "x" })); // low

    expect((await listInventory("low")).some((r) => r.variantId === ctx.variantId)).toBe(true);
    expect((await listInventory("out")).some((r) => r.variantId === ctx.variantId)).toBe(false);
    expect((await listInventory("all", "BOT-1")).length).toBeGreaterThan(0);
  });
});
