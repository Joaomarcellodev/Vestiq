import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import { addMember, makeNetwork, stockUp } from "@/test/actions";
import type { NotificationRow } from "./live";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

type User = Awaited<ReturnType<typeof makeUser>>;

/** Subscribes a user to one org's notifications, the way the bell does. */
async function listen(user: User, organizationId: string) {
  const received: NotificationRow[] = [];
  await user.client.realtime.setAuth();
  const channel: RealtimeChannel = user.client
    .channel(`test-notifications-${organizationId}-${Math.random()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `organization_id=eq.${organizationId}`,
      },
      (payload) => received.push(payload.new as NotificationRow),
    );
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("realtime subscribe timeout")), 10_000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  return { received, channel };
}

async function waitFor(check: () => boolean, ms = 8_000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) return false;
    await new Promise((r) => setTimeout(r, 100));
  }
  return true;
}

d("notifications in real time (ADR-0011, RF-NOTIF-001)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;
  const channels: { user: User; channel: RealtimeChannel }[] = [];

  async function setup() {
    const factoryUser = await makeUser();
    const factory = await makeOrg(factoryUser.userId, "FACTORY", "FACTORY_ADMIN");
    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Vendedora Live");
    const buyer = await makeUser();
    const buyerOrg = await makeOrg(buyer.userId, "RESELLER", "RESELLER", "Compradora Live");
    const outsider = await makeUser();
    const outsiderOrg = await makeOrg(outsider.userId, "RESELLER", "RESELLER", "Curiosa Live");
    const net = await makeNetwork(factory.id);
    for (const org of [sellerOrg, buyerOrg, outsiderOrg]) await addMember(net.id, org.id);

    const product = await makeProduct(sellerOrg.id, { name: "Saia Live" });
    const variant = await makeVariant(product.id, { retail_price: 500 });
    await stockUp(seller.client, variant.id, 5);
    const { data: offer, error } = await seller.client.rpc("publish_offer", {
      p_variant_id: variant.id,
      p_network_id: net.id,
      p_quantity: 3,
      p_transfer_price: 400,
    });
    if (error) throw error;
    return { seller, sellerOrg, buyer, buyerOrg, outsider, offerId: (offer as { id: string }).id };
  }

  beforeAll(async () => {
    ctx = await setup();
  });
  afterAll(async () => {
    for (const { user, channel } of channels) await user.client.removeChannel(channel);
  });

  it("delivers a new proposal and a new message to the other party (TC-NOTIF-05)", async () => {
    const sellerSub = await listen(ctx.seller, ctx.sellerOrg.id);
    channels.push({ user: ctx.seller, channel: sellerSub.channel });

    const { data: negotiation, error } = await ctx.buyer.client.rpc("open_negotiation", {
      p_offer_id: ctx.offerId,
      p_quantity: 1,
      p_amount: 400,
    });
    expect(error).toBeNull();
    const negotiationId = (negotiation as { id: string }).id;

    expect(
      await waitFor(() => sellerSub.received.some((n) => n.type === "NEGOTIATION_OPENED")),
    ).toBe(true);
    expect(sellerSub.received.find((n) => n.type === "NEGOTIATION_OPENED")).toMatchObject({
      organization_id: ctx.sellerOrg.id,
      title: "Nova proposta recebida",
      link: `/negociacoes/${negotiationId}`,
      read_at: null,
    });

    const { error: msgErr } = await ctx.buyer.client.rpc("send_negotiation_message", {
      p_negotiation_id: negotiationId,
      p_body: "Consegue entregar sexta?",
    });
    expect(msgErr).toBeNull();
    expect(
      await waitFor(() => sellerSub.received.some((n) => n.type === "NEGOTIATION_MESSAGE")),
    ).toBe(true);
    expect(sellerSub.received.find((n) => n.type === "NEGOTIATION_MESSAGE")).toMatchObject({
      title: "Nova mensagem na negociação",
    });
  });

  it("never streams another organization's notifications (TC-NOTIF-06)", async () => {
    // The outsider asks for the seller's org explicitly — RLS must still drop every row.
    const outsiderSub = await listen(ctx.outsider, ctx.sellerOrg.id);
    // The buyer listens to her own org: the author of an event isn't notified.
    const buyerSub = await listen(ctx.buyer, ctx.buyerOrg.id);
    const sellerSub = await listen(ctx.seller, ctx.sellerOrg.id);
    channels.push(
      { user: ctx.outsider, channel: outsiderSub.channel },
      { user: ctx.buyer, channel: buyerSub.channel },
      { user: ctx.seller, channel: sellerSub.channel },
    );

    const { error } = await ctx.buyer.client.rpc("open_negotiation", {
      p_offer_id: ctx.offerId,
      p_quantity: 1,
      p_amount: 390,
    });
    expect(error).toBeNull();

    expect(await waitFor(() => sellerSub.received.length > 0)).toBe(true);
    // give the others the same window
    await new Promise((r) => setTimeout(r, 1_500));
    expect(outsiderSub.received).toEqual([]);
    expect(buyerSub.received).toEqual([]);
  });
});
