import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import {
  clearTestClient,
  expectRedirect,
  formData,
  makeCustomer,
  stockUp,
  useTestClient,
} from "@/test/actions";
import { cancelSale, confirmSale } from "./actions";
import {
  getSale,
  getSalesSummary,
  listCustomerOptions,
  listSales,
  listSellableCatalog,
  listSellableVariants,
} from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("sales actions + queries (SPEC-007)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const u = await makeUser();
    const org = await makeOrg(u.userId, "RESELLER");
    const product = await makeProduct(org.id, { name: "Tênis" });
    const v1 = await makeVariant(product.id, { size: "40", retail_price: 300 });
    const v2 = await makeVariant(product.id, { size: "41", retail_price: 320 });
    await stockUp(u.client, v1.id, 10);
    await stockUp(u.client, v2.id, 2);
    return { u, orgId: org.id, productId: product.id, v1, v2 };
  }

  beforeEach(async () => {
    ctx = await setup();
    useTestClient(ctx.u.client);
  });
  afterEach(() => clearTestClient());

  const items = (rows: { variantId: string; quantity: number; unitPrice: number }[]) =>
    JSON.stringify(rows);

  it("confirmSale: registers a multi-item sale, decrements stock, redirects", async () => {
    const customer = await makeCustomer(ctx.orgId, { name: "Cliente A" });
    const dest = await expectRedirect(
      () =>
        confirmSale(
          {},
          formData({
            customerId: customer.id,
            paymentMethod: "PIX",
            discount: 20,
            items: items([
              { variantId: ctx.v1.id, quantity: 2, unitPrice: 300 },
              { variantId: ctx.v2.id, quantity: 1, unitPrice: 320 },
            ]),
          }),
        ),
      /^\/vendas\/[0-9a-f-]{36}\?toast=sale-confirmed$/,
    );

    const id = dest.split("/")[2]!.split("?")[0]!;
    const sale = await getSale(id);
    expect(Number(sale.total)).toBe(900); // 620 + 300 - 20
    const { data } = await admin()
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", ctx.v1.id)
      .single();
    expect(data?.stock_on_hand).toBe(8);
  });

  it("confirmSale: rejects an empty cart (zod)", async () => {
    const state = await confirmSale({}, formData({ paymentMethod: "PIX", items: items([]) }));
    expect(state.error).toMatch(/ao menos um item/i);
  });

  it("confirmSale: blocks a sale above stock (RPC, atomic)", async () => {
    const state = await confirmSale(
      {},
      formData({
        paymentMethod: "DINHEIRO",
        items: items([{ variantId: ctx.v2.id, quantity: 99, unitPrice: 320 }]),
      }),
    );
    expect(state.error).toBeTruthy();
    const { data } = await admin()
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", ctx.v2.id)
      .single();
    expect(data?.stock_on_hand).toBe(2);
  });

  it("cancelSale: cancels and restores stock, redirects with toast", async () => {
    const dest = await expectRedirect(
      () =>
        confirmSale(
          {},
          formData({
            paymentMethod: "PIX",
            items: items([{ variantId: ctx.v1.id, quantity: 3, unitPrice: 300 }]),
          }),
        ),
      /sale-confirmed/,
    );
    const id = dest.split("/")[2]!.split("?")[0]!;

    await expectRedirect(
      () => cancelSale(formData({ saleId: id, reason: "cliente desistiu" })),
      new RegExp(`/vendas/${id}\\?toast=sale-cancelled`),
    );
    const { data } = await admin()
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", ctx.v1.id)
      .single();
    expect(data?.stock_on_hand).toBe(10);
  });

  it("listSales / getSalesSummary reflect confirmed sales", async () => {
    await expectRedirect(
      () =>
        confirmSale(
          {},
          formData({
            paymentMethod: "CARTAO",
            items: items([{ variantId: ctx.v1.id, quantity: 1, unitPrice: 300 }]),
          }),
        ),
      /sale-confirmed/,
    );
    const list = await listSales();
    expect(list.length).toBe(1);
    expect(list[0]?.itemCount).toBe(1);

    const summary = await getSalesSummary();
    expect(summary).toMatchObject({ count: 1, revenue: 300 });
  });

  it("listSellableVariants: only in-stock, not archived", async () => {
    const rows = await listSellableVariants();
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(ctx.v1.id);
    expect(ids).toContain(ctx.v2.id);

    const empty = await makeVariant(ctx.productId, { size: "42", retail_price: 100 });
    expect((await listSellableVariants()).map((r) => r.id)).not.toContain(empty.id);
  });

  it("listSellableCatalog: groups variants under a product with minPrice", async () => {
    const catalog = await listSellableCatalog();
    const entry = catalog.find((p) => p.id === ctx.productId);
    expect(entry?.variants.map((v) => v.id).sort()).toEqual([ctx.v1.id, ctx.v2.id].sort());
    expect(entry?.minPrice).toBe(300);
  });

  it("listCustomerOptions returns the org's customers", async () => {
    await makeCustomer(ctx.orgId, { name: "Zé" });
    expect((await listCustomerOptions()).map((c) => c.name)).toContain("Zé");
  });
});
