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
import { getResellerProfile } from "@/features/network/queries";
import { submitReview } from "./actions";
import { getTransactionReviews } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

/** VES-42 — SPEC-016 (TC-REV-01..06). */
d("transaction reviews (migration 0045)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica Avalia");
    const network = await makeNetwork(factoryOrg.id, "Rede Avalia");

    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Vendedora Avalia");
    const buyer = await makeUser();
    const buyerOrg = await makeOrg(buyer.userId, "RESELLER", "RESELLER", "Compradora Avalia");
    const outsider = await makeUser();
    await makeOrg(outsider.userId, "RESELLER", "RESELLER", "Fora Avalia");
    await addMember(network.id, sellerOrg.id);
    await addMember(network.id, buyerOrg.id);

    const product = await makeProduct(sellerOrg.id, { name: "Blusa Avalia" });
    const variant = await makeVariant(product.id, { size: "G" });
    await stockUp(seller.client, variant.id, 6);
    const { data: offer } = await seller.client.rpc("publish_offer", {
      p_variant_id: variant.id,
      p_network_id: network.id,
      p_quantity: 4,
      p_transfer_price: 50,
    });
    const offerId = (offer as unknown as { id: string }).id;

    const openNegotiation = async () => {
      const { data } = await buyer.client.rpc("open_negotiation", {
        p_offer_id: offerId,
        p_quantity: 1,
        p_amount: 50,
      });
      return (data as unknown as { id: string }).id;
    };
    const completed = await openNegotiation();
    await seller.client.rpc("negotiation_transition", {
      p_negotiation_id: completed,
      p_action: "accept",
    });
    await seller.client.rpc("complete_negotiation", { p_negotiation_id: completed });
    const pending = await openNegotiation();

    const { data: order, error } = await admin()
      .from("supply_orders")
      .insert({
        reseller_id: buyerOrg.id,
        supplier_id: factoryOrg.id,
        status: "DELIVERED",
        total_quantity: 3,
        total_amount: 300,
      })
      .select("id")
      .single();
    if (error) throw error;

    return {
      factory,
      factoryOrg,
      seller,
      sellerOrg,
      buyer,
      buyerOrg,
      outsider,
      completed,
      pending,
      orderId: order.id,
    };
  }

  beforeAll(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());

  const review = (kind: string, transactionId: string, rating: unknown, comment = "") =>
    submitReview({}, formData({ kind, transactionId, rating, comment }));

  it("each party rates the other once after a completed negotiation (TC-REV-01)", async () => {
    setTestClient(ctx.buyer.client);
    await expectRedirect(
      () => review("negotiation", ctx.completed, 5, "  Peça impecável  "),
      `/negociacoes/${ctx.completed}?toast=review-submitted`,
    );
    setTestClient(ctx.seller.client);
    await expectRedirect(
      () => review("negotiation", ctx.completed, 4),
      `/negociacoes/${ctx.completed}?toast=review-submitted`,
    );

    const { data } = await admin()
      .from("reviews")
      .select("reviewer_org_id, reviewed_org_id, rating, comment")
      .eq("negotiation_id", ctx.completed)
      .order("rating", { ascending: false });
    expect(data).toEqual([
      {
        reviewer_org_id: ctx.buyerOrg.id,
        reviewed_org_id: ctx.sellerOrg.id,
        rating: 5,
        comment: "Peça impecável",
      },
      {
        reviewer_org_id: ctx.sellerOrg.id,
        reviewed_org_id: ctx.buyerOrg.id,
        rating: 4,
        comment: null,
      },
    ]);

    // Each side sees what it wrote and what it got.
    const seen = await getTransactionReviews("negotiation", ctx.completed);
    expect(seen.mine).toMatchObject({ rating: 4, comment: null });
    expect(seen.received).toMatchObject({ rating: 5, comment: "Peça impecável" });
  });

  it("refuses a second review of the same transaction (TC-REV-02)", async () => {
    setTestClient(ctx.buyer.client);
    expect(await review("negotiation", ctx.completed, 1)).toEqual({
      error: "Você já avaliou esta transação",
    });
  });

  it("refuses an unfinished transaction and an outsider (TC-REV-03)", async () => {
    setTestClient(ctx.buyer.client);
    expect(await review("negotiation", ctx.pending, 5)).toEqual({
      error: "Só é possível avaliar uma transação concluída",
    });
    setTestClient(ctx.outsider.client);
    expect(await review("negotiation", ctx.completed, 1)).toEqual({
      error: "Você não tem permissão para esta ação",
    });
  });

  it("validates the rating and the comment (TC-REV-04)", async () => {
    setTestClient(ctx.buyer.client);
    expect(await review("negotiation", ctx.pending, 6)).toEqual({
      error: "Escolha uma nota de 1 a 5",
    });
    expect(await review("negotiation", ctx.pending, 3, "x".repeat(501))).toEqual({
      error: "Use no máximo 500 caracteres no comentário",
    });
    const { error } = await ctx.buyer.client.rpc("submit_review", {
      p_rating: 0,
      p_negotiation_id: ctx.pending,
    });
    expect(error?.message).toBe("A nota deve ser de 1 a 5");
  });

  it("rates the factory after a delivered supply order, and the factory the reseller", async () => {
    setTestClient(ctx.buyer.client);
    await expectRedirect(
      () => review("supply_order", ctx.orderId, 3, "Atrasou um pouco"),
      `/pedidos/${ctx.orderId}?toast=review-submitted`,
    );
    setTestClient(ctx.factory.client);
    await expectRedirect(
      () => review("supply_order", ctx.orderId, 5),
      `/pedidos/${ctx.orderId}?toast=review-submitted`,
    );
    const seen = await getTransactionReviews("supply_order", ctx.orderId);
    expect(seen.mine?.rating).toBe(5);
    expect(seen.received?.comment).toBe("Atrasou um pouco");
  });

  it("RLS: nobody else reads, writes or edits a review (TC-REV-05)", async () => {
    const { data: hidden } = await ctx.outsider.client
      .from("reviews")
      .select("id")
      .eq("negotiation_id", ctx.completed);
    expect(hidden ?? []).toHaveLength(0);

    const insert = await ctx.buyer.client.from("reviews").insert({
      negotiation_id: ctx.pending,
      reviewer_org_id: ctx.buyerOrg.id,
      reviewed_org_id: ctx.sellerOrg.id,
      rating: 5,
    });
    expect(insert.error).not.toBeNull();

    // The seller tries to raise the rating the buyer gave her.
    await ctx.seller.client
      .from("reviews")
      .update({ rating: 5 })
      .eq("negotiation_id", ctx.completed)
      .eq("reviewer_org_id", ctx.sellerOrg.id);
    await ctx.seller.client.from("reviews").delete().eq("negotiation_id", ctx.completed);
    const { data } = await admin()
      .from("reviews")
      .select("rating")
      .eq("negotiation_id", ctx.completed)
      .eq("reviewer_org_id", ctx.sellerOrg.id)
      .single();
    expect(data?.rating).toBe(4);
  });

  it("shows the average and the count on the public profile (TC-REV-06)", async () => {
    setTestClient(ctx.seller.client);
    const buyerProfile = await getResellerProfile(ctx.buyerOrg.id);
    // 4 from the seller (negotiation) + 5 from the factory (supply order).
    expect(buyerProfile).toMatchObject({ ratingAverage: 4.5, ratingCount: 2 });

    setTestClient(ctx.buyer.client);
    expect(await getResellerProfile(ctx.sellerOrg.id)).toMatchObject({
      ratingAverage: 5,
      ratingCount: 1,
    });
  });
});
