import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import { clearTestClient, expectRedirect, formData, setTestClient, stockUp } from "@/test/actions";
import { updateProduct } from "./actions";
import { listProducts } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("updateProduct edits the variants (VES-68)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const user = await makeUser();
    const org = await makeOrg(user.userId, "RESELLER");
    const product = await makeProduct(org.id, { name: "Vestido Midi" });
    const p = await makeVariant(product.id, {
      size: "P",
      color: "Preto",
      sku: `P-${product.id.slice(0, 6)}`,
      cost_price: 50,
      retail_price: 100,
    });
    const m = await makeVariant(product.id, { size: "M", color: "Preto", retail_price: 100 });
    await stockUp(user.client, p.id, 4);
    setTestClient(user.client);
    return { user, org, product, p, m };
  }

  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());

  const row = (v: { id: string; size: string | null; color: string | null }, over = {}) => ({
    id: v.id,
    size: v.size ?? "",
    color: v.color ?? "",
    sku: "",
    costPrice: "50",
    retailPrice: "100",
    initialStock: "0",
    ...over,
  });

  const save = (variants: unknown[], over: Record<string, unknown> = {}) =>
    updateProduct(
      {},
      formData({
        id: ctx.product.id,
        name: "Vestido Midi",
        brand: "",
        internalSku: "",
        description: "",
        categoryId: "",
        variants: JSON.stringify(variants),
        ...over,
      }),
    );

  const variants = async () =>
    (
      await admin()
        .from("product_variants")
        .select("id, size, color, sku, cost_price, retail_price, stock_on_hand, archived_at")
        .eq("product_id", ctx.product.id)
        .order("created_at")
    ).data!;

  it("changes a variant's price, colour, size and SKU — not its stock", async () => {
    await expectRedirect(
      () =>
        save([
          row(ctx.p, {
            size: "PP",
            color: "Vinho",
            sku: "VM-PP-VINHO",
            costPrice: "55.5",
            retailPrice: "129.9",
          }),
          row(ctx.m),
        ]),
      new RegExp(`/produtos/${ctx.product.id}\\?toast=product-updated`),
    );

    const [p, m] = await variants();
    expect(p).toMatchObject({
      id: ctx.p.id,
      size: "PP",
      color: "Vinho",
      sku: "VM-PP-VINHO",
      cost_price: 55.5,
      retail_price: 129.9,
      stock_on_hand: 4,
      archived_at: null,
    });
    expect(m).toMatchObject({ id: ctx.m.id, retail_price: 100, archived_at: null });

    // Stock moved only through the initial entry; the edit wrote no movement.
    const { count } = await admin()
      .from("inventory_movements")
      .select("id", { count: "exact", head: true })
      .eq("product_variant_id", ctx.p.id);
    expect(count).toBe(1);
  });

  it("adds a new variant with its initial stock as an ENTRADA movement", async () => {
    await expectRedirect(
      () =>
        save([
          row(ctx.p),
          row(ctx.m),
          {
            id: "",
            size: "G",
            color: "Preto",
            sku: "",
            costPrice: "50",
            retailPrice: "110",
            initialStock: "3",
          },
        ]),
      /product-updated/,
    );

    const all = await variants();
    expect(all).toHaveLength(3);
    const g = all.find((v) => v.size === "G")!;
    expect(g).toMatchObject({ retail_price: 110, stock_on_hand: 3, archived_at: null });
    const { data: movements } = await admin()
      .from("inventory_movements")
      .select("type, quantity, note")
      .eq("product_variant_id", g.id);
    expect(movements).toEqual([{ type: "ENTRADA", quantity: 3, note: "Estoque inicial" }]);
  });

  it("archives a variant left out of the list, keeping its row and stock", async () => {
    await expectRedirect(() => save([row(ctx.m)]), /product-updated/);

    const [p, m] = await variants();
    expect(p).toMatchObject({ id: ctx.p.id, stock_on_hand: 4 });
    expect(p!.archived_at).not.toBeNull();
    expect(m!.archived_at).toBeNull();

    // The product list stops counting it: one variant, no stock left on display.
    const listed = (await listProducts()).find((x) => x.id === ctx.product.id)!;
    expect(listed).toMatchObject({ variantCount: 1, totalStock: 0 });
  });

  it("saves nothing when a variant SKU is taken (one transaction)", async () => {
    const other = await makeProduct(ctx.org.id);
    await makeVariant(other.id, { sku: "JA-EXISTE" });

    const state = await save(
      [row(ctx.p, { retailPrice: "999" }), row(ctx.m, { sku: "JA-EXISTE" })],
      { name: "Nome que não deve ficar" },
    );
    expect(state.error).toBe("SKU de variação já utilizado");

    const [p] = await variants();
    expect(p!.retail_price).toBe(100);
    const { data: product } = await admin()
      .from("products")
      .select("name")
      .eq("id", ctx.product.id)
      .single();
    expect(product!.name).toBe("Vestido Midi");
  });

  it("returns per-field errors for an invalid price and keeps a variant (BR-CAT-03)", async () => {
    const bad = await save([row(ctx.p), row(ctx.m, { retailPrice: "-1" })]);
    expect(bad.fieldErrors).toEqual({ "variants.1.retailPrice": "Preço de venda inválido" });

    const none = await save([]);
    expect(none.error).toBe("O produto precisa de pelo menos uma variação");
    expect((await variants()).every((v) => v.archived_at === null)).toBe(true);
  });

  it("refuses a variant of another product", async () => {
    const other = await makeProduct(ctx.org.id);
    const foreign = await makeVariant(other.id, { size: "U" });

    const state = await save([row(ctx.p), row(foreign)]);
    expect(state.error).toMatch(/não pertence ao produto/);
    expect((await variants()).every((v) => v.archived_at === null)).toBe(true);
  });

  it("leaves the variants alone when the form sends none", async () => {
    await expectRedirect(
      () =>
        updateProduct(
          {},
          formData({
            id: ctx.product.id,
            name: "Só o nome",
            brand: "",
            internalSku: "",
            description: "",
            categoryId: "",
          }),
        ),
      /product-updated/,
    );
    expect((await variants()).filter((v) => v.archived_at === null)).toHaveLength(2);
  });

  it("cannot edit another organization's product", async () => {
    const stranger = await makeUser();
    await makeOrg(stranger.userId, "RESELLER");
    setTestClient(stranger.client);

    const state = await save([row(ctx.p, { retailPrice: "1" })]);
    expect(state.error).toBeTruthy();
    const [p] = await variants();
    expect(p!.retail_price).toBe(100);
  });
});
