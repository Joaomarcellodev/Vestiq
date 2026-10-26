import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import { addMember, clearTestClient, makeNetwork, setTestClient, stockUp } from "@/test/actions";
import { PAGE_SIZE } from "@/lib/pagination";
import { listNetworkOffers } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

// VES-90 — the feed is searched in SQL (migration 0039) and paged.
d("network feed search and pages (VES-90)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN");
    const network = await makeNetwork(factoryOrg.id);
    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Atelier Sarah");
    const peer = await makeUser();
    const peerOrg = await makeOrg(peer.userId, "RESELLER", "RESELLER", "Peer Feed");
    await addMember(network.id, sellerOrg.id);
    await addMember(network.id, peerOrg.id);
    return { network, seller, sellerOrg, peer };
  }

  /** `count` offers of one new variant, oldest first, `ageSeconds` older than now. */
  async function offersOf(
    product: Record<string, unknown>,
    variant: { color?: string; size?: string } = {},
    count = 1,
    ageSeconds = 0,
  ) {
    const v = await makeVariant((await makeProduct(ctx.sellerOrg.id, product)).id, variant);
    await stockUp(ctx.seller.client, v.id, count);
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const { data, error } = await admin()
        .from("offers")
        .insert({
          organization_id: ctx.sellerOrg.id,
          network_id: ctx.network.id,
          product_variant_id: v.id,
          quantity_offered: 1,
          quantity_remaining: 1,
          transfer_price: 100,
          created_at: new Date(Date.now() - (ageSeconds + count - i) * 1000).toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      ids.push(data.id);
    }
    return ids;
  }

  beforeEach(async () => {
    ctx = await setup();
    setTestClient(ctx.peer.client);
  });
  afterEach(() => clearTestClient());

  const found = async (query?: string) => (await listNetworkOffers(query)).items.map((o) => o.id);

  it("searches product, brand, colour/size and seller, every word, any case or accent", async () => {
    const [bag] = await offersOf(
      { name: "Bolsa Chanel Classic Flap", brand: "Chanel" },
      { color: "Preto", size: "Único" },
    );
    const [plain] = await offersOf({ name: "Bolsa de palha", brand: null });

    for (const q of ["classic", "chanel", "preto", "sarah", "UNICO", "preto chanel", "atelíer"]) {
      expect(await found(q), q).toContain(bag);
    }
    for (const q of ["gucci", "chanel azul"]) expect(await found(q), q).not.toContain(bag);
    // no brand, no colour/size: still found by name, and "Único" stands for the variant
    expect(await found("bolsa")).toEqual(expect.arrayContaining([bag, plain]));
    expect(await found("palha único")).toEqual([plain]);
    expect(await found("   ")).toEqual(expect.arrayContaining([bag, plain]));
  });

  it("pages newest first, without overlap, and says whether more pages follow", async () => {
    const ids = await offersOf({ name: "Peça Feed" }, {}, PAGE_SIZE + 1);
    const newestFirst = [...ids].reverse();

    const first = await listNetworkOffers(undefined, 1);
    expect(first.items.map((o) => o.id)).toEqual(newestFirst.slice(0, PAGE_SIZE));
    expect(first.hasNext).toBe(true);

    const second = await listNetworkOffers(undefined, 2);
    expect(second.items.map((o) => o.id)).toEqual(newestFirst.slice(PAGE_SIZE));
    expect(second.hasNext).toBe(false);
  });

  it("searches across all offers, not just the first page", async () => {
    // the oldest offer, so without the search it lands past the first page
    const [skirt] = await offersOf({ name: "Saia midi" }, {}, 1, 3600);
    await offersOf({ name: "Peça Feed" }, {}, PAGE_SIZE);

    expect((await listNetworkOffers()).items.map((o) => o.id)).not.toContain(skirt);
    const searched = await listNetworkOffers("saia");
    expect(searched.items.map((o) => o.id)).toEqual([skirt]);
    expect(searched.hasNext).toBe(false);
  });
});
