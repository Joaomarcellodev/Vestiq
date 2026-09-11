import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import { addMember, makeNetwork, stockUp } from "@/test/actions";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

type Client = SupabaseClient<Database>;

/** Negotiation RPC rules beyond the happy path — specs/negotiations/TESTS.md. */
d("negotiation rules (SPEC-009 TC-NEG-02..15)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN");
    const network = await makeNetwork(factoryOrg.id);

    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Vendedora Regras");
    const buyer = await makeUser();
    const buyerOrg = await makeOrg(buyer.userId, "RESELLER", "RESELLER", "Compradora Regras");
    await addMember(network.id, sellerOrg.id);
    await addMember(network.id, buyerOrg.id);

    const productName = `Casaco ${Math.random().toString(36).slice(2, 7)}`;
    const product = await makeProduct(sellerOrg.id, { name: productName, brand: "Vestiq" });
    const variant = await makeVariant(product.id, {
      size: "M",
      color: "Azul",
      retail_price: 300,
      cost_price: 120,
    });
    await stockUp(seller.client, variant.id, 6);

    const { data: offer, error } = await seller.client.rpc("publish_offer", {
      p_variant_id: variant.id,
      p_network_id: network.id,
      p_quantity: 4,
      p_transfer_price: 200,
    });
    if (error) throw error;

    return {
      seller,
      sellerOrg,
      buyer,
      buyerOrg,
      productName,
      variant,
      offerId: (offer as unknown as { id: string }).id,
    };
  }

  beforeEach(async () => {
    ctx = await setup();
  });

  const open = (quantity = 2, amount = 400, message?: string) =>
    ctx.buyer.client.rpc("open_negotiation", {
      p_offer_id: ctx.offerId,
      p_quantity: quantity,
      p_amount: amount,
      p_message: message,
    });

  const openId = async (quantity = 2, amount = 400, message?: string) => {
    const { data, error } = await open(quantity, amount, message);
    if (error) throw error;
    return (data as unknown as { id: string }).id;
  };

  const act = (client: Client, id: string, action: string, message?: string) =>
    client.rpc("negotiation_transition", {
      p_negotiation_id: id,
      p_action: action,
      p_message: message,
    });

  const complete = (client: Client, id: string) =>
    client.rpc("complete_negotiation", { p_negotiation_id: id });

  const status = async (id: string) =>
    (await admin().from("negotiations").select("status").eq("id", id).single()).data?.status;

  const stock = async (variantId: string) =>
    (await admin().from("product_variants").select("stock_on_hand").eq("id", variantId).single())
      .data?.stock_on_hand;

  it("records both parties, offer, quantity, amount and the opening message (TC-NEG-02)", async () => {
    const { data, error } = await open(2, 380, "Pago à vista");
    expect(error).toBeNull();
    const neg = data as unknown as Record<string, unknown> & { id: string; amount: number };
    expect(neg).toMatchObject({
      seller_org_id: ctx.sellerOrg.id,
      buyer_org_id: ctx.buyerOrg.id,
      offer_id: ctx.offerId,
      quantity: 2,
      status: "PENDING",
    });
    expect(Number(neg.amount)).toBe(380);

    const { data: events } = await ctx.buyer.client
      .from("negotiation_events")
      .select("type, body")
      .eq("negotiation_id", neg.id);
    expect(events).toEqual([{ type: "CREATED", body: "Pago à vista" }]);
  });

  it("refuses more units than the offer has left, saying how many remain (TC-NEG-03)", async () => {
    const { error } = await open(5);
    expect(error?.message).toMatch(/restam 4/i);
  });

  it("refuses proposals on your own offer, from outside the network or without a value", async () => {
    const own = await ctx.seller.client.rpc("open_negotiation", {
      p_offer_id: ctx.offerId,
      p_quantity: 1,
      p_amount: 100,
    });
    expect(own.error?.message).toMatch(/dona desta oferta/i);

    const outsider = await makeUser();
    await makeOrg(outsider.userId, "RESELLER");
    const out = await outsider.client.rpc("open_negotiation", {
      p_offer_id: ctx.offerId,
      p_quantity: 1,
      p_amount: 100,
    });
    expect(out.error?.message).toMatch(/não participa desta rede/i);

    expect((await open(1, 0)).error?.message).toMatch(/valor válido/i);
  });

  it("refuses proposals on a cancelled offer", async () => {
    await ctx.seller.client.from("offers").update({ status: "CANCELLED" }).eq("id", ctx.offerId);
    expect((await open(1)).error?.message).toMatch(/oferta indisponível/i);
  });

  it("lets only the buyer cancel a pending proposal (TC-NEG-08)", async () => {
    const id = await openId();
    expect((await act(ctx.seller.client, id, "cancel")).error).not.toBeNull();

    expect((await act(ctx.buyer.client, id, "cancel", "Mudei de ideia")).error).toBeNull();
    expect(await status(id)).toBe("CANCELLED");
    const { data: events } = await admin()
      .from("negotiation_events")
      .select("type, body")
      .eq("negotiation_id", id)
      .order("created_at");
    expect(events?.at(-1)).toEqual({ type: "CANCELLED", body: "Mudei de ideia" });
  });

  it("lets either party cancel an accepted negotiation", async () => {
    const bySeller = await openId(1);
    await act(ctx.seller.client, bySeller, "accept");
    expect((await act(ctx.seller.client, bySeller, "cancel")).error).toBeNull();

    const byBuyer = await openId(1);
    await act(ctx.seller.client, byBuyer, "accept");
    expect((await act(ctx.buyer.client, byBuyer, "cancel")).error).toBeNull();

    expect(await status(bySeller)).toBe("CANCELLED");
    expect(await status(byBuyer)).toBe("CANCELLED");
  });

  it("treats a rejected negotiation as terminal (TC-NEG-06)", async () => {
    const id = await openId();
    expect((await act(ctx.seller.client, id, "reject", "Preço baixo")).error).toBeNull();

    expect((await act(ctx.seller.client, id, "accept")).error).not.toBeNull();
    expect((await act(ctx.buyer.client, id, "cancel")).error).not.toBeNull();
    expect((await act(ctx.buyer.client, id, "message", "E agora?")).error?.message).toMatch(
      /encerrada/i,
    );
    expect(await status(id)).toBe("REJECTED");
  });

  it("keeps the seller-only actions away from the buyer (TC-NEG-07)", async () => {
    const id = await openId();
    expect((await act(ctx.buyer.client, id, "accept")).error?.message).toMatch(/ação inválida/i);
    expect((await act(ctx.buyer.client, id, "reject")).error?.message).toMatch(/ação inválida/i);

    await act(ctx.seller.client, id, "accept");
    expect((await complete(ctx.buyer.client, id)).error?.message).toMatch(/apenas a vendedora/i);
    expect(await status(id)).toBe("ACCEPTED");
  });

  it("hides the negotiation from an unrelated organization and blocks its actions (TC-NEG-09)", async () => {
    const id = await openId();
    const stranger = await makeUser();
    await makeOrg(stranger.userId, "RESELLER");

    expect(
      (await stranger.client.from("negotiations").select("id").eq("id", id)).data,
    ).toHaveLength(0);
    expect(
      (await stranger.client.from("negotiation_events").select("id").eq("negotiation_id", id)).data,
    ).toHaveLength(0);
    expect((await act(stranger.client, id, "message", "oi")).error?.message).toMatch(
      /not authorized/i,
    );
    expect((await complete(stranger.client, id)).error).not.toBeNull();
    expect(await status(id)).toBe("PENDING");
  });

  it("rejects completing a pending negotiation and unknown actions", async () => {
    const id = await openId();
    expect((await complete(ctx.seller.client, id)).error?.message).toMatch(/precisa estar aceita/i);
    expect((await act(ctx.seller.client, id, "delete")).error?.message).toMatch(
      /ação desconhecida/i,
    );
  });

  it("writes the transfer to both ledgers and prices the received variant (TC-NEG-10/11)", async () => {
    const id = await openId(3, 540);
    await act(ctx.seller.client, id, "accept");
    const { data, error } = await complete(ctx.seller.client, id);
    expect(error).toBeNull();
    expect((data as unknown as { completed_at: string | null }).completed_at).not.toBeNull();

    const { data: movements } = await admin()
      .from("inventory_movements")
      .select("organization_id, type, quantity")
      .eq("reference_id", id);
    expect(movements).toHaveLength(2);
    expect(movements).toEqual(
      expect.arrayContaining([
        { organization_id: ctx.sellerOrg.id, type: "TRANSFERENCIA_SAIDA", quantity: -3 },
        { organization_id: ctx.buyerOrg.id, type: "TRANSFERENCIA_ENTRADA", quantity: 3 },
      ]),
    );

    // The buyer gets a matching variant costed at the negotiated unit price.
    const { data: received } = await ctx.buyer.client
      .from("product_variants")
      .select("size, color, cost_price, retail_price, stock_on_hand");
    expect(received).toHaveLength(1);
    expect(received![0]).toMatchObject({ size: "M", color: "Azul", stock_on_hand: 3 });
    expect(Number(received![0]!.cost_price)).toBe(180);
    expect(Number(received![0]!.retail_price)).toBe(300);
    expect(await stock(ctx.variant.id)).toBe(3);
  });

  it("reuses the buyer's product on a second transfer and fulfils the offer (TC-NEG-11)", async () => {
    for (const quantity of [3, 1]) {
      const id = await openId(quantity, 100 * quantity);
      await act(ctx.seller.client, id, "accept");
      expect((await complete(ctx.seller.client, id)).error).toBeNull();
    }

    const { data: products } = await ctx.buyer.client
      .from("products")
      .select("id, product_variants(stock_on_hand)")
      .eq("name", ctx.productName);
    expect(products).toHaveLength(1);
    expect(products![0]!.product_variants[0]?.stock_on_hand).toBe(4);

    const { data: offer } = await ctx.seller.client
      .from("offers")
      .select("quantity_remaining, status")
      .eq("id", ctx.offerId)
      .single();
    expect(offer).toEqual({ quantity_remaining: 0, status: "FULFILLED" });
  });

  it("undoes the whole transfer when the destination movement fails (TC-NEG-13)", async () => {
    const id = await openId(2, 400);
    await act(ctx.seller.client, id, "accept");

    // Fault injection: the buyer's matching variant sits at the integer ceiling,
    // so TRANSFERENCIA_ENTRADA overflows after the source movement was applied.
    const dest = await makeProduct(ctx.buyerOrg.id, { name: ctx.productName, brand: "Vestiq" });
    const destVariant = await makeVariant(dest.id, { size: "M", color: "Azul" });
    await admin()
      .from("product_variants")
      .update({ stock_on_hand: 2147483647 })
      .eq("id", destVariant.id);

    expect((await complete(ctx.seller.client, id)).error).not.toBeNull();
    expect(await status(id)).toBe("ACCEPTED");
    expect(await stock(ctx.variant.id)).toBe(6);

    const { count } = await admin()
      .from("inventory_movements")
      .select("id", { count: "exact", head: true })
      .eq("reference_id", id);
    expect(count).toBe(0);
    const { data: offer } = await admin()
      .from("offers")
      .select("quantity_remaining")
      .eq("id", ctx.offerId)
      .single();
    expect(offer?.quantity_remaining).toBe(4);
  });

  it("keeps the full, ordered, append-only history after completion (TC-NEG-15)", async () => {
    const id = await openId(1, 200, "Oi");
    await act(ctx.seller.client, id, "message", "Fecho por 200");
    await act(ctx.seller.client, id, "accept");
    await complete(ctx.seller.client, id);

    const { data: events } = await ctx.buyer.client
      .from("negotiation_events")
      .select("type")
      .eq("negotiation_id", id)
      .order("created_at");
    expect(events!.map((e) => e.type)).toEqual(["CREATED", "MESSAGE", "ACCEPTED", "COMPLETED"]);

    const forged = await ctx.buyer.client
      .from("negotiation_events")
      .insert({ negotiation_id: id, type: "MESSAGE", body: "forjado" });
    expect(forged.error).not.toBeNull();
    await ctx.seller.client.from("negotiation_events").delete().eq("negotiation_id", id);
    const { count } = await admin()
      .from("negotiation_events")
      .select("id", { count: "exact", head: true })
      .eq("negotiation_id", id);
    expect(count).toBe(4);
  });
});
