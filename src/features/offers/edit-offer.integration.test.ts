import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import {
  addMember,
  clearTestClient,
  expectRedirect,
  formData,
  makeNetwork,
  setTestClient,
  stockUp,
} from "@/test/actions";
import { openNegotiation } from "@/features/negotiations/actions";
import { publishOffer, updateOffer } from "./actions";
import { getOffer, listNetworkOffers } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

// VES-89 — the owner edits an open offer's price, quantity and note.
d("edit an offer (VES-89)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN");
    const network = await makeNetwork(factoryOrg.id);
    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Vendedora Edita");
    const peer = await makeUser();
    const peerOrg = await makeOrg(peer.userId, "RESELLER", "RESELLER", "Peer Edita");
    await addMember(network.id, sellerOrg.id);
    await addMember(network.id, peerOrg.id);

    const variant = await makeVariant((await makeProduct(sellerOrg.id, { name: "Saia" })).id);
    await stockUp(seller.client, variant.id, 10);

    setTestClient(seller.client);
    await expectRedirect(
      () =>
        publishOffer(
          {},
          formData({
            variantId: variant.id,
            networkId: network.id,
            quantity: 4,
            transferPrice: 100,
            note: "Nova",
          }),
        ),
      /offer-published/,
    );
    const { data: offer } = await admin()
      .from("offers")
      .select("id")
      .eq("product_variant_id", variant.id)
      .single();
    return { network, seller, peer, variant, offerId: offer!.id as string };
  }

  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());

  const edit = (over: Record<string, unknown> = {}) =>
    updateOffer(
      {},
      formData({
        offerId: ctx.offerId,
        quantity: 6,
        transferPrice: 80,
        note: "Baixei o preço",
        ...over,
      }),
    );

  it("saves the new price, quantity and note, marks the edit and shows it in the feed", async () => {
    setTestClient(ctx.seller.client);
    const dest = await expectRedirect(() => edit(), /offer-updated/);
    expect(dest).toBe(`/rede/ofertas/${ctx.offerId}?toast=offer-updated`);

    const { data } = await admin()
      .from("offers")
      .select("quantity_offered, quantity_remaining, transfer_price, note, edited_at")
      .eq("id", ctx.offerId)
      .single();
    expect(data).toMatchObject({
      quantity_offered: 6,
      quantity_remaining: 6,
      transfer_price: 80,
      note: "Baixei o preço",
    });
    expect(data!.edited_at).not.toBeNull();

    setTestClient(ctx.peer.client);
    const [seen] = (await listNetworkOffers()).filter((o) => o.id === ctx.offerId);
    expect(seen).toMatchObject({ remaining: 6, price: 80, note: "Baixei o preço" });
    expect(seen!.editedAt).not.toBeNull();
  });

  it("gives the owner the free stock as the most the offer can hold", async () => {
    setTestClient(ctx.seller.client);
    const { offer } = await getOffer(ctx.offerId);
    expect(offer.edit).toEqual({ maxQuantity: 10, negotiationInProgress: false });
    expect(offer.editedAt).toBeNull();

    setTestClient(ctx.peer.client);
    expect((await getOffer(ctx.offerId)).offer.edit).toBeNull();
  });

  it("refuses more than the free stock (BR-OFFER-11)", async () => {
    setTestClient(ctx.seller.client);
    const state = await edit({ quantity: 11 });
    expect(state.error).toMatch(/Estoque livre insuficiente/);
    const { data } = await admin()
      .from("offers")
      .select("quantity_remaining, transfer_price, edited_at")
      .eq("id", ctx.offerId)
      .single();
    expect(data).toMatchObject({ quantity_remaining: 4, transfer_price: 100, edited_at: null });
  });

  it("blocks the edit while a negotiation is in progress", async () => {
    setTestClient(ctx.peer.client);
    await expectRedirect(
      () =>
        openNegotiation(
          {},
          formData({ offerId: ctx.offerId, quantity: 1, amount: 100, message: "" }),
        ),
      /negotiation-opened/,
    );

    setTestClient(ctx.seller.client);
    expect((await getOffer(ctx.offerId)).offer.edit?.negotiationInProgress).toBe(true);
    expect((await edit()).error).toMatch(/negociação em andamento/);
  });

  it("doesn't let a network peer edit someone else's offer", async () => {
    setTestClient(ctx.peer.client);
    expect((await edit()).error).toBe("Você não tem permissão para esta ação");
  });

  it("returns the schema's errors per field", async () => {
    setTestClient(ctx.seller.client);
    const state = await edit({ quantity: 0, transferPrice: -1 });
    expect(state.fieldErrors).toMatchObject({
      quantity: "Quantidade inválida",
      transferPrice: "Preço inválido",
    });
  });
});
