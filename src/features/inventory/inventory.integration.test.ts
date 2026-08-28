import { beforeAll, describe, expect, it } from "vitest";
import { makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("inventory RPCs + RLS (SPEC-005)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const a = await makeUser();
    const orgA = await makeOrg(a.userId, "RESELLER");
    const productA = await makeProduct(orgA.id, { name: "Vestido Floral" });
    const variantA = await makeVariant(productA.id, { size: "P", retail_price: 200 });

    const b = await makeUser();
    const orgB = await makeOrg(b.userId, "RESELLER");

    return { a, orgA, variantA, b, orgB };
  }

  beforeAll(async () => {
    ctx = await setup();
  });

  it("records an entry and updates the cached balance (RF-INV-002/003)", async () => {
    const { error } = await ctx.a.client.rpc("record_inventory_entry", {
      p_variant_id: ctx.variantA.id,
      p_quantity: 20,
      p_note: "compra jan",
    });
    expect(error).toBeNull();

    const { data } = await ctx.a.client
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", ctx.variantA.id)
      .single();
    expect(data?.stock_on_hand).toBe(20);
  });

  it("keeps stock_on_hand equal to the sum of movements (AC-INV-inv)", async () => {
    await ctx.a.client.rpc("adjust_inventory", {
      p_variant_id: ctx.variantA.id,
      p_delta: -3,
      p_note: "perda",
    });
    const { data: variant } = await ctx.a.client
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", ctx.variantA.id)
      .single();
    const { data: movements } = await ctx.a.client
      .from("inventory_movements")
      .select("quantity")
      .eq("product_variant_id", ctx.variantA.id);
    const sum = (movements ?? []).reduce((acc, m) => acc + m.quantity, 0);
    expect(variant?.stock_on_hand).toBe(sum);
  });

  it("blocks an adjustment that would make stock negative (RF-INV-005)", async () => {
    const { error } = await ctx.a.client.rpc("adjust_inventory", {
      p_variant_id: ctx.variantA.id,
      p_delta: -9999,
      p_note: "erro",
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/insuficiente/i);
  });

  it("requires a reason for adjustments (BR-INV-09)", async () => {
    const { error } = await ctx.a.client.rpc("adjust_inventory", {
      p_variant_id: ctx.variantA.id,
      p_delta: -1,
      p_note: "",
    });
    expect(error).not.toBeNull();
  });

  it("isolates movements between organizations (RF-CUSTOMER-003 pattern / RLS)", async () => {
    const { data } = await ctx.b.client
      .from("inventory_movements")
      .select("id")
      .eq("product_variant_id", ctx.variantA.id);
    expect(data ?? []).toHaveLength(0);
  });

  it("forbids org B from moving org A's stock via RPC", async () => {
    const { error } = await ctx.b.client.rpc("record_inventory_entry", {
      p_variant_id: ctx.variantA.id,
      p_quantity: 5,
      p_note: "invasao",
    });
    expect(error).not.toBeNull();
  });

  it("does not allow direct writes to inventory_movements (RF-INV-006)", async () => {
    const { error } = await ctx.a.client.from("inventory_movements").insert({
      organization_id: ctx.orgA.id,
      product_variant_id: ctx.variantA.id,
      type: "AJUSTE",
      quantity: 1,
      balance_after: 999,
    });
    expect(error).not.toBeNull();
  });
});
