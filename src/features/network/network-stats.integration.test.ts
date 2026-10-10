import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  admin,
  makeOrg,
  makeProduct,
  makeUser,
  makeVariant,
  PUBLISHABLE_KEY,
  SUPABASE_URL,
  supabaseUp,
} from "@/test/supabase";
import {
  addMember,
  clearTestClient,
  inviteMember,
  makeNetwork,
  setTestClient,
} from "@/test/actions";
import { getFactoryNetworkOverview } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

/** An offer straight in the table — this suite is about counting, not publishing rules. */
async function makeOffer(
  orgId: string,
  networkId: string,
  status: "ACTIVE" | "PARTIALLY_NEGOTIATED" | "FULFILLED" | "CANCELLED" = "ACTIVE",
) {
  // Real stock behind the offer, so free-stock checks on offers don't get in the way.
  const variant = await makeVariant((await makeProduct(orgId)).id, { stock_on_hand: 10 });
  const { data, error } = await admin()
    .from("offers")
    .insert({
      organization_id: orgId,
      network_id: networkId,
      product_variant_id: variant.id,
      quantity_offered: 2,
      quantity_remaining: status === "FULFILLED" ? 0 : 2,
      transfer_price: 50,
      status,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("makeOffer failed");
  return data;
}

async function makeNegotiation(
  offer: { id: string; network_id: string; organization_id: string },
  buyerOrgId: string,
  status: "PENDING" | "ACCEPTED" | "COMPLETED" = "PENDING",
) {
  const { error } = await admin()
    .from("negotiations")
    .insert({
      offer_id: offer.id,
      network_id: offer.network_id,
      seller_org_id: offer.organization_id,
      buyer_org_id: buyerOrgId,
      quantity: 1,
      amount: 50,
      status,
      completed_at: status === "COMPLETED" ? new Date().toISOString() : null,
    });
  if (error) throw error;
}

/**
 * A factory network with two resellers trading with each other, plus a pending
 * invite and a second, unrelated network (VES-61/VES-75/VES-76).
 */
async function scenario() {
  const factory = await makeUser();
  const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica Stats");
  const network = await makeNetwork(factoryOrg.id, "Rede Stats");

  const a = await makeUser();
  const aOrg = await makeOrg(a.userId, "RESELLER", "RESELLER", "Rev Stats A");
  const b = await makeUser();
  const bOrg = await makeOrg(b.userId, "RESELLER", "RESELLER", "Rev Stats B");
  await addMember(network.id, aOrg.id, "ACTIVE");
  await addMember(network.id, bOrg.id, "ACTIVE");
  await inviteMember(network.id);

  const aOffer = await makeOffer(aOrg.id, network.id);
  await makeOffer(aOrg.id, network.id, "FULFILLED");
  const bOffer = await makeOffer(bOrg.id, network.id, "PARTIALLY_NEGOTIATED");
  await makeNegotiation(aOffer, bOrg.id, "COMPLETED");
  await makeNegotiation(aOffer, bOrg.id, "PENDING");
  await makeNegotiation(bOffer, aOrg.id, "ACCEPTED");

  // Another factory's network — must never leak into the first one's numbers.
  const other = await makeUser();
  const otherOrg = await makeOrg(other.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica Outra");
  const otherNetwork = await makeNetwork(otherOrg.id, "Rede Outra");
  const c = await makeUser();
  const cOrg = await makeOrg(c.userId, "RESELLER", "RESELLER", "Rev Stats C");
  await addMember(otherNetwork.id, cOrg.id, "ACTIVE");
  await makeOffer(cOrg.id, otherNetwork.id);

  return { factory, network, a, aOffer, c, otherNetwork };
}

d("factory network indicators (RF-FACTORY-DASH-001)", () => {
  afterEach(() => clearTestClient());

  it("counts the resellers' offers and negotiations for the factory admin", async () => {
    const { factory } = await scenario();
    setTestClient(factory.client);

    const { stats } = await getFactoryNetworkOverview();
    expect(stats).toMatchObject({
      resellers: 2,
      activeResellers: 2,
      pendingInvites: 1,
      utilizationRate: 100,
      offers: 2,
      totalOffers: 3,
      negotiationsStarted: 3,
      negotiationsCompleted: 1,
    });
  });

  it("gives the factory aggregates only — the rows stay hidden", async () => {
    const { factory, network } = await scenario();

    const { data: offers } = await factory.client
      .from("offers")
      .select("id")
      .eq("network_id", network.id);
    expect(offers).toEqual([]);
    const { data: negotiations } = await factory.client
      .from("negotiations")
      .select("id")
      .eq("network_id", network.id);
    expect(negotiations).toEqual([]);

    const { data: stats } = await factory.client.from("factory_network_stats").select("*");
    expect(stats).toHaveLength(1);
    expect(stats?.[0]?.network_id).toBe(network.id);
    // One row per network — nothing that identifies a reseller.
    expect(Object.keys(stats?.[0] ?? {}).sort()).toEqual(
      [
        "active_offers",
        "active_resellers",
        "disabled_resellers",
        "factory_id",
        "negotiations_completed",
        "negotiations_started",
        "network_id",
        "pending_invites",
        "total_offers",
      ].sort(),
    );
  });

  it("a reseller cannot read the aggregates of its own or another network", async () => {
    const { a, c, network, otherNetwork } = await scenario();

    for (const client of [a.client, c.client]) {
      const { data } = await client
        .from("factory_network_stats")
        .select("network_id")
        .in("network_id", [network.id, otherNetwork.id]);
      expect(data).toEqual([]);
    }
  });

  it("an anonymous visitor cannot read the view", async () => {
    const anon = createClient(SUPABASE_URL, PUBLISHABLE_KEY);
    const { data, error } = await anon.from("factory_network_stats").select("network_id");
    expect(data ?? []).toEqual([]);
    expect(error?.code).toBe("42501");
  });

  it("pending and expired invites are not resellers and do not lower utilisation", async () => {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN");
    const network = await makeNetwork(factoryOrg.id);
    const r = await makeUser();
    await addMember(network.id, (await makeOrg(r.userId, "RESELLER", "RESELLER")).id, "ACTIVE");
    await inviteMember(network.id);
    const expired = await inviteMember(network.id);
    await admin()
      .from("network_members")
      .update({ invite_expires_at: new Date(Date.now() - 86_400_000).toISOString() })
      .eq("id", expired.id);

    setTestClient(factory.client);
    const { stats, members } = await getFactoryNetworkOverview();
    expect(stats).toMatchObject({
      resellers: 1,
      activeResellers: 1,
      pendingInvites: 1,
      utilizationRate: 100,
    });
    // The list still shows every invite so the admin can follow them up.
    expect(members).toHaveLength(3);
  });
});
