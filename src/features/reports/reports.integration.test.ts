import { afterEach, beforeAll, describe, expect, it } from "vitest";
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
import { submitReport } from "./actions";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

/** VES-43 — SPEC-017 reports (TC-REP-01..05). */
d("reports (migration 0046)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(
      factory.userId,
      "FACTORY",
      "FACTORY_ADMIN",
      "Fábrica Denúncia",
    );
    const network = await makeNetwork(factoryOrg.id, "Rede Denúncia");

    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Vendedora Denúncia");
    const buyer = await makeUser();
    const buyerOrg = await makeOrg(buyer.userId, "RESELLER", "RESELLER", "Compradora Denúncia");
    const peer = await makeUser();
    const peerOrg = await makeOrg(peer.userId, "RESELLER", "RESELLER", "Colega Denúncia");
    const outsider = await makeUser();
    await makeOrg(outsider.userId, "RESELLER", "RESELLER", "Fora Denúncia");
    for (const org of [sellerOrg, buyerOrg, peerOrg]) await addMember(network.id, org.id);

    const product = await makeProduct(sellerOrg.id, { name: "Bolsa Suspeita" });
    const variant = await makeVariant(product.id);
    await stockUp(seller.client, variant.id, 3);
    const { data: offer } = await seller.client.rpc("publish_offer", {
      p_variant_id: variant.id,
      p_network_id: network.id,
      p_quantity: 2,
      p_transfer_price: 80,
    });
    const offerId = (offer as unknown as { id: string }).id;
    const { data: neg } = await buyer.client.rpc("open_negotiation", {
      p_offer_id: offerId,
      p_quantity: 1,
      p_amount: 80,
    });

    return {
      factory,
      factoryOrg,
      seller,
      sellerOrg,
      buyer,
      buyerOrg,
      peer,
      peerOrg,
      outsider,
      offerId,
      negotiationId: (neg as unknown as { id: string }).id,
    };
  }

  beforeAll(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());

  const report = (targetType: string, targetId: string, reason?: string, description = "") =>
    submitReport({}, formData({ targetType, targetId, reason, description }));

  it("a peer reports an offer and goes back to it (TC-REP-01)", async () => {
    setTestClient(ctx.buyer.client);
    await expectRedirect(
      () => report("OFFER", ctx.offerId, "PRODUTO_FALSIFICADO", "  Logo torto  "),
      `/rede/ofertas/${ctx.offerId}?toast=report-submitted`,
    );
    const { data } = await admin()
      .from("reports")
      .select("reporter_org_id, reporter_user_id, target_org_id, reason, description, status")
      .eq("target_id", ctx.offerId)
      .single();
    expect(data).toEqual({
      reporter_org_id: ctx.buyerOrg.id,
      reporter_user_id: ctx.buyer.userId,
      target_org_id: ctx.sellerOrg.id,
      reason: "PRODUTO_FALSIFICADO",
      description: "Logo torto",
      status: "OPEN",
    });
  });

  it("refuses a second open report of the same thing (TC-REP-02)", async () => {
    setTestClient(ctx.buyer.client);
    expect(await report("OFFER", ctx.offerId, "SPAM")).toEqual({
      error: "Você já denunciou isto. A moderação vai analisar.",
    });
  });

  it("reports the other party of a negotiation and a network peer (TC-REP-01)", async () => {
    setTestClient(ctx.seller.client);
    await expectRedirect(
      () => report("NEGOTIATION", ctx.negotiationId, "ASSEDIO"),
      `/negociacoes/${ctx.negotiationId}?toast=report-submitted`,
    );
    setTestClient(ctx.peer.client);
    await expectRedirect(
      () => report("ORGANIZATION", ctx.sellerOrg.id, "FRAUDE"),
      `/rede/revendedoras/${ctx.sellerOrg.id}?toast=report-submitted`,
    );
    const { data } = await admin()
      .from("reports")
      .select("target_type, reporter_org_id, target_org_id")
      .in("target_id", [ctx.negotiationId, ctx.sellerOrg.id])
      .order("target_type");
    expect(data).toEqual([
      {
        target_type: "NEGOTIATION",
        reporter_org_id: ctx.sellerOrg.id,
        target_org_id: ctx.buyerOrg.id,
      },
      {
        target_type: "ORGANIZATION",
        reporter_org_id: ctx.peerOrg.id,
        target_org_id: ctx.sellerOrg.id,
      },
    ]);
  });

  it("only reports what the reporter can see, never her own store (TC-REP-03)", async () => {
    setTestClient(ctx.outsider.client);
    for (const [type, id] of [
      ["OFFER", ctx.offerId],
      ["NEGOTIATION", ctx.negotiationId],
      ["ORGANIZATION", ctx.sellerOrg.id],
    ] as const) {
      expect(await report(type, id, "SPAM")).toEqual({
        error: "Você não tem permissão para esta ação",
      });
    }
    setTestClient(ctx.peer.client);
    // a peer is not a party of the negotiation, and a factory isn't a reseller
    expect(await report("NEGOTIATION", ctx.negotiationId, "SPAM")).toEqual({
      error: "Você não tem permissão para esta ação",
    });
    expect(await report("ORGANIZATION", ctx.factoryOrg.id, "SPAM")).toEqual({
      error: "Você não tem permissão para esta ação",
    });

    setTestClient(ctx.seller.client);
    expect(await report("OFFER", ctx.offerId, "SPAM")).toEqual({
      error: "Você não pode denunciar a sua própria loja",
    });
  });

  it("validates the reason and the description (TC-REP-04)", async () => {
    setTestClient(ctx.peer.client);
    expect(await report("OFFER", ctx.offerId)).toEqual({ error: "Escolha o motivo da denúncia" });
    expect(await report("OFFER", ctx.offerId, "OUTRO", "x".repeat(1001))).toEqual({
      error: "Use no máximo 1000 caracteres na descrição",
    });
  });

  it("RLS: the reporter sees only her reports; the reported store sees none (TC-REP-05)", async () => {
    const mine = await ctx.buyer.client.from("reports").select("target_type");
    expect(mine.data?.map((r) => r.target_type)).toEqual(["OFFER"]);

    // The peer reported the seller but doesn't see the buyer's report of the same store.
    const peers = await ctx.peer.client.from("reports").select("reporter_org_id");
    expect(peers.data?.every((r) => r.reporter_org_id === ctx.peerOrg.id)).toBe(true);

    const reported = await ctx.seller.client
      .from("reports")
      .select("id")
      .eq("target_org_id", ctx.sellerOrg.id);
    expect(reported.data ?? []).toHaveLength(0);

    const insert = await ctx.buyer.client.from("reports").insert({
      reporter_org_id: ctx.buyerOrg.id,
      target_type: "ORGANIZATION",
      target_id: ctx.sellerOrg.id,
      target_org_id: ctx.sellerOrg.id,
      reason: "SPAM",
    });
    expect(insert.error).not.toBeNull();
  });
});
