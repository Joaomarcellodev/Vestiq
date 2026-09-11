import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import { clearTestClient, setTestClient, stockUp } from "@/test/actions";
import { getSalesSummary, listSales } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

type Method = "PIX" | "CARTAO" | "DINHEIRO";
type SaleRow = { id: string; subtotal: number; total: number; payment_method: Method };

/** confirm_sale / cancel_sale rules beyond the happy path — specs/sales/TESTS.md. */
d("sales rules (SPEC-007 TC-SALE-03, 06..13)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const user = await makeUser();
    const org = await makeOrg(user.userId, "RESELLER");
    const product = await makeProduct(org.id, {
      name: `Vestido ${Math.random().toString(36).slice(2, 7)}`,
    });
    const p = await makeVariant(product.id, { size: "P", retail_price: 150 });
    const m = await makeVariant(product.id, { size: "M", retail_price: 170 });
    await stockUp(user.client, p.id, 5);
    await stockUp(user.client, m.id, 3);
    return { user, org, product, p, m };
  }

  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());

  const sell = (items: { variant_id: string; quantity: number }[], method: Method = "PIX") =>
    ctx.user.client.rpc("confirm_sale", { p_payment_method: method, p_items: items });

  const sellOk = async (items: { variant_id: string; quantity: number }[], method?: Method) => {
    const { data, error } = await sell(items, method);
    if (error) throw error;
    return data as unknown as SaleRow;
  };

  const stock = async (variantId: string) =>
    (await admin().from("product_variants").select("stock_on_hand").eq("id", variantId).single())
      .data?.stock_on_hand;

  const countMovements = async (filter: {
    referenceId?: string;
    variantId?: string;
    type: string;
  }) => {
    let q = admin()
      .from("inventory_movements")
      .select("id", { count: "exact", head: true })
      .eq("type", filter.type as "VENDA");
    if (filter.referenceId) q = q.eq("reference_id", filter.referenceId);
    if (filter.variantId) q = q.eq("product_variant_id", filter.variantId);
    return (await q).count;
  };

  it("stores each item with its unit price and line total (TC-SALE-03)", async () => {
    const sale = await sellOk([
      { variant_id: ctx.p.id, quantity: 2 },
      { variant_id: ctx.m.id, quantity: 1 },
    ]);
    expect(Number(sale.subtotal)).toBe(470);

    const { data: items } = await ctx.user.client
      .from("sale_items")
      .select("product_variant_id, quantity, unit_price, line_total")
      .eq("sale_id", sale.id);
    expect(items).toHaveLength(2);
    const p = items!.find((i) => i.product_variant_id === ctx.p.id)!;
    expect(p.quantity).toBe(2);
    expect(Number(p.unit_price)).toBe(150);
    expect(Number(p.line_total)).toBe(300);
    expect(Number(items!.find((i) => i.product_variant_id === ctx.m.id)!.line_total)).toBe(170);
  });

  it("persists the payment method and rejects one outside the enum (TC-SALE-06)", async () => {
    const sale = await sellOk([{ variant_id: ctx.p.id, quantity: 1 }], "DINHEIRO");
    expect(sale.payment_method).toBe("DINHEIRO");

    const bad = await sell([{ variant_id: ctx.p.id, quantity: 1 }], "BOLETO" as Method);
    expect(bad.error).not.toBeNull();
    expect(await stock(ctx.p.id)).toBe(4);
  });

  it("writes one VENDA movement per item, referencing the sale (TC-SALE-07)", async () => {
    const sale = await sellOk([
      { variant_id: ctx.p.id, quantity: 2 },
      { variant_id: ctx.m.id, quantity: 3 },
    ]);
    const { data: movements } = await ctx.user.client
      .from("inventory_movements")
      .select("product_variant_id, type, quantity, balance_after, reference_type")
      .eq("reference_id", sale.id);

    expect(movements).toHaveLength(2);
    expect(movements!.every((m) => m.type === "VENDA" && m.reference_type === "sale")).toBe(true);
    expect(movements!.find((m) => m.product_variant_id === ctx.p.id)).toMatchObject({
      quantity: -2,
      balance_after: 3,
    });
    expect(movements!.find((m) => m.product_variant_id === ctx.m.id)).toMatchObject({
      quantity: -3,
      balance_after: 0,
    });
  });

  it("refuses the whole sale when one item exceeds stock, naming the product (TC-SALE-08)", async () => {
    const salesBefore = (await listSalesOf(ctx.org.id)).length;
    const { error } = await sell([
      { variant_id: ctx.p.id, quantity: 1 },
      { variant_id: ctx.m.id, quantity: 4 },
    ]);
    expect(error?.message).toMatch(/estoque insuficiente/i);
    expect(error?.message).toContain(ctx.product.name);

    expect((await listSalesOf(ctx.org.id)).length).toBe(salesBefore);
    expect(await stock(ctx.p.id)).toBe(5);
    expect(await countMovements({ variantId: ctx.p.id, type: "VENDA" })).toBe(0);
  });

  it("blocks archived variants, non-positive quantities and empty carts", async () => {
    await admin()
      .from("product_variants")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", ctx.m.id);
    expect((await sell([{ variant_id: ctx.m.id, quantity: 1 }])).error?.message).toMatch(
      /indisponível/i,
    );
    expect((await sell([{ variant_id: ctx.p.id, quantity: 0 }])).error?.message).toMatch(
      /quantidade inválida/i,
    );
    expect((await sell([])).error?.message).toMatch(/ao menos um item/i);
    expect(await stock(ctx.p.id)).toBe(5);
  });

  it("accepts a discount equal to the subtotal (total zero)", async () => {
    const { data, error } = await ctx.user.client.rpc("confirm_sale", {
      p_payment_method: "PIX",
      p_items: [{ variant_id: ctx.p.id, quantity: 1 }],
      p_discount: 150,
    });
    expect(error).toBeNull();
    expect(Number((data as unknown as SaleRow).total)).toBe(0);
  });

  it("keeps a cancelled sale in the history with reason and timestamp (TC-SALE-09)", async () => {
    const sale = await sellOk([{ variant_id: ctx.p.id, quantity: 1 }]);
    await ctx.user.client.rpc("cancel_sale", { p_sale_id: sale.id, p_reason: "cliente desistiu" });

    const { data: row } = await ctx.user.client
      .from("sales")
      .select("status, cancel_reason, cancelled_at")
      .eq("id", sale.id)
      .single();
    expect(row).toMatchObject({ status: "CANCELLED", cancel_reason: "cliente desistiu" });
    expect(row?.cancelled_at).not.toBeNull();
  });

  it("reverses each item with a CANCELAMENTO movement (TC-SALE-10)", async () => {
    const sale = await sellOk([
      { variant_id: ctx.p.id, quantity: 2 },
      { variant_id: ctx.m.id, quantity: 1 },
    ]);
    await ctx.user.client.rpc("cancel_sale", { p_sale_id: sale.id, p_reason: "erro" });

    const { data: movements } = await ctx.user.client
      .from("inventory_movements")
      .select("product_variant_id, quantity")
      .eq("reference_id", sale.id)
      .eq("type", "CANCELAMENTO");
    expect(movements).toHaveLength(2);
    expect(movements!.find((m) => m.product_variant_id === ctx.p.id)?.quantity).toBe(2);
    expect(await stock(ctx.p.id)).toBe(5);
    expect(await stock(ctx.m.id)).toBe(3);
  });

  it("rolls the whole cancellation back when one reversal fails (TC-SALE-11)", async () => {
    const sale = await sellOk([
      { variant_id: ctx.p.id, quantity: 1 },
      { variant_id: ctx.m.id, quantity: 1 },
    ]);
    // Fault injection: a balance at the integer ceiling makes the +1 reversal overflow.
    await admin().from("product_variants").update({ stock_on_hand: 2147483647 }).eq("id", ctx.m.id);

    const { error } = await ctx.user.client.rpc("cancel_sale", {
      p_sale_id: sale.id,
      p_reason: "x",
    });
    expect(error).not.toBeNull();

    const { data: row } = await ctx.user.client
      .from("sales")
      .select("status")
      .eq("id", sale.id)
      .single();
    expect(row?.status).toBe("CONFIRMED");
    expect(await stock(ctx.p.id)).toBe(4);
    expect(await countMovements({ referenceId: sale.id, type: "CANCELAMENTO" })).toBe(0);
  });

  it("serialises concurrent sales of the last unit: one wins, one fails (TC-SALE-12)", async () => {
    const product = await makeProduct(ctx.org.id);
    const last = await makeVariant(product.id, { size: "U", retail_price: 50 });
    await stockUp(ctx.user.client, last.id, 1);

    const results = await Promise.all([
      sell([{ variant_id: last.id, quantity: 1 }]),
      sell([{ variant_id: last.id, quantity: 1 }]),
    ]);
    expect(results.filter((r) => r.error === null)).toHaveLength(1);
    expect(results.filter((r) => r.error !== null)).toHaveLength(1);
    expect(await stock(last.id)).toBe(0);
  });

  it("counts only confirmed sales in the revenue summary (TC-SALE-13)", async () => {
    await sellOk([{ variant_id: ctx.p.id, quantity: 1 }]);
    const dropped = await sellOk([{ variant_id: ctx.m.id, quantity: 1 }]);
    await ctx.user.client.rpc("cancel_sale", { p_sale_id: dropped.id, p_reason: "x" });

    setTestClient(ctx.user.client);
    expect(await getSalesSummary()).toMatchObject({ count: 1, revenue: 150, averageTicket: 150 });
    expect((await listSales()).map((s) => s.status).sort()).toEqual(["CANCELLED", "CONFIRMED"]);
  });

  it("isolates sales from other organizations (RLS + RPC guards)", async () => {
    const sale = await sellOk([{ variant_id: ctx.p.id, quantity: 1 }]);
    const other = await makeUser();
    await makeOrg(other.userId, "RESELLER");

    expect((await other.client.from("sales").select("id").eq("id", sale.id)).data).toHaveLength(0);
    expect(
      (await other.client.from("sale_items").select("id").eq("sale_id", sale.id)).data,
    ).toHaveLength(0);
    expect(
      (await other.client.rpc("cancel_sale", { p_sale_id: sale.id, p_reason: "x" })).error?.message,
    ).toMatch(/not authorized/i);
    expect(
      (
        await other.client.rpc("confirm_sale", {
          p_payment_method: "PIX",
          p_items: [{ variant_id: ctx.p.id, quantity: 1 }],
        })
      ).error?.message,
    ).toMatch(/not authorized/i);
    expect(await stock(ctx.p.id)).toBe(4);
  });

  it("rejects a cart that mixes in another organization's variant", async () => {
    const other = await makeUser();
    const otherOrg = await makeOrg(other.userId, "RESELLER");
    const foreign = await makeVariant((await makeProduct(otherOrg.id)).id);
    await stockUp(other.client, foreign.id, 2);

    const { error } = await sell([
      { variant_id: ctx.p.id, quantity: 1 },
      { variant_id: foreign.id, quantity: 1 },
    ]);
    expect(error?.message).toMatch(/item inválido/i);
    expect(await stock(foreign.id)).toBe(2);
    expect(await stock(ctx.p.id)).toBe(5);
  });
});

async function listSalesOf(orgId: string) {
  const { data } = await admin().from("sales").select("id").eq("organization_id", orgId);
  return data ?? [];
}
