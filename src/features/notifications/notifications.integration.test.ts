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
import { publishOffer } from "@/features/offers/actions";
import { openNegotiation, negotiationAction } from "@/features/negotiations/actions";
import { markAllNotificationsRead, markNotificationRead } from "./actions";
import { countUnreadNotifications, listNotifications } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

async function orgNotifications(orgId: string) {
  const { data } = await admin()
    .from("notifications")
    .select("type, title, body, link, read_at, organization_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

d("notifications — triggers, queries, actions, RLS (SPEC-008/009)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica N");
    const network = await makeNetwork(factoryOrg.id, "Rede N");

    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Vendedora N");
    const buyer = await makeUser();
    const buyerOrg = await makeOrg(buyer.userId, "RESELLER", "RESELLER", "Compradora N");
    const bystander = await makeUser();
    const bystanderOrg = await makeOrg(bystander.userId, "RESELLER", "RESELLER", "Espectadora N");

    for (const o of [sellerOrg, buyerOrg, bystanderOrg])
      await addMember(network.id, o.id, "ACTIVE");

    const product = await makeProduct(sellerOrg.id, { name: "Casaco", brand: "Levi's" });
    const variant = await makeVariant(product.id, { size: "G", retail_price: 500 });
    await stockUp(seller.client, variant.id, 10);

    return { network, seller, sellerOrg, buyer, buyerOrg, bystander, bystanderOrg, variant };
  }

  async function publish(qty = 3, price = 300) {
    setTestClient(ctx.seller.client);
    await expectRedirect(
      () =>
        publishOffer(
          {},
          formData({
            variantId: ctx.variant.id,
            networkId: ctx.network.id,
            quantity: qty,
            transferPrice: price,
            note: "",
          }),
        ),
      /offer-published/,
    );
    const { data } = await admin()
      .from("offers")
      .select("id")
      .eq("product_variant_id", ctx.variant.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return data!.id as string;
  }

  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());

  it("OFFER_PUBLISHED fans out to every active peer except the author", async () => {
    await publish();

    expect(await orgNotifications(ctx.sellerOrg.id)).toHaveLength(0); // not the author

    const buyerNotifs = await orgNotifications(ctx.buyerOrg.id);
    expect(buyerNotifs).toHaveLength(1);
    expect(buyerNotifs[0]).toMatchObject({ type: "OFFER_PUBLISHED", title: "Nova oferta na rede" });
    expect(buyerNotifs[0]?.body).toMatch(/Vendedora N ofertou Casaco/);
    expect(buyerNotifs[0]?.link).toMatch(/^\/rede\/ofertas\//);

    expect(await orgNotifications(ctx.bystanderOrg.id)).toHaveLength(1);
  });

  it("a DISABLED member gets no offer notification", async () => {
    await admin()
      .from("network_members")
      .update({ status: "DISABLED" })
      .eq("network_id", ctx.network.id)
      .eq("reseller_id", ctx.bystanderOrg.id);
    await publish();
    expect(await orgNotifications(ctx.bystanderOrg.id)).toHaveLength(0);
  });

  it("negotiation events notify the counterparty (the non-actor)", async () => {
    const offerId = await publish(5, 300);

    // buyer opens a negotiation → seller is notified
    setTestClient(ctx.buyer.client);
    const dest = await expectRedirect(
      () =>
        openNegotiation(
          {},
          formData({ offerId, quantity: 2, amount: 550, message: "Tenho interesse" }),
        ),
      /negociacoes\/[0-9a-f-]{36}\?toast=negotiation-opened/,
    );
    const negId = dest.split("/")[2]!.split("?")[0]!;

    const sellerNotifs = await orgNotifications(ctx.sellerOrg.id);
    expect(sellerNotifs.some((n) => n.type === "NEGOTIATION_OPENED")).toBe(true);

    // seller accepts → buyer is notified (the action redirects, hence the catch)
    setTestClient(ctx.seller.client);
    await expectRedirect(
      () => negotiationAction(formData({ negotiationId: negId, action: "accept" })),
      /negociacoes\//,
    );
    const buyerNotifs = await orgNotifications(ctx.buyerOrg.id);
    expect(buyerNotifs.some((n) => n.type === "NEGOTIATION_ACCEPTED")).toBe(true);
  });

  it("queries: listNotifications + countUnreadNotifications are per active org", async () => {
    await publish();
    setTestClient(ctx.buyer.client);

    expect(await countUnreadNotifications()).toBe(1);
    const list = await listNotifications();
    expect(list).toHaveLength(1);
    expect(list[0]?.readAt).toBeNull();
  });

  it("actions: markNotificationRead + markAllNotificationsRead", async () => {
    await publish(3, 100);
    await publish(2, 200); // second offer → second notification for the buyer
    setTestClient(ctx.buyer.client);

    let list = await listNotifications();
    expect(list.length).toBeGreaterThanOrEqual(2);

    await markNotificationRead(list[0]!.id);
    expect(await countUnreadNotifications()).toBe(list.length - 1);

    await markAllNotificationsRead();
    expect(await countUnreadNotifications()).toBe(0);
  });

  it("RLS: a peer cannot read another org's notifications", async () => {
    await publish();
    setTestClient(ctx.bystander.client);
    const { data } = await ctx.bystander.client
      .from("notifications")
      .select("id")
      .eq("organization_id", ctx.buyerOrg.id);
    expect(data ?? []).toHaveLength(0);
  });

  it("queries return empty for a user without an active org", async () => {
    const loner = await makeUser();
    setTestClient(loner.client);
    expect(await listNotifications()).toEqual([]);
    expect(await countUnreadNotifications()).toBe(0);
  });
});
