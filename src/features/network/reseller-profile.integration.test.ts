import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import {
  addMember,
  clearTestClient,
  formData,
  makeNetwork,
  setTestClient,
  stockUp,
} from "@/test/actions";
import { updateOrganizationCity } from "@/features/organizations/actions";
import { listNetworkOffers } from "@/features/offers/queries";
import { getResellerProfile } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

/** VES-65 — public profile of a network peer (AC-NET-008-02, TC-NET-12/13). */
d("reseller public profile (migration 0044)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica Perfil");
    const network = await makeNetwork(factoryOrg.id, "Rede Perfil");

    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Loja Perfil");
    const buyer = await makeUser();
    const buyerOrg = await makeOrg(buyer.userId, "RESELLER", "RESELLER", "Compradora Perfil");
    const outsider = await makeUser();
    await makeOrg(outsider.userId, "RESELLER", "RESELLER", "Fora Perfil");
    await addMember(network.id, sellerOrg.id);
    await addMember(network.id, buyerOrg.id);

    await admin()
      .from("profiles")
      .update({ avatar_url: "https://example.test/avatar.png" })
      .eq("id", seller.userId);

    const product = await makeProduct(sellerOrg.id, { name: "Saia Perfil", brand: "Farm" });
    const variant = await makeVariant(product.id, { size: "P" });
    await stockUp(seller.client, variant.id, 5);
    const publish = (quantity: number) =>
      seller.client.rpc("publish_offer", {
        p_variant_id: variant.id,
        p_network_id: network.id,
        p_quantity: quantity,
        p_transfer_price: 90,
      });
    const { data: offer } = await publish(2);
    await publish(1);
    const offerId = (offer as unknown as { id: string }).id;

    // One finished deal: buyer proposes, seller accepts and completes.
    const { data: neg } = await buyer.client.rpc("open_negotiation", {
      p_offer_id: offerId,
      p_quantity: 1,
      p_amount: 90,
    });
    const negId = (neg as unknown as { id: string }).id;
    await seller.client.rpc("negotiation_transition", {
      p_negotiation_id: negId,
      p_action: "accept",
    });
    await seller.client.rpc("complete_negotiation", { p_negotiation_id: negId });

    return { factory, seller, sellerOrg, buyer, buyerOrg, outsider, factoryOrg };
  }

  beforeAll(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());

  it("shows a peer's identity and public counters (TC-NET-12)", async () => {
    setTestClient(ctx.seller.client);
    expect(await updateOrganizationCity({}, formData({ city: "  Teresina, PI " }))).toEqual({
      ok: "Cidade da loja atualizada.",
    });

    setTestClient(ctx.buyer.client);
    const profile = await getResellerProfile(ctx.sellerOrg.id);
    expect(profile).toMatchObject({
      id: ctx.sellerOrg.id,
      name: "Loja Perfil",
      city: "Teresina, PI",
      avatarUrl: "https://example.test/avatar.png",
      activeOffers: 2,
      completedDeals: 1,
      isMine: false,
    });
  });

  it("lists only the reseller's active offers in her showcase", async () => {
    setTestClient(ctx.buyer.client);
    const showcase = await listNetworkOffers(undefined, 1, ctx.sellerOrg.id);
    expect(showcase.items).toHaveLength(2);
    expect(showcase.items.every((o) => o.sellerId === ctx.sellerOrg.id)).toBe(true);
    expect(showcase.items[0]).toMatchObject({ productName: "Saia Perfil", brand: "Farm" });
  });

  it("returns the viewer's own profile marked as hers", async () => {
    setTestClient(ctx.seller.client);
    expect((await getResellerProfile(ctx.sellerOrg.id))?.isMine).toBe(true);
  });

  it("is empty for a reseller outside the network, a factory and a bad id (TC-NET-13)", async () => {
    setTestClient(ctx.outsider.client);
    expect(await getResellerProfile(ctx.sellerOrg.id)).toBeNull();

    setTestClient(ctx.buyer.client);
    expect(await getResellerProfile(ctx.factoryOrg.id)).toBeNull();
    expect(await getResellerProfile("not-a-uuid")).toBeNull();
  });

  it("never exposes the peer's stock, customers or sales (SDD §8)", async () => {
    const [variants, customers, sales] = await Promise.all([
      ctx.buyer.client
        .from("product_variants")
        .select("id")
        .eq("organization_id", ctx.sellerOrg.id),
      ctx.buyer.client.from("customers").select("id").eq("organization_id", ctx.sellerOrg.id),
      ctx.buyer.client.from("sales").select("id").eq("organization_id", ctx.sellerOrg.id),
    ]);
    expect(variants.data ?? []).toHaveLength(0);
    expect(customers.data ?? []).toHaveLength(0);
    expect(sales.data ?? []).toHaveLength(0);
  });

  it("set_organization_city: only a member edits the city, and empty clears it", async () => {
    const { error } = await ctx.buyer.client.rpc("set_organization_city", {
      p_org_id: ctx.sellerOrg.id,
      p_city: "Invadido",
    });
    expect(error?.message).toMatch(/not authorized/);

    setTestClient(ctx.seller.client);
    await updateOrganizationCity({}, formData({ city: "" }));
    const { data } = await admin()
      .from("organizations")
      .select("city")
      .eq("id", ctx.sellerOrg.id)
      .single();
    expect(data?.city).toBeNull();

    expect(await updateOrganizationCity({}, formData({ city: "x".repeat(81) }))).toEqual({
      error: "Use no máximo 80 caracteres na cidade",
    });
  });
});
