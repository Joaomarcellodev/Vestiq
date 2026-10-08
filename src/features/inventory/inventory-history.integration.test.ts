import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import { clearTestClient, setTestClient, stockUp } from "@/test/actions";
import { getVariantHeader, listMovements } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("movement history (SPEC-005 US-INV-03)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const a = await makeUser();
    const orgA = await makeOrg(a.userId, "RESELLER");
    const product = await makeProduct(orgA.id, { name: "Saia Midi" });
    const variant = await makeVariant(product.id, { size: "M", retail_price: 150 });
    const other = await makeProduct(orgA.id, { name: "Blusa" });

    const b = await makeUser();
    await makeOrg(b.userId, "RESELLER");

    // AC-INV-004-01: ENTRADA(+20), VENDA(-3), AJUSTE(-1).
    await stockUp(a.client, variant.id, 20);
    const sale = await a.client.rpc("confirm_sale", {
      p_payment_method: "PIX",
      p_items: [{ variant_id: variant.id, quantity: 3 }],
    });
    if (sale.error) throw sale.error;
    const adjust = await a.client.rpc("adjust_inventory", {
      p_variant_id: variant.id,
      p_delta: -1,
      p_note: "peça manchada",
    });
    if (adjust.error) throw adjust.error;

    return { a, b, product, variant, other, saleId: (sale.data as { id: string }).id };
  }

  beforeAll(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());

  it("lists the movements in order with the resulting balances (TC-INV-04)", async () => {
    setTestClient(ctx.a.client);
    const { items, nextCursor } = await listMovements(ctx.variant.id);

    expect(items.map((m) => m.type)).toEqual(["AJUSTE", "VENDA", "ENTRADA"]);
    expect(items.map((m) => m.balanceAfter)).toEqual([16, 17, 20]);
    expect(items.map((m) => m.quantity)).toEqual([-1, -3, 20]);
    expect(nextCursor).toBeNull();
  });

  it("keeps the origin and the reason of each movement (BR-INV-06)", async () => {
    setTestClient(ctx.a.client);
    const { items } = await listMovements(ctx.variant.id);

    expect(items[0]).toMatchObject({ note: "peça manchada", referenceType: "manual" });
    expect(items[1]).toMatchObject({ referenceType: "sale", referenceId: ctx.saleId });
  });

  it("filters by history tab", async () => {
    setTestClient(ctx.a.client);
    const sales = await listMovements(ctx.variant.id, { filter: "sales" });
    expect(sales.items.map((m) => m.type)).toEqual(["VENDA"]);

    const transfers = await listMovements(ctx.variant.id, { filter: "transfers" });
    expect(transfers.items).toHaveLength(0);
  });

  it("pages with the cursor without skipping or repeating movements", async () => {
    setTestClient(ctx.a.client);
    const first = await listMovements(ctx.variant.id, { limit: 2 });
    expect(first.items.map((m) => m.balanceAfter)).toEqual([16, 17]);
    expect(first.nextCursor).not.toBeNull();

    const second = await listMovements(ctx.variant.id, { limit: 2, before: first.nextCursor });
    expect(second.items.map((m) => m.balanceAfter)).toEqual([20]);
    expect(second.nextCursor).toBeNull();
  });

  it("loads the variant header with the current balance", async () => {
    setTestClient(ctx.a.client);
    const header = await getVariantHeader(ctx.product.id, ctx.variant.id);
    expect(header).toMatchObject({
      productName: "Saia Midi",
      descriptor: "M",
      stock: 16,
      level: "ok",
    });
  });

  it("does not load a variant under another product's URL", async () => {
    setTestClient(ctx.a.client);
    expect(await getVariantHeader(ctx.other.id, ctx.variant.id)).toBeNull();
  });

  it("hides another organization's history (TC-INV-10)", async () => {
    setTestClient(ctx.b.client);
    expect(await getVariantHeader(ctx.product.id, ctx.variant.id)).toBeNull();
    const { items } = await listMovements(ctx.variant.id);
    expect(items).toHaveLength(0);
  });
});
