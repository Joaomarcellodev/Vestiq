import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import {
  addMember,
  clearTestClient,
  expectRedirect,
  formData,
  makeNetwork,
  pngFile,
  setTestClient,
  stockUp,
} from "@/test/actions";
import { publishOffer, updateOfferPhotos } from "./actions";
import { getOffer, listNetworkOffers } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("offer photos (VES-106, RF-OFFER-008)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN");
    const network = await makeNetwork(factoryOrg.id);
    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Vendedora Foto");
    const peer = await makeUser();
    const peerOrg = await makeOrg(peer.userId, "RESELLER", "RESELLER", "Peer Foto");
    await addMember(network.id, sellerOrg.id);
    await addMember(network.id, peerOrg.id);

    const product = await makeProduct(sellerOrg.id, {
      name: "Jaqueta Jeans",
      image_urls: ["https://x/produto.png"],
    });
    const variant = await makeVariant(product.id, { size: "M" });
    await stockUp(seller.client, variant.id, 5);
    return { network, seller, sellerOrg, peer, variant };
  }

  beforeEach(async () => {
    ctx = await setup();
    setTestClient(ctx.seller.client);
  });
  afterEach(() => clearTestClient());

  async function publish(images: File[] = [], quantity = 2) {
    const dest = await expectRedirect(
      () =>
        publishOffer(
          {},
          formData({
            variantId: ctx.variant.id,
            networkId: ctx.network.id,
            quantity,
            transferPrice: 150,
            note: "",
            images,
          }),
        ),
      /offer-published/,
    );
    expect(dest).toBe("/rede?toast=offer-published");
    const { data } = await admin()
      .from("offers")
      .select("id, image_urls")
      .eq("product_variant_id", ctx.variant.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return data!;
  }

  const filesIn = async (url: string) => {
    const path = url.split("/product-images/")[1]!;
    const folder = path.slice(0, path.lastIndexOf("/"));
    const { data } = await admin().storage.from("product-images").list(folder);
    return (data ?? []).map((f) => `${folder}/${f.name}`);
  };

  it("publishes with photos the peers see; falls back to the product's (TC-OFFER-13/15)", async () => {
    const withPhotos = await publish([pngFile("a.png"), pngFile("b.png")]);
    expect(withPhotos.image_urls).toHaveLength(2);
    expect(withPhotos.image_urls[0]).toContain(`/product-images/${ctx.sellerOrg.id}/offers/`);

    const withoutPhotos = await publish([], 1);
    expect(withoutPhotos.image_urls).toEqual([]);

    setTestClient(ctx.peer.client);
    const feed = await listNetworkOffers();
    expect(feed.find((o) => o.id === withPhotos.id)?.imageUrl).toBe(withPhotos.image_urls[0]);
    expect(feed.find((o) => o.id === withoutPhotos.id)?.imageUrl).toBe("https://x/produto.png");
    expect((await getOffer(withPhotos.id)).offer.imageUrls).toEqual(withPhotos.image_urls);
  });

  it("removes the uploaded photos when publishing fails (TC-OFFER-13)", async () => {
    const state = await publishOffer(
      {},
      formData({
        variantId: ctx.variant.id,
        networkId: ctx.network.id,
        quantity: 99,
        transferPrice: 150,
        note: "",
        images: [pngFile("x.png")],
      }),
    );
    expect(state.error).toMatch(/estoque/);
    const { data } = await admin()
      .storage.from("product-images")
      .list(`${ctx.sellerOrg.id}/offers`);
    // any folder left behind must be empty
    for (const folder of data ?? []) {
      const { data: inside } = await admin()
        .storage.from("product-images")
        .list(`${ctx.sellerOrg.id}/offers/${folder.name}`);
      expect(inside ?? []).toEqual([]);
    }
  });

  it("reorders, adds and removes photos, deleting removed files (TC-OFFER-14)", async () => {
    const offer = await publish([pngFile("a.png"), pngFile("b.png")]);
    const [first, second] = offer.image_urls as [string, string];

    await expectRedirect(
      () =>
        updateOfferPhotos(
          {},
          formData({
            offerId: offer.id,
            existingImages: JSON.stringify([second, "https://evil.example/x.png"]),
            images: [pngFile("c.png")],
          }),
        ),
      `/rede/ofertas/${offer.id}?toast=offer-photos-updated`,
    );
    const { data } = await admin().from("offers").select("image_urls").eq("id", offer.id).single();
    expect(data!.image_urls).toHaveLength(2);
    expect(data!.image_urls[0]).toBe(second);
    expect(data!.image_urls).not.toContain(first);

    // Both published photos share a folder: only the kept one is left there.
    const publishFolder = await filesIn(second);
    expect(publishFolder).toEqual([second.split("/product-images/")[1]]);
    // The new photo went to the offer's own folder.
    expect(data!.image_urls[1]).toContain(`/offers/${offer.id}/`);
  });

  it("refuses closed offers and other organizations (TC-OFFER-14)", async () => {
    const offer = await publish([pngFile("a.png")]);

    setTestClient(ctx.peer.client);
    expect(
      await updateOfferPhotos({}, formData({ offerId: offer.id, existingImages: "[]" })),
    ).toEqual({ error: "Você não tem permissão para esta ação" });

    setTestClient(ctx.seller.client);
    await admin().from("offers").update({ status: "CANCELLED" }).eq("id", offer.id);
    expect(
      await updateOfferPhotos({}, formData({ offerId: offer.id, existingImages: "[]" })),
    ).toEqual({ error: "Esta oferta não está mais ativa" });

    const { data } = await admin().from("offers").select("image_urls").eq("id", offer.id).single();
    expect(data!.image_urls).toEqual(offer.image_urls);
  });
});
