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
import { NotFoundError } from "@/test/next";
import { getMySuspension, listMyOrganizations } from "@/features/organizations/queries";
import { getResellerProfile } from "@/features/network/queries";
import { listNetworkOffers } from "@/features/offers/queries";
import { moderateReport, setOrganizationSuspension } from "./actions";
import {
  countOpenReports,
  getModerationReport,
  listModerationReports,
  listSuspendedOrganizations,
} from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

/** VES-44 — SPEC-017 moderation (TC-MOD-01..06). */
d("moderation (migration 0047)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const platform = await makeUser();
    const platformOrg = await makeOrg(
      platform.userId,
      "PLATFORM",
      "PLATFORM_ADMIN",
      "Plataforma Teste",
    );
    const factory = await makeUser();
    const factoryOrg = await makeOrg(
      factory.userId,
      "FACTORY",
      "FACTORY_ADMIN",
      "Fábrica Moderação",
    );
    const network = await makeNetwork(factoryOrg.id, "Rede Moderação");

    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Vendedora Moderada");
    const buyer = await makeUser();
    const buyerOrg = await makeOrg(buyer.userId, "RESELLER", "RESELLER", "Compradora Moderação");
    const peer = await makeUser();
    const peerOrg = await makeOrg(peer.userId, "RESELLER", "RESELLER", "Colega Moderação");
    for (const org of [sellerOrg, buyerOrg, peerOrg]) await addMember(network.id, org.id);

    const product = await makeProduct(sellerOrg.id, { name: "Tênis Réplica" });
    const variant = await makeVariant(product.id);
    await stockUp(seller.client, variant.id, 4);
    const publish = async () => {
      const { data } = await seller.client.rpc("publish_offer", {
        p_variant_id: variant.id,
        p_network_id: network.id,
        p_quantity: 1,
        p_transfer_price: 120,
      });
      return (data as unknown as { id: string }).id;
    };
    const removedOffer = await publish();
    const keptOffer = await publish();

    const report = async (
      client: typeof buyer.client,
      type: "OFFER" | "ORGANIZATION",
      id: string,
    ) => {
      const { data, error } = await client.rpc("submit_report", {
        p_target_type: type,
        p_target_id: id,
        p_reason: "PRODUTO_FALSIFICADO",
        p_description: "Fotos de réplica",
      });
      if (error) throw error;
      return data.id;
    };
    const offerByBuyer = await report(buyer.client, "OFFER", removedOffer);
    const offerByPeer = await report(peer.client, "OFFER", removedOffer);
    const orgByPeer = await report(peer.client, "ORGANIZATION", sellerOrg.id);
    const dismissed = await report(buyer.client, "ORGANIZATION", peerOrg.id);

    return {
      platform,
      platformOrg,
      seller,
      sellerOrg,
      buyer,
      buyerOrg,
      peer,
      peerOrg,
      removedOffer,
      keptOffer,
      offerByBuyer,
      offerByPeer,
      orgByPeer,
      dismissed,
    };
  }

  beforeAll(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());

  const decide = (reportId: string, action: string, reason = "Confirmado pelas fotos") =>
    moderateReport({}, formData({ reportId, action, reason }));

  it("only the platform admin opens the panel (TC-MOD-01)", async () => {
    setTestClient(ctx.buyer.client);
    await expect(listModerationReports("OPEN")).rejects.toBeInstanceOf(NotFoundError);
    // and the database refuses the functions to anyone else
    const { data } = await ctx.buyer.client.rpc("list_moderation_reports");
    expect(data ?? []).toHaveLength(0);
    const { error } = await ctx.buyer.client.rpc("moderate_report", {
      p_report_id: ctx.dismissed,
      p_action: "DISMISS_REPORT",
      p_reason: "x",
    });
    expect(error?.message).toMatch(/not authorized/);
  });

  it("lists the open queue with what each report points at", async () => {
    setTestClient(ctx.platform.client);
    const { items } = await listModerationReports("OPEN");
    const mine = items.filter((r) =>
      [ctx.offerByBuyer, ctx.offerByPeer, ctx.orgByPeer, ctx.dismissed].includes(r.id),
    );
    expect(mine).toHaveLength(4);
    const offerReport = await getModerationReport(ctx.offerByBuyer);
    expect(offerReport).toMatchObject({
      targetType: "OFFER",
      targetLabel: "Tênis Réplica",
      targetActive: true,
      targetOrgName: "Vendedora Moderada",
      reporterOrgName: "Compradora Moderação",
      description: "Fotos de réplica",
      openReportsOnOrg: 3,
    });
    expect(await countOpenReports()).toBeGreaterThanOrEqual(4);
    expect(await getModerationReport("bad-id")).toBeNull();
  });

  it("a decision needs a reason (TC-MOD-02)", async () => {
    setTestClient(ctx.platform.client);
    expect(await decide(ctx.dismissed, "DISMISS_REPORT", "  ")).toEqual({
      error: "Informe o motivo da decisão",
    });
  });

  it("archives a report (TC-MOD-02)", async () => {
    setTestClient(ctx.platform.client);
    await expectRedirect(
      () => decide(ctx.dismissed, "DISMISS_REPORT", "Sem indícios"),
      `/moderacao/denuncias/${ctx.dismissed}?toast=report-dismissed`,
    );
    expect(await getModerationReport(ctx.dismissed)).toMatchObject({
      status: "DISMISSED",
      resolutionNote: "Sem indícios",
    });
    expect(await decide(ctx.dismissed, "DISMISS_REPORT")).toEqual({
      error: "Esta denúncia já foi resolvida",
    });
  });

  it("removes the reported offer and settles every open report about it (TC-MOD-03)", async () => {
    setTestClient(ctx.platform.client);
    expect(await decide(ctx.orgByPeer, "REMOVE_OFFER")).toEqual({
      error: "Só uma denúncia de oferta remove a oferta",
    });
    await expectRedirect(
      () => decide(ctx.offerByBuyer, "REMOVE_OFFER"),
      `/moderacao/denuncias/${ctx.offerByBuyer}?toast=report-offer-removed`,
    );
    const { data: offer } = await admin()
      .from("offers")
      .select("status")
      .eq("id", ctx.removedOffer)
      .single();
    expect(offer?.status).toBe("CANCELLED");
    expect((await getModerationReport(ctx.offerByPeer))?.status).toBe("ACTIONED");

    const { data: log } = await admin()
      .from("moderation_actions")
      .select("action, offer_id, reason, actor_id")
      .eq("report_id", ctx.offerByBuyer)
      .single();
    expect(log).toEqual({
      action: "REMOVE_OFFER",
      offer_id: ctx.removedOffer,
      reason: "Confirmado pelas fotos",
      actor_id: ctx.platform.userId,
    });
  });

  it("suspends the store: no access, no feed, no profile, login refused (TC-MOD-04/05)", async () => {
    setTestClient(ctx.platform.client);
    await expectRedirect(
      () => decide(ctx.orgByPeer, "SUSPEND_ORGANIZATION", "Venda de réplicas"),
      `/moderacao/denuncias/${ctx.orgByPeer}?toast=report-org-suspended`,
    );
    expect((await listSuspendedOrganizations()).map((o) => o.name)).toContain("Vendedora Moderada");

    // The suspended store reads nothing and can't publish.
    setTestClient(ctx.seller.client);
    expect(await listMyOrganizations()).toEqual([]);
    expect(await getMySuspension()).toMatchObject({
      organizationName: "Vendedora Moderada",
      reason: "Venda de réplicas",
    });
    const { data: products } = await ctx.seller.client.from("products").select("id");
    expect(products ?? []).toHaveLength(0);

    // Peers no longer see it in the network.
    setTestClient(ctx.buyer.client);
    expect(await getResellerProfile(ctx.sellerOrg.id)).toBeNull();
    const feed = await listNetworkOffers(undefined, 1, ctx.sellerOrg.id);
    expect(feed.items).toHaveLength(0);
    expect(await getMySuspension()).toBeNull();
  });

  it("reactivates the store with a reason on record (TC-MOD-06)", async () => {
    setTestClient(ctx.platform.client);
    expect(
      await setOrganizationSuspension(
        {},
        formData({ organizationId: ctx.sellerOrg.id, suspended: "0", reason: "" }),
      ),
    ).toEqual({ error: "Informe o motivo da decisão" });
    await expectRedirect(
      () =>
        setOrganizationSuspension(
          {},
          formData({
            organizationId: ctx.sellerOrg.id,
            suspended: "0",
            reason: "Recurso aceito",
            back: "/moderacao",
          }),
        ),
      "/moderacao?toast=org-reactivated",
    );

    setTestClient(ctx.seller.client);
    expect((await listMyOrganizations()).map((o) => o.id)).toEqual([ctx.sellerOrg.id]);
    setTestClient(ctx.buyer.client);
    const feed = await listNetworkOffers(undefined, 1, ctx.sellerOrg.id);
    expect(feed.items.map((o) => o.id)).toEqual([ctx.keptOffer]);

    const { data: log } = await admin()
      .from("moderation_actions")
      .select("action")
      .eq("target_org_id", ctx.sellerOrg.id)
      .order("created_at");
    expect(log?.map((l) => l.action)).toEqual([
      "REMOVE_OFFER",
      "SUSPEND_ORGANIZATION",
      "REACTIVATE_ORGANIZATION",
    ]);

    // Reactivating an active store is refused; the platform itself can't be suspended.
    setTestClient(ctx.platform.client);
    expect(
      await setOrganizationSuspension(
        {},
        formData({ organizationId: ctx.sellerOrg.id, suspended: "0", reason: "De novo" }),
      ),
    ).toEqual({ error: "Organização não encontrada ou já neste estado" });
    expect(
      await setOrganizationSuspension(
        {},
        formData({ organizationId: ctx.platformOrg.id, suspended: "1", reason: "Teste" }),
      ),
    ).toEqual({ error: "Organização não encontrada ou já neste estado" });
  });
});
