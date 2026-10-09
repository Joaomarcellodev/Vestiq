import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import {
  clearTestClient,
  expectRedirect,
  formData,
  makeCategory,
  pngFile,
  textFile,
  setTestClient,
} from "@/test/actions";
import {
  archiveProduct,
  createCategory,
  createProduct,
  renameCategory,
  setCategoryArchived,
  unarchiveProduct,
  updateProduct,
} from "./actions";
import { getProduct, listCategories, listCategoriesForManagement, listProducts } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("catalog actions + queries (SPEC-004)", () => {
  let user: Awaited<ReturnType<typeof makeUser>>;
  let orgId: string;

  beforeEach(async () => {
    user = await makeUser();
    const org = await makeOrg(user.userId, "RESELLER");
    orgId = org.id;
    setTestClient(user.client);
  });
  afterEach(() => clearTestClient());

  const variantsJSON = (rows: Record<string, unknown>[] = []) => JSON.stringify(rows);

  // The real forms always submit every text field (empty string when blank);
  // mirror that so zod's `.or(z.literal(""))` branches are exercised, not null.
  const pForm = (over: Record<string, unknown>) =>
    formData({ brand: "", internalSku: "", description: "", categoryId: "", ...over });

  it("createProduct: creates product + variant + initial stock, then redirects", async () => {
    const dest = await expectRedirect(
      () =>
        createProduct(
          {},
          pForm({
            name: "Jaqueta de Couro",
            brand: "Vintage",
            variants: variantsJSON([
              {
                size: "M",
                color: "Preto",
                sku: "",
                costPrice: 100,
                retailPrice: 250,
                initialStock: 5,
              },
            ]),
          }),
        ),
      /^\/produtos\/[0-9a-f-]{36}\?toast=product-created$/,
    );

    const id = dest.split("/")[2]!.split("?")[0]!;
    const { data } = await admin()
      .from("products")
      .select("name, organization_id, product_variants(size, stock_on_hand, retail_price)")
      .eq("id", id)
      .single();
    expect(data?.name).toBe("Jaqueta de Couro");
    expect(data?.organization_id).toBe(orgId);
    expect(data?.product_variants).toHaveLength(1);
    expect(data?.product_variants[0]?.stock_on_hand).toBe(5);
  });

  it("createProduct: falls back to a single 'Único' variant when none given", async () => {
    const dest = await expectRedirect(
      () => createProduct({}, pForm({ name: "Sem variante", variants: variantsJSON() })),
      /toast=product-created/,
    );
    const id = dest.split("/")[2]!.split("?")[0]!;
    const { data } = await admin().from("product_variants").select("size").eq("product_id", id);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.size).toBe("Único");
  });

  it("createProduct: rejects invalid input (zod)", async () => {
    const state = await createProduct({}, pForm({ name: "", variants: variantsJSON() }));
    expect(state.error).toMatch(/nome/i);
  });

  it("createProduct: uploads photos and stores their public URLs", async () => {
    const dest = await expectRedirect(
      () =>
        createProduct(
          {},
          pForm({
            name: "Com foto",
            variants: variantsJSON(),
            images: [pngFile("a.png"), pngFile("b.png")],
          }),
        ),
      /toast=product-created/,
    );
    const id = dest.split("/")[2]!.split("?")[0]!;
    const { data } = await admin().from("products").select("image_urls").eq("id", id).single();
    expect(data?.image_urls).toHaveLength(2);
    expect(data?.image_urls[0]).toMatch(
      new RegExp(`/storage/v1/object/public/product-images/${orgId}/${id}/`),
    );
  });

  it("createProduct: rejects a non-image upload and rolls the product back", async () => {
    const state = await createProduct(
      {},
      pForm({ name: "Rollback", variants: variantsJSON(), images: [textFile()] }),
    );
    expect(state.error).toMatch(/JPG, PNG ou WebP/i);
    const { data } = await admin().from("products").select("id").eq("name", "Rollback");
    expect(data).toHaveLength(0);
  });

  it("createProduct: surfaces a duplicate SKU", async () => {
    await makeProduct(orgId, { internal_sku: "DUP-1" });
    const state = await createProduct(
      {},
      pForm({ name: "Outro", internalSku: "DUP-1", variants: variantsJSON() }),
    );
    expect(state.error).toMatch(/SKU já utilizado/i);
  });

  it("updateProduct: edits fields and keeps / drops existing images", async () => {
    const product = await makeProduct(orgId, {
      name: "Antigo",
      image_urls: ["https://x/1.png", "https://x/2.png"],
    });
    await expectRedirect(
      () =>
        updateProduct(
          {},
          pForm({
            id: product.id,
            name: "Novo nome",
            existingImages: JSON.stringify(["https://x/1.png"]),
          }),
        ),
      new RegExp(`/produtos/${product.id}\\?toast=product-updated`),
    );
    const { data } = await admin()
      .from("products")
      .select("name, image_urls")
      .eq("id", product.id)
      .single();
    expect(data?.name).toBe("Novo nome");
    expect(data?.image_urls).toEqual(["https://x/1.png"]);
  });

  it("updateProduct: reorders the cover, ignores foreign URLs, deletes removed photos (TC-PROD-21)", async () => {
    const product = await makeProduct(orgId, { name: "Com fotos" });
    await expectRedirect(
      () =>
        updateProduct(
          {},
          pForm({
            id: product.id,
            name: "Com fotos",
            images: [pngFile("a.png"), pngFile("b.png")],
          }),
        ),
      /product-updated/,
    );
    const uploaded = (
      await admin().from("products").select("image_urls").eq("id", product.id).single()
    ).data!.image_urls;
    expect(uploaded).toHaveLength(2);
    const [first, second] = uploaded as [string, string];
    const folder = `${orgId}/${product.id}`;
    const files = async () =>
      ((await admin().storage.from("product-images").list(folder)).data ?? []).length;
    expect(await files()).toBe(2);

    // Second photo becomes the cover, the first one is removed, and a URL the
    // product never had is dropped.
    await expectRedirect(
      () =>
        updateProduct(
          {},
          pForm({
            id: product.id,
            name: "Com fotos",
            existingImages: JSON.stringify([second, "https://evil.example/x.png"]),
          }),
        ),
      /product-updated/,
    );
    const { data } = await admin()
      .from("products")
      .select("image_urls")
      .eq("id", product.id)
      .single();
    expect(data?.image_urls).toEqual([second]);
    expect(await files()).toBe(1);
    expect(first).not.toBe(second);
  });

  it("archiveProduct / unarchiveProduct toggle archived_at on product + variants", async () => {
    const product = await makeProduct(orgId);
    await makeVariant(product.id);

    await expectRedirect(
      () => archiveProduct(formData({ id: product.id })),
      /toast=product-archived/,
    );
    let { data } = await admin()
      .from("products")
      .select("archived_at, product_variants(archived_at)")
      .eq("id", product.id)
      .single();
    expect(data?.archived_at).not.toBeNull();
    expect(data?.product_variants[0]?.archived_at).not.toBeNull();

    await expectRedirect(
      () => unarchiveProduct(formData({ id: product.id })),
      /toast=product-unarchived/,
    );
    ({ data } = await admin()
      .from("products")
      .select("archived_at, product_variants(archived_at)")
      .eq("id", product.id)
      .single());
    expect(data?.archived_at).toBeNull();
    expect(data?.product_variants[0]?.archived_at).toBeNull();
  });

  it("createCategory: ok + duplicate name", async () => {
    const ok = await createCategory({}, formData({ name: "Bolsas" }));
    expect(ok).toMatchObject({ ok: true, category: { name: "Bolsas" } });
    const dup = await createCategory({}, formData({ name: "Bolsas" }));
    expect(dup.error).toMatch(/já existe/i);
  });

  it("listProducts: search + scope + thumbnail", async () => {
    const p1 = await makeProduct(orgId, { name: "Camisa Azul", image_urls: ["https://x/c.png"] });
    await makeVariant(p1.id, { retail_price: 80 });
    const p2 = await makeProduct(orgId, { name: "Calça Preta" });
    await admin()
      .from("products")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", p2.id);

    const active = await listProducts();
    expect(active.map((p) => p.name)).toContain("Camisa Azul");
    expect(active.find((p) => p.id === p1.id)?.imageUrl).toBe("https://x/c.png");
    expect(active.find((p) => p.id === p1.id)?.minPrice).toBe(80);

    const searched = await listProducts("azul");
    expect(searched.every((p) => /azul/i.test(p.name))).toBe(true);

    const archived = await listProducts(undefined, "archived");
    expect(archived.map((p) => p.id)).toContain(p2.id);
    expect(archived.map((p) => p.id)).not.toContain(p1.id);
  });

  it("getProduct + listCategories", async () => {
    const cat = await makeCategory(orgId, "Acessórios");
    const product = await makeProduct(orgId, { name: "Cinto", category_id: cat.id });
    const fetched = await getProduct(product.id);
    expect(fetched.name).toBe("Cinto");
    expect(fetched.categories?.name).toBe("Acessórios");

    const cats = await listCategories();
    expect(cats.map((c) => c.name)).toContain("Acessórios");
  });

  it("renameCategory: renames, refuses a duplicate name (TC-PROD-15)", async () => {
    const bags = await makeCategory(orgId, "Bolsas");
    await makeCategory(orgId, "Calçados");

    expect(await renameCategory({}, formData({ id: bags.id, name: "Bolsas e carteiras" }))).toEqual(
      { ok: true },
    );
    expect((await listCategories()).map((c) => c.name)).toContain("Bolsas e carteiras");

    expect(await renameCategory({}, formData({ id: bags.id, name: "Calçados" }))).toEqual({
      error: "Já existe uma categoria com esse nome",
    });
    expect(await renameCategory({}, formData({ id: bags.id, name: "  " }))).toEqual({
      error: "Informe o nome da categoria",
    });
  });

  it("setCategoryArchived: hides it from the picker, keeps the products (TC-PROD-16)", async () => {
    const cat = await makeCategory(orgId, "Verão");
    const product = await makeProduct(orgId, { name: "Biquíni", category_id: cat.id });

    expect(await setCategoryArchived({}, formData({ id: cat.id, archived: "true" }))).toEqual({
      ok: true,
    });
    expect((await listCategories()).map((c) => c.id)).not.toContain(cat.id);
    expect(await listCategoriesForManagement()).toContainEqual({
      id: cat.id,
      name: "Verão",
      archived: true,
      productCount: 1,
    });
    expect((await getProduct(product.id)).category_id).toBe(cat.id);

    await setCategoryArchived({}, formData({ id: cat.id, archived: "false" }));
    expect((await listCategories()).map((c) => c.id)).toContain(cat.id);
  });

  it("listProducts: filters by category with search and scope (TC-PROD-17)", async () => {
    const bags = await makeCategory(orgId, "Bolsas");
    const shoes = await makeCategory(orgId, "Calçados");
    const bag = await makeProduct(orgId, { name: "Bolsa Azul", category_id: bags.id });
    const oldBag = await makeProduct(orgId, {
      name: "Bolsa Velha",
      category_id: bags.id,
      archived_at: new Date().toISOString(),
    });
    await makeProduct(orgId, { name: "Tênis Azul", category_id: shoes.id });

    expect((await listProducts(undefined, "active", bags.id)).map((p) => p.id)).toEqual([bag.id]);
    expect((await listProducts("azul", "active", bags.id)).map((p) => p.id)).toEqual([bag.id]);
    expect((await listProducts(undefined, "archived", bags.id)).map((p) => p.id)).toEqual([
      oldBag.id,
    ]);
  });

  it("category actions can't touch another organization's categories (TC-PROD-10)", async () => {
    const other = await makeUser();
    const otherOrg = await makeOrg(other.userId, "RESELLER");
    const foreign = await makeCategory(otherOrg.id, "Alheia");

    expect(await renameCategory({}, formData({ id: foreign.id, name: "Minha" }))).toEqual({
      error: "Categoria não encontrada",
    });
    expect(await setCategoryArchived({}, formData({ id: foreign.id, archived: "true" }))).toEqual({
      error: "Categoria não encontrada",
    });
    const { data } = await admin()
      .from("categories")
      .select("name, archived_at")
      .eq("id", foreign.id)
      .single();
    expect(data).toEqual({ name: "Alheia", archived_at: null });
  });
});
