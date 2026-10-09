import { beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import { addMember, makeNetwork, stockUp } from "@/test/actions";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

/**
 * VES-73 — accepted negotiations ≤ open offers ≤ stock, per variant
 * (BR-OFFER-11/12, BR-NEG-13/14; migration 0029).
 */
d("offer stock reservation (SPEC-008/009, VES-73)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica R");
    const network = await makeNetwork(factoryOrg.id, "Rede R");

    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Vendedora R");
    const buyer = await makeUser();
    const buyerOrg = await makeOrg(buyer.userId, "RESELLER", "RESELLER", "Compradora R");
    await addMember(network.id, sellerOrg.id, "ACTIVE");
    await addMember(network.id, buyerOrg.id, "ACTIVE");

    const product = await makeProduct(sellerOrg.id, { name: "Tênis Raro", brand: "Nike" });
    const variant = await makeVariant(product.id, { size: "38", retail_price: 900 });
    await stockUp(seller.client, variant.id, 5);

    return { network, seller, buyer, product, variant };
  }

  beforeEach(async () => {
    ctx = await setup();
  });

  async function publish(quantity: number) {
    return ctx.seller.client.rpc("publish_offer", {
      p_variant_id: ctx.variant.id,
      p_network_id: ctx.network.id,
      p_quantity: quantity,
      p_transfer_price: 500,
    });
  }

  async function offer(id: string) {
    const { data } = await admin()
      .from("offers")
      .select("quantity_remaining, status")
      .eq("id", id)
      .single();
    return data;
  }

  async function stock() {
    const { data } = await admin()
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", ctx.variant.id)
      .single();
    return data?.stock_on_hand;
  }

  async function propose(offerId: string, quantity: number) {
    const { data, error } = await ctx.buyer.client.rpc("open_negotiation", {
      p_offer_id: offerId,
      p_quantity: quantity,
      p_amount: 500 * quantity,
    });
    if (error) throw error;
    return (data as { id: string }).id;
  }

  async function act(negotiationId: string, action: "accept" | "cancel") {
    return ctx.seller.client.rpc("negotiation_transition", {
      p_negotiation_id: negotiationId,
      p_action: action,
    });
  }

  it("a second offer of the same variant only takes the free stock (TC-OFFER-16)", async () => {
    const first = await publish(3);
    expect(first.error).toBeNull();

    const tooMuch = await publish(3);
    expect(tooMuch.error?.message).toMatch(/Estoque livre insuficiente \(2 disponível/);

    const rest = await publish(2);
    expect(rest.error).toBeNull();
    expect((await publish(1)).error?.message).toMatch(/\(0 disponível/);
  });

  it("serialises two concurrent offers of the same variant (TC-OFFER-16)", async () => {
    const results = await Promise.all([publish(4), publish(4)]);
    expect(results.filter((r) => r.error === null)).toHaveLength(1);
    expect(results.find((r) => r.error !== null)?.error?.message).toMatch(/livre insuficiente/);
  });

  it("archiving to offers and direct offer updates obey the free stock (TC-OFFER-17)", async () => {
    const { data: o } = await publish(4);
    const offerId = (o as { id: string }).id;

    const archived = await ctx.seller.client.rpc("archive_product_to_offers", {
      p_product_id: ctx.product.id,
      p_network_id: ctx.network.id,
      p_items: [{ variant_id: ctx.variant.id, quantity: 2, transfer_price: 500 }],
    });
    expect(archived.error?.message).toMatch(/\(1 disponível/);

    // the owner RLS policy allows updates — the trigger still guards them
    await ctx.seller.client.from("offers").update({ status: "CANCELLED" }).eq("id", offerId);
    await publish(5);
    const revived = await ctx.seller.client
      .from("offers")
      .update({ status: "ACTIVE" })
      .eq("id", offerId);
    expect(revived.error?.message).toMatch(/livre insuficiente/);
    expect((await offer(offerId))?.status).toBe("CANCELLED");
  });

  it("accepting reserves the quantity inside the offer (TC-NEG-20)", async () => {
    const { data: o } = await publish(3);
    const offerId = (o as { id: string }).id;
    const a = await propose(offerId, 2);
    const b = await propose(offerId, 2);

    expect((await act(a, "accept")).error).toBeNull();
    const second = await act(b, "accept");
    expect(second.error?.message).toMatch(/não tem quantidade livre para aceitar \(restam 1/);

    // cancelling the accepted one frees its reservation
    expect((await act(a, "cancel")).error).toBeNull();
    expect((await act(b, "accept")).error).toBeNull();
  });

  it("a local sale shrinks the newest offers first and cancels the empty ones (TC-OFFER-18)", async () => {
    const older = ((await publish(2)).data as { id: string }).id;
    const newer = ((await publish(3)).data as { id: string }).id;

    const sell = (quantity: number) =>
      ctx.seller.client.rpc("confirm_sale", {
        p_payment_method: "PIX",
        p_items: [{ variant_id: ctx.variant.id, quantity }],
      });

    expect((await sell(2)).error).toBeNull();
    expect(await offer(newer)).toEqual({ quantity_remaining: 1, status: "ACTIVE" });
    expect(await offer(older)).toEqual({ quantity_remaining: 2, status: "ACTIVE" });

    expect((await sell(2)).error).toBeNull();
    expect(await offer(newer)).toEqual({ quantity_remaining: 0, status: "CANCELLED" });
    expect(await offer(older)).toEqual({ quantity_remaining: 1, status: "ACTIVE" });
  });

  it("an adjustment never goes below the accepted reservations (TC-NEG-21)", async () => {
    const offerId = ((await publish(3)).data as { id: string }).id;
    const neg = await propose(offerId, 2);
    expect((await act(neg, "accept")).error).toBeNull();

    const adjust = (delta: number) =>
      ctx.seller.client.rpc("adjust_inventory", {
        p_variant_id: ctx.variant.id,
        p_delta: delta,
        p_note: "Avaria",
      });

    // 5 → 2: the offer keeps the 2 units the negotiation reserved
    expect((await adjust(-3)).error).toBeNull();
    expect(await offer(offerId)).toEqual({ quantity_remaining: 2, status: "ACTIVE" });

    const below = await adjust(-1);
    expect(below.error?.message).toMatch(/reservado para negociações aceitas \(2 un\.\)/);
    expect(await stock()).toBe(2);

    // the reserved units still transfer
    const done = await ctx.seller.client.rpc("complete_negotiation", { p_negotiation_id: neg });
    expect(done.error).toBeNull();
    expect(await stock()).toBe(0);
    expect(await offer(offerId)).toEqual({ quantity_remaining: 0, status: "FULFILLED" });
  });
});
