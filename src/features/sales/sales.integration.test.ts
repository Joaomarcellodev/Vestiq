import { beforeAll, describe, expect, it } from "vitest";
import { makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("confirm_sale / cancel_sale RPC (SPEC-007, SDD §38)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const a = await makeUser();
    const org = await makeOrg(a.userId, "RESELLER");
    const product = await makeProduct(org.id, { name: "Camiseta" });
    const pVar = await makeVariant(product.id, { size: "P", retail_price: 100 });
    const mVar = await makeVariant(product.id, { size: "M", retail_price: 100 });
    await a.client.rpc("record_inventory_entry", { p_variant_id: pVar.id, p_quantity: 10 });
    await a.client.rpc("record_inventory_entry", { p_variant_id: mVar.id, p_quantity: 1 });
    return { a, org, pVar, mVar };
  }

  beforeAll(async () => {
    ctx = await setup();
  });

  async function stock(id: string) {
    const { data } = await ctx.a.client
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", id)
      .single();
    return data?.stock_on_hand ?? -1;
  }

  it("confirms a multi-item sale and decrements stock (RF-SALE-006)", async () => {
    const { data, error } = await ctx.a.client.rpc("confirm_sale", {
      p_payment_method: "PIX",
      p_discount: 20,
      p_items: [
        { variant_id: ctx.pVar.id, quantity: 3 },
        { variant_id: ctx.mVar.id, quantity: 1 },
      ],
    });
    expect(error).toBeNull();
    expect(Number((data as { total: number }).total)).toBe(380); // 400 - 20
    expect(await stock(ctx.pVar.id)).toBe(7);
    expect(await stock(ctx.mVar.id)).toBe(0);
  });

  it("blocks a sale above available stock, atomically (RF-SALE-007)", async () => {
    const before = await stock(ctx.pVar.id);
    const { error } = await ctx.a.client.rpc("confirm_sale", {
      p_payment_method: "DINHEIRO",
      p_items: [
        { variant_id: ctx.pVar.id, quantity: 2 },
        { variant_id: ctx.mVar.id, quantity: 5 }, // only 0 left
      ],
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/insuficiente/i);
    expect(await stock(ctx.pVar.id)).toBe(before); // nothing changed
  });

  it("rejects a discount above the subtotal (BR-SALE-02)", async () => {
    const { error } = await ctx.a.client.rpc("confirm_sale", {
      p_payment_method: "PIX",
      p_discount: 99999,
      p_items: [{ variant_id: ctx.pVar.id, quantity: 1 }],
    });
    expect(error).not.toBeNull();
  });

  it("cancels a sale and restores stock (RF-SALE-008/009)", async () => {
    const { data: sale } = await ctx.a.client.rpc("confirm_sale", {
      p_payment_method: "PIX",
      p_items: [{ variant_id: ctx.pVar.id, quantity: 2 }],
    });
    const afterSale = await stock(ctx.pVar.id);

    const saleId = (sale as { id: string }).id;
    const { data: cancelled, error } = await ctx.a.client.rpc("cancel_sale", {
      p_sale_id: saleId,
      p_reason: "erro de digitação",
    });
    expect(error).toBeNull();
    expect((cancelled as { status: string }).status).toBe("CANCELLED");
    expect(await stock(ctx.pVar.id)).toBe(afterSale + 2);

    // still in history
    const { data: hist } = await ctx.a.client
      .from("sales")
      .select("id, status")
      .eq("id", saleId)
      .single();
    expect(hist?.status).toBe("CANCELLED");
  });

  it("does not double-cancel (BR-SALE-07)", async () => {
    const { data: sale } = await ctx.a.client.rpc("confirm_sale", {
      p_payment_method: "PIX",
      p_items: [{ variant_id: ctx.pVar.id, quantity: 1 }],
    });
    const saleId = (sale as { id: string }).id;
    await ctx.a.client.rpc("cancel_sale", { p_sale_id: saleId, p_reason: "x" });
    const { error } = await ctx.a.client.rpc("cancel_sale", { p_sale_id: saleId, p_reason: "y" });
    expect(error).not.toBeNull();
  });
});
