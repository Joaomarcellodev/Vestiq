import { beforeAll, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

/** Full network flow: factory → network → 2 resellers → offer → negotiation → transfer. */
d("negotiation + transfer (SPEC-003/008/009, SDD §35 core)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const db = admin();

    const factoryUser = await makeUser();
    const factory = await makeOrg(factoryUser.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica X");

    const sellerUser = await makeUser();
    const seller = await makeOrg(sellerUser.userId, "RESELLER", "RESELLER", "Vendedora");
    const buyerUser = await makeUser();
    const buyer = await makeOrg(buyerUser.userId, "RESELLER", "RESELLER", "Compradora");

    const { data: network } = await db
      .from("factory_networks")
      .insert({ factory_id: factory.id, name: "Rede X" })
      .select()
      .single();

    for (const org of [seller, buyer]) {
      await db.from("network_members").insert({
        network_id: network!.id,
        reseller_id: org.id,
        invited_email: `${org.id}@x.test`,
        status: "ACTIVE",
        joined_at: new Date().toISOString(),
      });
    }

    const product = await makeProduct(seller.id, { name: "Bolsa Rara", brand: "Chanel" });
    const variant = await makeVariant(product.id, {
      size: "Único",
      retail_price: 5000,
      cost_price: 3000,
    });
    await sellerUser.client.rpc("record_inventory_entry", {
      p_variant_id: variant.id,
      p_quantity: 5,
    });

    return { db, network: network!, sellerUser, seller, buyerUser, buyer, variant };
  }

  beforeAll(async () => {
    ctx = await setup();
  });

  async function stock(client: typeof ctx.sellerUser.client, variantId: string) {
    const { data } = await client
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", variantId)
      .single();
    return data?.stock_on_hand ?? -1;
  }

  it("publishes an offer without reserving stock (RF-OFFER-001/003)", async () => {
    const { data, error } = await ctx.sellerUser.client.rpc("publish_offer", {
      p_variant_id: ctx.variant.id,
      p_network_id: ctx.network.id,
      p_quantity: 3,
      p_transfer_price: 4000,
    });
    expect(error).toBeNull();
    expect((data as { quantity_remaining: number }).quantity_remaining).toBe(3);
    expect(await stock(ctx.sellerUser.client, ctx.variant.id)).toBe(5);
    (ctx as unknown as { offerId: string }).offerId = (data as { id: string }).id;
  });

  it("rejects an offer larger than stock (RF-OFFER-003)", async () => {
    const { error } = await ctx.sellerUser.client.rpc("publish_offer", {
      p_variant_id: ctx.variant.id,
      p_network_id: ctx.network.id,
      p_quantity: 99,
      p_transfer_price: 4000,
    });
    expect(error).not.toBeNull();
  });

  it("lets a network peer see the offer but not private data (RF-OFFER-004, SDD §8)", async () => {
    const { data: offers } = await ctx.buyerUser.client
      .from("offers")
      .select("id, quantity_remaining, transfer_price");
    expect((offers ?? []).length).toBe(1);

    // buyer cannot read seller's stock ledger
    const { data: mov } = await ctx.buyerUser.client
      .from("inventory_movements")
      .select("id")
      .eq("product_variant_id", ctx.variant.id);
    expect(mov ?? []).toHaveLength(0);
  });

  it("runs proposal → accept → complete with a transactional transfer (RF-NEG-007/008)", async () => {
    const offerId = (ctx as unknown as { offerId: string }).offerId;

    const { data: neg, error: negErr } = await ctx.buyerUser.client.rpc("open_negotiation", {
      p_offer_id: offerId,
      p_quantity: 2,
      p_amount: 8000,
      p_message: "Tenho interesse",
    });
    expect(negErr).toBeNull();
    const negId = (neg as { id: string }).id;

    // buyer cannot accept their own proposal
    const badAccept = await ctx.buyerUser.client.rpc("negotiation_transition", {
      p_negotiation_id: negId,
      p_action: "accept",
    });
    expect(badAccept.error).not.toBeNull();

    const { error: accErr } = await ctx.sellerUser.client.rpc("negotiation_transition", {
      p_negotiation_id: negId,
      p_action: "accept",
    });
    expect(accErr).toBeNull();

    const sellerBefore = await stock(ctx.sellerUser.client, ctx.variant.id);

    const { data: done, error: doneErr } = await ctx.sellerUser.client.rpc("complete_negotiation", {
      p_negotiation_id: negId,
    });
    expect(doneErr).toBeNull();
    expect((done as { status: string }).status).toBe("COMPLETED");

    // source down by 2
    expect(await stock(ctx.sellerUser.client, ctx.variant.id)).toBe(sellerBefore - 2);

    // destination got a matching variant with +2
    const { data: buyerVariants } = await ctx.buyerUser.client
      .from("product_variants")
      .select("stock_on_hand, products(name)");
    const received = (buyerVariants ?? []).find((v) => v.products?.name === "Bolsa Rara");
    expect(received?.stock_on_hand).toBe(2);

    // offer remaining decremented
    const { data: offer } = await ctx.sellerUser.client
      .from("offers")
      .select("quantity_remaining, status")
      .eq("id", offerId)
      .single();
    expect(offer?.quantity_remaining).toBe(1);
    expect(offer?.status).toBe("PARTIALLY_NEGOTIATED");

    // history preserved (RF-NEG-009)
    const { data: events } = await ctx.buyerUser.client
      .from("negotiation_events")
      .select("type")
      .eq("negotiation_id", negId)
      .order("created_at");
    expect((events ?? []).map((e) => e.type)).toEqual(["CREATED", "ACCEPTED", "COMPLETED"]);
  });

  it("blocks completion when the source no longer has stock (BR-NEG-10)", async () => {
    const offerId = (ctx as unknown as { offerId: string }).offerId;
    const { data: neg } = await ctx.buyerUser.client.rpc("open_negotiation", {
      p_offer_id: offerId,
      p_quantity: 1,
      p_amount: 4000,
    });
    const negId = (neg as { id: string }).id;
    await ctx.sellerUser.client.rpc("negotiation_transition", {
      p_negotiation_id: negId,
      p_action: "accept",
    });

    // drain the seller's stock with a local sale
    const current = await stock(ctx.sellerUser.client, ctx.variant.id);
    await ctx.sellerUser.client.rpc("confirm_sale", {
      p_payment_method: "PIX",
      p_items: [{ variant_id: ctx.variant.id, quantity: current }],
    });

    const { error } = await ctx.sellerUser.client.rpc("complete_negotiation", {
      p_negotiation_id: negId,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/insuficiente/i);

    const { data: still } = await ctx.sellerUser.client
      .from("negotiations")
      .select("status")
      .eq("id", negId)
      .single();
    expect(still?.status).toBe("ACCEPTED");
  });

  it("isolates negotiations from unrelated organizations (RLS)", async () => {
    const outsider = await makeUser();
    await makeOrg(outsider.userId, "RESELLER");
    const { data } = await outsider.client.from("negotiations").select("id");
    expect(data ?? []).toHaveLength(0);
  });
});
