import { afterEach, describe, expect, it } from "vitest";
import { makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import {
  addMember,
  clearTestClient,
  expectRedirect,
  formData,
  makeNetwork,
  stockUp,
  setTestClient,
} from "@/test/actions";
import { confirmSale } from "@/features/sales/actions";
import { publishOffer } from "@/features/offers/actions";
import { getResellerDashboard } from "./queries";
import { getFactoryNetworkOverview } from "@/features/network/queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("dashboard + factory overview queries", () => {
  afterEach(() => clearTestClient());

  it("getResellerDashboard aggregates sales, stock, trend and top products", async () => {
    const u = await makeUser();
    const org = await makeOrg(u.userId, "RESELLER", "RESELLER", "Loja Dash");
    const product = await makeProduct(org.id, { name: "Regata" });
    const v = await makeVariant(product.id, { retail_price: 100 });
    await stockUp(u.client, v.id, 20);
    setTestClient(u.client);

    await expectRedirect(
      () =>
        confirmSale(
          {},
          formData({
            paymentMethod: "PIX",
            items: JSON.stringify([{ variantId: v.id, quantity: 4, unitPrice: 100 }]),
          }),
        ),
      /sale-confirmed/,
    );

    const dash = await getResellerDashboard();
    expect(dash.orgName).toBe("Loja Dash");
    expect(dash.monthSales).toBe(1);
    expect(dash.monthRevenue).toBe(400);
    expect(dash.stockUnits).toBe(16);
    expect(dash.salesTrend).toHaveLength(14);
    expect(dash.topProducts[0]).toMatchObject({ name: "Regata", units: 4 });
  });

  it("getResellerDashboard is zeroed for a fresh org", async () => {
    const u = await makeUser();
    await makeOrg(u.userId, "RESELLER", "RESELLER", "Loja Vazia");
    setTestClient(u.client);
    const dash = await getResellerDashboard();
    expect(dash).toMatchObject({
      monthSales: 0,
      monthRevenue: 0,
      stockUnits: 0,
      pendingNegotiations: 0,
    });
    expect(dash.lowStock).toEqual([]);
  });

  it("getFactoryNetworkOverview: members, offers and utilisation", async () => {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica Dash");
    const network = await makeNetwork(factoryOrg.id, "Rede Dash");

    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Rev A");
    const inactive = await makeUser();
    const inactiveOrg = await makeOrg(inactive.userId, "RESELLER", "RESELLER", "Rev B");
    await addMember(network.id, sellerOrg.id, "ACTIVE");
    await addMember(network.id, inactiveOrg.id, "DISABLED");

    const product = await makeProduct(sellerOrg.id, { name: "Item" });
    const variant = await makeVariant(product.id, { retail_price: 300 });
    await stockUp(seller.client, variant.id, 5);
    setTestClient(seller.client);
    await expectRedirect(
      () =>
        publishOffer(
          {},
          formData({
            variantId: variant.id,
            networkId: network.id,
            quantity: 2,
            transferPrice: 200,
            note: "",
          }),
        ),
      /offer-published/,
    );

    setTestClient(factory.client);
    const overview = await getFactoryNetworkOverview();
    expect(overview.factoryName).toBe("Fábrica Dash");
    expect(overview.stats.resellers).toBe(2);
    expect(overview.stats.activeResellers).toBe(1);
    expect(overview.stats.utilizationRate).toBe(50);
    expect(overview.members).toHaveLength(2);

    // NOTE: `offers` RLS only lets the org owner and reseller peers read offers —
    // the factory admin is neither, so this stat reads 0 in the current model.
    // The `rede-fabrica` "Ofertas / Negociações" cards are effectively always 0.
    expect(overview.stats.offers).toBe(0);
    expect(overview.stats.negotiationsStarted).toBe(0);
  });

  it("getFactoryNetworkOverview: rejected for a reseller (role guard)", async () => {
    const u = await makeUser();
    await makeOrg(u.userId, "RESELLER", "RESELLER");
    setTestClient(u.client);
    await expect(getFactoryNetworkOverview()).rejects.toThrow(/não permitida/i);
  });
});
