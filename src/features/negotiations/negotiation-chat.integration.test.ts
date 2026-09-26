import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import { addMember, clearTestClient, makeNetwork, setTestClient, stockUp } from "@/test/actions";
import { refreshNegotiationEvents, sendNegotiationMessage } from "./actions";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

type User = Awaited<ReturnType<typeof makeUser>>;
type EventRow = { id: string; negotiation_id: string; type: string; body: string | null };

/** Subscribes a user to the negotiation's events and collects what arrives. */
async function listen(user: User, negotiationId: string) {
  const received: EventRow[] = [];
  await user.client.realtime.setAuth();
  const channel: RealtimeChannel = user.client
    .channel(`test-negotiation-${negotiationId}-${Math.random()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "negotiation_events",
        filter: `negotiation_id=eq.${negotiationId}`,
      },
      (payload) => received.push(payload.new as EventRow),
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

d("negotiation chat in real time (ADR-0010, RF-NEG-010)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;
  const channels: { user: User; channel: RealtimeChannel }[] = [];

  async function setup() {
    const factoryUser = await makeUser();
    const factory = await makeOrg(factoryUser.userId, "FACTORY", "FACTORY_ADMIN");
    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Vendedora Chat");
    const buyer = await makeUser();
    const buyerOrg = await makeOrg(buyer.userId, "RESELLER", "RESELLER", "Compradora Chat");
    const outsider = await makeUser();
    const outsiderOrg = await makeOrg(outsider.userId, "RESELLER", "RESELLER", "Curiosa Chat");
    const net = await makeNetwork(factory.id);
    for (const org of [sellerOrg, buyerOrg, outsiderOrg]) await addMember(net.id, org.id);

    const product = await makeProduct(sellerOrg.id, { name: "Bolsa do Chat" });
    const variant = await makeVariant(product.id, { retail_price: 500 });
    await stockUp(seller.client, variant.id, 5);
    const { data: offer, error: offerErr } = await seller.client.rpc("publish_offer", {
      p_variant_id: variant.id,
      p_network_id: net.id,
      p_quantity: 3,
      p_transfer_price: 400,
    });
    if (offerErr) throw offerErr;
    const { data: negotiation, error } = await buyer.client.rpc("open_negotiation", {
      p_offer_id: (offer as { id: string }).id,
      p_quantity: 1,
      p_amount: 400,
    });
    if (error) throw error;
    return { seller, buyer, outsider, negotiationId: (negotiation as { id: string }).id };
  }

  beforeAll(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());
  afterAll(async () => {
    for (const { user, channel } of channels) await user.client.removeChannel(channel);
  });

  it("delivers a message to the other party, not to a third reseller (TC-NEG-16, TC-NEG-17)", async () => {
    const sellerSub = await listen(ctx.seller, ctx.negotiationId);
    const outsiderSub = await listen(ctx.outsider, ctx.negotiationId);
    channels.push(
      { user: ctx.seller, channel: sellerSub.channel },
      { user: ctx.outsider, channel: outsiderSub.channel },
    );

    setTestClient(ctx.buyer.client);
    const result = await sendNegotiationMessage(ctx.negotiationId, "  Consegue entregar sexta?  ");
    expect(result).toMatchObject({
      event: { type: "MESSAGE", body: "Consegue entregar sexta?", actorId: ctx.buyer.userId },
    });
    const sent = "event" in result ? result.event : null;

    expect(await waitFor(() => sellerSub.received.some((e) => e.id === sent?.id))).toBe(true);
    expect(sellerSub.received.find((e) => e.id === sent?.id)).toMatchObject({
      negotiation_id: ctx.negotiationId,
      body: "Consegue entregar sexta?",
    });

    // give the outsider the same window; RLS must keep it empty
    await new Promise((r) => setTimeout(r, 1_500));
    expect(outsiderSub.received).toEqual([]);
  });

  it("refetches the full timeline for gap filling", async () => {
    setTestClient(ctx.seller.client);
    const events = await refreshNegotiationEvents(ctx.negotiationId);
    // a retried first test may have sent the message twice
    expect(events[0]?.type).toBe("CREATED");
    expect(events.at(-1)).toMatchObject({ type: "MESSAGE", body: "Consegue entregar sexta?" });
    setTestClient(ctx.outsider.client);
    expect(await refreshNegotiationEvents(ctx.negotiationId)).toEqual([]);
    expect(await refreshNegotiationEvents("not-a-uuid")).toEqual([]);
  });

  it("rejects third parties, empty and oversized messages (TC-NEG-18)", async () => {
    const count = async () =>
      (
        await admin()
          .from("negotiation_events")
          .select("id", { count: "exact", head: true })
          .eq("negotiation_id", ctx.negotiationId)
      ).count;
    const before = await count();

    setTestClient(ctx.outsider.client);
    expect(await sendNegotiationMessage(ctx.negotiationId, "oi")).toEqual({
      error: "Você não tem permissão para esta ação",
    });
    setTestClient(ctx.seller.client);
    expect(await sendNegotiationMessage(ctx.negotiationId, "   ")).toEqual({
      error: "Escreva uma mensagem",
    });
    expect(await sendNegotiationMessage(ctx.negotiationId, "x".repeat(1001))).toEqual({
      error: "A mensagem pode ter até 1.000 caracteres",
    });
    // the database enforces it too
    const { error } = await ctx.seller.client.rpc("send_negotiation_message", {
      p_negotiation_id: ctx.negotiationId,
      p_body: "x".repeat(1001),
    });
    expect(error?.message).toBe("A mensagem pode ter até 1.000 caracteres");

    expect(await count()).toBe(before);
  });

  it("closes the chat once the negotiation ends (TC-NEG-18)", async () => {
    const { error } = await ctx.buyer.client.rpc("negotiation_transition", {
      p_negotiation_id: ctx.negotiationId,
      p_action: "cancel",
    });
    expect(error).toBeNull();
    setTestClient(ctx.seller.client);
    expect(await sendNegotiationMessage(ctx.negotiationId, "ainda aí?")).toEqual({
      error: "Negociação encerrada",
    });
  });
});
