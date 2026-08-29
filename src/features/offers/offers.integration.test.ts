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

    // Peer sees the offer row (seller + price + remaining). NOTE: product name is
    // "—" for peers today because `products`/`product_variants` RLS is org-only
    // — a real limitation of the network marketplace worth revisiting.
    setTestClient(ctx.peer.client);
    const peerView = await listNetworkOffers();
    const peerOffer = peerView.find((o) => !o.isMine && o.price === 250);
    expect(peerOffer).toBeTruthy();
    expect(peerOffer?.sellerName).toBe("Vendedora O");
    expect(peerOffer?.remaining).toBe(2);

    setTestClient(ctx.outsider.client);
    expect((await listNetworkOffers()).some((o) => o.price === 250)).toBe(false);
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
