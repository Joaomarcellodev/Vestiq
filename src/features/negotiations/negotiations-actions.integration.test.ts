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
import { negotiationAction, openNegotiation } from "./actions";
import { getNegotiation, listNegotiations } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("negotiations actions + queries (SPEC-009)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN");
    const network = await makeNetwork(factoryOrg.id);

    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Vendedora Neg");
    const buyer = await makeUser();
    const buyerOrg = await makeOrg(buyer.userId, "RESELLER", "RESELLER", "Compradora Neg");
    await addMember(network.id, sellerOrg.id);
    await addMember(network.id, buyerOrg.id);

    const product = await makeProduct(sellerOrg.id, { name: "Blazer" });
    const variant = await makeVariant(product.id, { size: "P", retail_price: 600 });
    await stockUp(seller.client, variant.id, 6);

    setTestClient(seller.client);
    await expectRedirect(
      () =>
        publishOffer(
          {},
          formData({
            variantId: variant.id,
            networkId: network.id,
            quantity: 4,
            transferPrice: 400,
            note: "",
          }),
        ),
      /offer-published/,
    );
    const { data: offer } = await admin()
      .from("offers")
      .select("id")
      .eq("product_variant_id", variant.id)
      .single();

    return { seller, sellerOrg, buyer, buyerOrg, offerId: offer!.id as string };
  }

  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());

  async function openNeg() {
    setTestClient(ctx.buyer.client);
    const dest = await expectRedirect(
      () =>
        openNegotiation(
          {},
          formData({ offerId: ctx.offerId, quantity: 2, amount: 700, message: "" }),
        ),
      /negociacoes\/[0-9a-f-]{36}\?toast=negotiation-opened/,
    );
    return dest.split("/")[2]!.split("?")[0]!;
  }

  it("openNegotiation: creates a PENDING negotiation and redirects", async () => {
    const negId = await openNeg();
    const { negotiation } = await getNegotiation(negId);
    expect(negotiation?.status).toBe("PENDING");
    expect(Number(negotiation?.amount)).toBe(700);
  });

  it("openNegotiation: rejects invalid input (zod)", async () => {
    setTestClient(ctx.buyer.client);
    const state = await openNegotiation(
      {},
      formData({ offerId: ctx.offerId, quantity: 0, amount: 700, message: "" }),
    );
    expect(state.error).toMatch(/quantidade/i);
  });

  it("negotiationAction: accept → redirects with the accepted toast", async () => {
    const negId = await openNeg();
    setTestClient(ctx.seller.client);
    await expectRedirect(
      () => negotiationAction(formData({ negotiationId: negId, action: "accept" })),
      new RegExp(`/negociacoes/${negId}\\?toast=negotiation-accepted`),
    );
    const { negotiation } = await getNegotiation(negId);
    expect(negotiation?.status).toBe("ACCEPTED");
  });

  it("negotiationAction: reject → redirects with the rejected toast", async () => {
    const negId = await openNeg();
    setTestClient(ctx.seller.client);
    await expectRedirect(
      () => negotiationAction(formData({ negotiationId: negId, action: "reject" })),
      /toast=negotiation-rejected/,
    );
    expect((await getNegotiation(negId)).negotiation?.status).toBe("REJECTED");
  });

  it("negotiationAction: message → appends an event, no redirect", async () => {
    const negId = await openNeg();
    setTestClient(ctx.seller.client);
    const res = await negotiationAction(
      formData({ negotiationId: negId, action: "message", message: "Consigo por 650?" }),
    );
    expect(res).toBeUndefined();
    const { events } = await getNegotiation(negId);
    expect(events.some((e) => e.body === "Consigo por 650?")).toBe(true);
  });

  it("negotiationAction: complete → transfers and redirects", async () => {
    const negId = await openNeg();
    setTestClient(ctx.seller.client);
    await expectRedirect(
      () => negotiationAction(formData({ negotiationId: negId, action: "accept" })),
      /negotiation-accepted/,
    );
    await expectRedirect(
      () => negotiationAction(formData({ negotiationId: negId, action: "complete" })),
      /toast=negotiation-completed/,
    );
    expect((await getNegotiation(negId)).negotiation?.status).toBe("COMPLETED");
  });

  it("listNegotiations: visible only to the two parties (RLS)", async () => {
    const negId = await openNeg();

    setTestClient(ctx.seller.client);
    expect((await listNegotiations()).map((n) => n.id)).toContain(negId);
    setTestClient(ctx.buyer.client);
    expect((await listNegotiations()).map((n) => n.id)).toContain(negId);

    const stranger = await makeUser();
    await makeOrg(stranger.userId, "RESELLER", "RESELLER");
    setTestClient(stranger.client);
    expect((await listNegotiations()).map((n) => n.id)).not.toContain(negId);
  });
});
