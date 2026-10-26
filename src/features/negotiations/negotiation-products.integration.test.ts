import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import { addMember, clearTestClient, makeNetwork, setTestClient, stockUp } from "@/test/actions";
import { getNegotiation, listNegotiations } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

/** VES-97: the buyer sees what she negotiated, even after the offer closed. */
d("negotiated product for both parties (VES-97)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN");
    const network = await makeNetwork(factoryOrg.id);

    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Atelier Teste");
    const buyer = await makeUser();
    const buyerOrg = await makeOrg(buyer.userId, "RESELLER", "RESELLER", "Boutique Teste");
    await addMember(network.id, sellerOrg.id);
    await addMember(network.id, buyerOrg.id);

    const product = await makeProduct(sellerOrg.id, {
      name: "Bolsa Classic Flap",
      brand: "Chanel",
      image_urls: ["https://img.test/bolsa.jpg"],
    });
    const variant = await makeVariant(product.id, {
      size: "Único",
      color: "Preto",
      cost_price: 3000,
    });
    await stockUp(seller.client, variant.id, 1);

    // The only unit is offered, negotiated and transferred: the offer is sold out.
    const { data: offer } = await seller.client.rpc("publish_offer", {
      p_network_id: network.id,
      p_variant_id: variant.id,
      p_quantity: 1,
      p_transfer_price: 4000,
    });
    const { data: neg } = await buyer.client.rpc("open_negotiation", {
      p_offer_id: (offer as { id: string }).id,
      p_quantity: 1,
      p_amount: 4000,
    });
    const negotiationId = (neg as { id: string }).id;
    await seller.client.rpc("negotiation_transition", {
      p_negotiation_id: negotiationId,
      p_action: "accept",
    });
    const { error } = await seller.client.rpc("complete_negotiation", {
      p_negotiation_id: negotiationId,
    });
    if (error) throw error;

    return { seller, buyer, buyerOrg, negotiationId };
  }

  beforeAll(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());

  const expected = {
    product_name: "Bolsa Classic Flap",
    brand: "Chanel",
    color: "Preto",
    size: "Único",
    image_urls: ["https://img.test/bolsa.jpg"],
  };

  it("returns the product's public fields to both parties, even once the offer is sold out", async () => {
    for (const party of [ctx.seller, ctx.buyer]) {
      const { data, error } = await party.client.rpc("list_negotiation_products", {
        p_negotiation_id: ctx.negotiationId,
      });
      expect(error).toBeNull();
      // Exact shape: no cost, stock or SKU leaks through.
      expect(data).toEqual([{ negotiation_id: ctx.negotiationId, ...expected }]);
    }

    // Without an id, it lists every negotiation of the caller.
    const { data: all } = await ctx.buyer.client.rpc("list_negotiation_products");
    expect(all).toEqual([{ negotiation_id: ctx.negotiationId, ...expected }]);
  });

  it("returns nothing to an organization outside the negotiation", async () => {
    const outsider = await makeUser();
    await makeOrg(outsider.userId, "RESELLER");
    const { data } = await outsider.client.rpc("list_negotiation_products", {
      p_negotiation_id: ctx.negotiationId,
    });
    expect(data ?? []).toEqual([]);
  });

  it("lists and opens the negotiation with its product for the buyer", async () => {
    setTestClient(ctx.buyer.client);
    const product = {
      name: "Bolsa Classic Flap",
      brand: "Chanel",
      variant: "Preto / Único",
      imageUrl: "https://img.test/bolsa.jpg",
    };

    const sent = (await listNegotiations("sent")).items.find((n) => n.id === ctx.negotiationId);
    expect(sent).toMatchObject({ direction: "sent", product });

    const detail = await getNegotiation(ctx.negotiationId);
    expect(detail.product).toEqual(product);
  });
});
