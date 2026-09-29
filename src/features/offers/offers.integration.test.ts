import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import {
  addMember,
  clearTestClient,
  expectRedirect,
  formData,
  makeNetwork,
  stockUp,
  setTestClient,
} from "@/test/actions";
import { cancelOffer, publishOffer } from "./actions";
import { getOffer, getPublishOptions, listNetworkOffers } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("offers actions + queries (SPEC-008)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica O");
    const network = await makeNetwork(factoryOrg.id, "Rede O");

    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Vendedora O");
    const peer = await makeUser();
    const peerOrg = await makeOrg(peer.userId, "RESELLER", "RESELLER", "Peer O");
    const outsider = await makeUser();
    const outsiderOrg = await makeOrg(outsider.userId, "RESELLER", "RESELLER", "Fora O");

    await addMember(network.id, sellerOrg.id, "ACTIVE");
    await addMember(network.id, peerOrg.id, "ACTIVE");

    const product = await makeProduct(sellerOrg.id, { name: "Vestido", brand: "Zara" });
    const variant = await makeVariant(product.id, { size: "M", retail_price: 400 });
    await stockUp(seller.client, variant.id, 8);

    return { network, seller, sellerOrg, peer, peerOrg, outsider, outsiderOrg, variant };
  }

  beforeEach(async () => {
    ctx = await setup();
    setTestClient(ctx.seller.client);
  });
  afterEach(() => clearTestClient());

  const pForm = (over: Record<string, unknown>) => formData({ note: "", ...over });

  it("publishOffer: creates an ACTIVE offer and redirects", async () => {
    await expectRedirect(
      () =>
        publishOffer(
          {},
          pForm({
            variantId: ctx.variant.id,
            networkId: ctx.network.id,
            quantity: 3,
            transferPrice: 250,
          }),
        ),
      "/rede?toast=offer-published",
    );
    const { data } = await admin()
      .from("offers")
      .select("status, quantity_remaining, organization_id")
      .eq("product_variant_id", ctx.variant.id)
      .single();
    expect(data).toMatchObject({
      status: "ACTIVE",
      quantity_remaining: 3,
      organization_id: ctx.sellerOrg.id,
    });
  });

  it("publishOffer: rejects quantity above stock (RPC)", async () => {
    const state = await publishOffer(
      {},
      pForm({
        variantId: ctx.variant.id,
        networkId: ctx.network.id,
        quantity: 99,
        transferPrice: 100,
      }),
    );
    expect(state.error).toMatch(/estoque/i);
  });

  it("publishOffer: rejects a network the seller does not belong to", async () => {
    const otherFactory = await makeUser();
    const otherFactoryOrg = await makeOrg(otherFactory.userId, "FACTORY", "FACTORY_ADMIN");
    const foreignNetwork = await makeNetwork(otherFactoryOrg.id);
    const state = await publishOffer(
      {},
      pForm({
        variantId: ctx.variant.id,
        networkId: foreignNetwork.id,
        quantity: 1,
        transferPrice: 100,
      }),
    );
    expect(state.error).toMatch(/rede/i);
  });

  it("publishOffer: rejects invalid input (zod)", async () => {
    const state = await publishOffer(
      {},
      pForm({
        variantId: ctx.variant.id,
        networkId: ctx.network.id,
        quantity: 0,
        transferPrice: 100,
      }),
    );
    expect(state.error).toMatch(/quantidade/i);
  });

  it("listNetworkOffers: seller sees isMine + product; peer sees the offer; outsider sees nothing", async () => {
    await expectRedirect(
      () =>
        publishOffer(
          {},
          pForm({
            variantId: ctx.variant.id,
            networkId: ctx.network.id,
            quantity: 2,
            transferPrice: 250,
          }),
        ),
      /offer-published/,
    );

    const mine = await listNetworkOffers();
    const mineOffer = mine.find((o) => o.isMine && o.price === 250);
    expect(mineOffer?.productName).toBe("Vestido");

    // Peer sees the offer with its product, through the public projection (0022).
    setTestClient(ctx.peer.client);
    const peerView = await listNetworkOffers();
    const peerOffer = peerView.find((o) => !o.isMine && o.price === 250);
    expect(peerOffer).toMatchObject({
      sellerName: "Vendedora O",
      remaining: 2,
      productName: "Vestido",
      brand: "Zara",
      descriptor: "M",
    });
    expect((await listNetworkOffers("zara")).some((o) => o.id === peerOffer!.id)).toBe(true);
    expect((await listNetworkOffers("gucci")).some((o) => o.id === peerOffer!.id)).toBe(false);

    setTestClient(ctx.outsider.client);
    expect((await listNetworkOffers()).some((o) => o.price === 250)).toBe(false);
  });

  it("list_visible_offers: peers get the product's public fields only; outsiders get nothing", async () => {
    await admin()
      .from("products")
      .update({ description: "Linho", image_urls: ["https://x.supabase.co/a.jpg"] })
      .eq("name", "Vestido")
      .eq("organization_id", ctx.sellerOrg.id);
    await expectRedirect(
      () =>
        publishOffer(
          {},
          pForm({
            variantId: ctx.variant.id,
            networkId: ctx.network.id,
            quantity: 2,
            transferPrice: 260,
          }),
        ),
      /offer-published/,
    );

    const { data: peerRows, error } = await ctx.peer.client.rpc("list_visible_offers");
    expect(error).toBeNull();
    const row = peerRows?.find((r) => Number(r.transfer_price) === 260);
    expect(row).toMatchObject({
      seller_name: "Vendedora O",
      product_name: "Vestido",
      brand: "Zara",
      description: "Linho",
      size: "M",
      image_urls: ["https://x.supabase.co/a.jpg"],
      quantity_remaining: 2,
    });
    // SDD §8 — nothing private crosses the network boundary.
    for (const key of ["cost_price", "retail_price", "stock_on_hand", "sku"]) {
      expect(row).not.toHaveProperty(key);
    }

    const { data: one } = await ctx.peer.client.rpc("list_visible_offers", {
      p_offer_id: row!.id,
    });
    expect(one).toHaveLength(1);

    const { data: outsiderRows } = await ctx.outsider.client.rpc("list_visible_offers");
    expect(outsiderRows?.some((r) => r.id === row!.id)).toBe(false);
    const { data: outsiderOne } = await ctx.outsider.client.rpc("list_visible_offers", {
      p_offer_id: row!.id,
    });
    expect(outsiderOne).toEqual([]);
  });

  it("list_visible_offers: a cancelled offer disappears for peers but not for its owner", async () => {
    await expectRedirect(
      () =>
        publishOffer(
          {},
          pForm({
            variantId: ctx.variant.id,
            networkId: ctx.network.id,
            quantity: 1,
            transferPrice: 270,
          }),
        ),
      /offer-published/,
    );
    const { data: offer } = await admin()
      .from("offers")
      .select("id")
      .eq("transfer_price", 270)
      .eq("organization_id", ctx.sellerOrg.id)
      .single();
    await admin().from("offers").update({ status: "CANCELLED" }).eq("id", offer!.id);

    const { data: peerOne } = await ctx.peer.client.rpc("list_visible_offers", {
      p_offer_id: offer!.id,
    });
    expect(peerOne).toEqual([]);
    const { data: ownerOne } = await ctx.seller.client.rpc("list_visible_offers", {
      p_offer_id: offer!.id,
    });
    expect(ownerOne?.[0]?.status).toBe("CANCELLED");
  });

  it("cancelOffer: only the owner can cancel; status guarded", async () => {
    const dest = await expectRedirect(
      () =>
        publishOffer(
          {},
          pForm({
            variantId: ctx.variant.id,
            networkId: ctx.network.id,
            quantity: 1,
            transferPrice: 250,
          }),
        ),
      /offer-published/,
    );
    void dest;
    const { data: offer } = await admin()
      .from("offers")
      .select("id")
      .eq("product_variant_id", ctx.variant.id)
      .single();

    await expectRedirect(
      () => cancelOffer(formData({ offerId: offer!.id })),
      "/rede?toast=offer-cancelled",
    );
    const { data } = await admin().from("offers").select("status").eq("id", offer!.id).single();
    expect(data?.status).toBe("CANCELLED");
  });

  it("getPublishOptions: variants in stock + the seller's networks", async () => {
    const opts = await getPublishOptions();
    expect(opts.networks.map((n) => n.id)).toContain(ctx.network.id);
    expect(opts.variants.some((v) => v.id === ctx.variant.id)).toBe(true);
  });

  it("getOffer: returns the offer with isMine", async () => {
    await expectRedirect(
      () =>
        publishOffer(
          {},
          pForm({
            variantId: ctx.variant.id,
            networkId: ctx.network.id,
            quantity: 1,
            transferPrice: 250,
          }),
        ),
      /offer-published/,
    );
    const { data: offer } = await admin()
      .from("offers")
      .select("id")
      .eq("product_variant_id", ctx.variant.id)
      .single();
    const result = await getOffer(offer!.id);
    expect(result.isMine).toBe(true);
  });
});
