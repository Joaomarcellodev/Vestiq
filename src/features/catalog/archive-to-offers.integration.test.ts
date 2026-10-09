import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
import { archiveProductToOffers } from "./actions";
import { getArchiveOptions } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("archive product to offers (VES-69, AC-PROD-006-03/04)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factory = await makeUser();
    const factoryOrg = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN");
    const network = await makeNetwork(factoryOrg.id);
    const otherNetwork = await makeNetwork(factoryOrg.id);

    const seller = await makeUser();
    const sellerOrg = await makeOrg(seller.userId, "RESELLER", "RESELLER", "Loja Arquivo");
    await addMember(network.id, sellerOrg.id);

    const product = await makeProduct(sellerOrg.id, { name: "Saia Plissada" });
    const p = await makeVariant(product.id, { size: "P", cost_price: 40 });
    const m = await makeVariant(product.id, { size: "M", cost_price: 45 });
    const empty = await makeVariant(product.id, { size: "G", cost_price: 50 });
    await stockUp(seller.client, p.id, 3);
    await stockUp(seller.client, m.id, 2);

    setTestClient(seller.client);
    return { seller, sellerOrg, network, otherNetwork, product, p, m, empty };
  }

  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());

  const archive = (networkId: string, items: unknown[], productId = ctx.product.id) =>
    archiveProductToOffers({}, formData({ productId, networkId, items: JSON.stringify(items) }));

  async function state() {
    const [{ data: product }, { data: variants }, { data: offers }] = await Promise.all([
      admin().from("products").select("archived_at").eq("id", ctx.product.id).single(),
      admin().from("product_variants").select("archived_at").eq("product_id", ctx.product.id),
      admin()
        .from("offers")
        .select("product_variant_id, network_id, quantity_offered, transfer_price, status")
        .in("product_variant_id", [ctx.p.id, ctx.m.id, ctx.empty.id]),
    ]);
    return {
      archived: product!.archived_at !== null,
      variantsArchived: variants!.every((v) => v.archived_at !== null),
      offers: offers ?? [],
    };
  }

  it("lists the variants with stock, at cost price, and the active networks", async () => {
    const options = await getArchiveOptions(ctx.product.id);
    expect(options?.variants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ variantId: ctx.p.id, stock: 3, costPrice: 40, label: "P" }),
        expect.objectContaining({ variantId: ctx.m.id, stock: 2, costPrice: 45, label: "M" }),
      ]),
    );
    expect(options?.variants.map((v) => v.variantId)).not.toContain(ctx.empty.id);
    expect(options?.networks).toEqual([{ id: ctx.network.id, name: ctx.network.name }]);
  });

  it("publishes one offer per variant with quantity and archives the product (TC-PROD-19)", async () => {
    await expectRedirect(
      () =>
        archive(ctx.network.id, [
          { variantId: ctx.p.id, quantity: 3, transferPrice: 40 },
          { variantId: ctx.m.id, quantity: 0, transferPrice: 45 },
        ]),
      "/produtos?toast=product-archived-offered",
    );

    const after = await state();
    expect(after.archived).toBe(true);
    expect(after.variantsArchived).toBe(true);
    expect(after.offers).toEqual([
      {
        product_variant_id: ctx.p.id,
        network_id: ctx.network.id,
        quantity_offered: 3,
        transfer_price: 40,
        status: "ACTIVE",
      },
    ]);
  });

  it("changes nothing when one of the offers is invalid (TC-PROD-19)", async () => {
    const cases: [string, unknown[], string][] = [
      [
        ctx.network.id,
        [{ variantId: ctx.p.id, quantity: 4, transferPrice: 40 }],
        "Você tem apenas 3 em estoque",
      ],
      [
        ctx.network.id,
        [{ variantId: ctx.p.id, quantity: 1, transferPrice: 0 }],
        "Informe o preço de repasse de cada variação",
      ],
      [
        ctx.otherNetwork.id,
        [{ variantId: ctx.p.id, quantity: 1, transferPrice: 40 }],
        "Você não participa desta rede",
      ],
      [
        ctx.network.id,
        [
          { variantId: ctx.p.id, quantity: 1, transferPrice: 40 },
          { variantId: ctx.m.id, quantity: 9, transferPrice: 45 },
        ],
        "Você tem apenas 2 em estoque",
      ],
    ];
    for (const [networkId, items, error] of cases) {
      expect(await archive(networkId, items)).toEqual({ error });
    }

    const foreign = await makeProduct(ctx.sellerOrg.id, { name: "Outra peça" });
    const foreignVariant = await makeVariant(foreign.id);
    expect(
      await archive(ctx.network.id, [
        { variantId: foreignVariant.id, quantity: 1, transferPrice: 10 },
      ]),
    ).toEqual({ error: "Variação não pertence ao produto" });

    expect(await state()).toEqual({ archived: false, variantsArchived: false, offers: [] });
  });

  it("only archives when no quantity is offered or there is no network (TC-PROD-20)", async () => {
    await expectRedirect(() => archive("", []), "/produtos?toast=product-archived");
    expect(await state()).toEqual({ archived: true, variantsArchived: true, offers: [] });

    expect(await archive("", [])).toEqual({ error: "Este produto já está arquivado" });
  });

  it("blocks another organization (TC-PROD-19)", async () => {
    const intruder = await makeUser();
    await makeOrg(intruder.userId, "RESELLER", "RESELLER");
    setTestClient(intruder.client);
    expect(await archive(ctx.network.id, [])).toEqual({
      error: "Você não tem permissão para esta ação",
    });
    expect((await state()).archived).toBe(false);
  });
});
