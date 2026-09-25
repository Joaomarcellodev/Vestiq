import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import {
  addMember,
  clearTestClient,
  makeCategory,
  makeNetwork,
  setTestClient,
} from "@/test/actions";
import { getSupplier, getSupplierProduct, listSuppliers, searchSupplierProducts } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

async function makeFactory(name: string) {
  const user = await makeUser();
  const org = await makeOrg(user.userId, "FACTORY", "FACTORY_ADMIN", name);
  return { user, org };
}

d("supplier search (SPEC-011)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const reseller = await makeUser();
    const resellerOrg = await makeOrg(reseller.userId, "RESELLER", "RESELLER", "Loja Busca");

    // Two suppliers the reseller buys from.
    const aurora = await makeFactory("Confecção Aurora");
    const auroraNet = await makeNetwork(aurora.org.id, "Rede Aurora");
    await addMember(auroraNet.id, resellerOrg.id);

    const sul = await makeFactory("Malharia Sul");
    const sulNet = await makeNetwork(sul.org.id, "Rede Sul");
    await addMember(sulNet.id, resellerOrg.id);

    // Suppliers the reseller must NOT see.
    const stranger = await makeFactory("Fábrica Estranha");
    await makeNetwork(stranger.org.id, "Rede Estranha");
    const pending = await makeFactory("Fábrica Convite");
    await addMember((await makeNetwork(pending.org.id)).id, resellerOrg.id, "INVITED");
    const disabled = await makeFactory("Fábrica Desativada");
    await addMember((await makeNetwork(disabled.org.id)).id, resellerOrg.id, "DISABLED");

    const dresses = await makeCategory(aurora.org.id, "Vestidos");
    const dress = await makeProduct(aurora.org.id, {
      name: "Vestido Midi",
      brand: "Aurora",
      category_id: dresses.id,
      min_order_quantity: 12,
      size_grid: ["P", "M", "G"],
      image_urls: ["https://example.test/vestido.jpg"],
    });
    await makeVariant(dress.id, {
      color: "Preto",
      size: "G",
      sku: "VM-PT-G",
      retail_price: 89.9,
      cost_price: 31.5,
      stock_on_hand: 0,
    });
    await makeVariant(dress.id, {
      color: "Preto",
      size: "P",
      sku: "VM-PT-P",
      retail_price: 79.9,
      cost_price: 30,
      stock_on_hand: 40,
    });
    await makeVariant(dress.id, {
      color: "Azul",
      size: "M",
      retail_price: 999,
      archived_at: new Date().toISOString(),
    });

    const pants = await makeProduct(aurora.org.id, { name: "Calça Wide" });
    await makeVariant(pants.id, { color: "Bege", retail_price: 120, stock_on_hand: 0 });

    const archived = await makeProduct(aurora.org.id, {
      name: "Vestido Antigo",
      archived_at: new Date().toISOString(),
    });
    await makeVariant(archived.id, { color: "Preto" });

    const shirt = await makeProduct(sul.org.id, { name: "Camisa de Línho 100% algodão" });
    await makeVariant(shirt.id, { retail_price: 150 });

    const secret = await makeProduct(stranger.org.id, { name: "Vestido Secreto" });
    await makeVariant(secret.id, { color: "Preto" });
    const pendingProduct = await makeProduct(pending.org.id, { name: "Vestido Pendente" });
    const disabledProduct = await makeProduct(disabled.org.id, { name: "Vestido Desativado" });

    return {
      reseller,
      aurora,
      sul,
      stranger,
      dress,
      pants,
      archived,
      shirt,
      secret,
      pendingProduct,
      disabledProduct,
    };
  }

  beforeAll(async () => {
    ctx = await setup();
  });
  beforeEach(() => setTestClient(ctx.reseller.client));
  afterEach(() => clearTestClient());

  it("lists the suppliers of the reseller's active networks (TC-SUP-01)", async () => {
    const suppliers = await listSuppliers();
    expect(suppliers.map((s) => s.name)).toEqual(["Confecção Aurora", "Malharia Sul"]);
    const aurora = suppliers.find((s) => s.id === ctx.aurora.org.id)!;
    expect(aurora.networkNames).toEqual(["Rede Aurora"]);
    expect(aurora.productCount).toBe(2); // the archived product is not counted
  });

  it("hides factories outside the networks, pending invites and disabled memberships (TC-SUP-02)", async () => {
    const names = (await listSuppliers()).map((s) => s.name);
    expect(names).not.toContain("Fábrica Estranha");
    expect(names).not.toContain("Fábrica Convite");
    expect(names).not.toContain("Fábrica Desativada");

    const products = (await searchSupplierProducts("vestido")).map((p) => p.name);
    expect(products).not.toContain("Vestido Secreto");
    expect(products).not.toContain("Vestido Pendente");
    expect(products).not.toContain("Vestido Desativado");
  });

  it("searches suppliers by name, ignoring case and accents (TC-SUP-03)", async () => {
    expect((await listSuppliers("AURORA")).map((s) => s.name)).toEqual(["Confecção Aurora"]);
    expect((await listSuppliers("confeccao")).map((s) => s.name)).toEqual(["Confecção Aurora"]);
    expect(await listSuppliers("inexistente")).toEqual([]);
  });

  it("requires every word of the query, including variant colours (TC-SUP-04)", async () => {
    const results = await searchSupplierProducts("vestido preto");
    expect(results.map((p) => p.name)).toEqual(["Vestido Midi"]);
    const [dress] = results;
    expect(dress).toMatchObject({
      supplierId: ctx.aurora.org.id,
      supplierName: "Confecção Aurora",
      brand: "Aurora",
      categoryName: "Vestidos",
      imageUrl: "https://example.test/vestido.jpg",
      minOrderQuantity: 12,
      sizeGrid: ["P", "M", "G"],
      minPrice: 79.9,
      maxPrice: 89.9, // the archived 999 variant is ignored (TC-SUP-06)
      variantCount: 2,
      inStock: true,
    });

    expect((await searchSupplierProducts("vestido azul")).map((p) => p.name)).toEqual([]);
    expect((await searchSupplierProducts("vm-pt-p")).map((p) => p.name)).toEqual(["Vestido Midi"]);
    expect((await searchSupplierProducts("vestidos")).map((p) => p.name)).toEqual(["Vestido Midi"]);
    expect((await searchSupplierProducts("sul")).map((p) => p.name)).toEqual([
      "Camisa de Línho 100% algodão",
    ]);
  });

  it("ignores case and accents and keeps wildcards literal (TC-SUP-05)", async () => {
    expect((await searchSupplierProducts("CAMISA LINHO")).map((p) => p.name)).toEqual([
      "Camisa de Línho 100% algodão",
    ]);
    expect((await searchSupplierProducts("100%")).map((p) => p.name)).toEqual([
      "Camisa de Línho 100% algodão",
    ]);
    expect(await searchSupplierProducts("%")).toHaveLength(1);
    expect(await searchSupplierProducts("_")).toEqual([]);
  });

  it("leaves archived products out (TC-SUP-06)", async () => {
    const names = (await searchSupplierProducts()).map((p) => p.name);
    expect(names).toEqual(["Calça Wide", "Camisa de Línho 100% algodão", "Vestido Midi"]);
    expect(names).not.toContain("Vestido Antigo");
    const pants = (await searchSupplierProducts("calca")).find((p) => p.id === ctx.pants.id)!;
    expect(pants.inStock).toBe(false);
  });

  it("filters by supplier and resolves only visible suppliers (TC-SUP-07)", async () => {
    const auroraOnly = await searchSupplierProducts(undefined, ctx.aurora.org.id);
    expect(auroraOnly.map((p) => p.name)).toEqual(["Calça Wide", "Vestido Midi"]);
    expect(await searchSupplierProducts(undefined, ctx.stranger.org.id)).toEqual([]);
    expect(await searchSupplierProducts(undefined, "not-a-uuid")).toEqual([]);

    expect((await getSupplier(ctx.sul.org.id))?.name).toBe("Malharia Sul");
    expect(await getSupplier(ctx.stranger.org.id)).toBeNull();
    expect(await getSupplier("not-a-uuid")).toBeNull();
  });

  it("returns the product detail with variants ordered by the size grid (TC-SUP-08)", async () => {
    const product = await getSupplierProduct(ctx.dress.id);
    expect(product).toMatchObject({
      name: "Vestido Midi",
      supplierName: "Confecção Aurora",
      categoryName: "Vestidos",
      minOrderQuantity: 12,
      sizeGrid: ["P", "M", "G"],
      imageUrls: ["https://example.test/vestido.jpg"],
    });
    expect(product!.variants).toEqual([
      expect.objectContaining({
        size: "P",
        color: "Preto",
        sku: "VM-PT-P",
        price: 79.9,
        inStock: true,
      }),
      expect.objectContaining({
        size: "G",
        color: "Preto",
        sku: "VM-PT-G",
        price: 89.9,
        inStock: false,
      }),
    ]);
  });

  it("returns null for products outside the networks or archived (TC-SUP-09)", async () => {
    expect(await getSupplierProduct(ctx.secret.id)).toBeNull();
    expect(await getSupplierProduct(ctx.pendingProduct.id)).toBeNull();
    expect(await getSupplierProduct(ctx.archived.id)).toBeNull();
    expect(await getSupplierProduct("not-a-uuid")).toBeNull();
  });

  it("never exposes cost or stock quantity and keeps direct reads blocked (TC-SUP-10)", async () => {
    const client = ctx.reseller.client;
    const calls = await Promise.all([
      client.rpc("search_supplier_products", {}),
      client.rpc("get_supplier_product", { p_product_id: ctx.dress.id }),
      client.rpc("list_supplier_product_variants", { p_product_id: ctx.dress.id }),
      client.rpc("list_suppliers", {}),
    ]);
    for (const { data, error } of calls) {
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
      for (const row of data!) {
        expect(Object.keys(row)).not.toContain("cost_price");
        expect(Object.keys(row)).not.toContain("stock_on_hand");
      }
    }

    const products = await client.from("products").select("id").eq("id", ctx.dress.id);
    expect(products.data).toEqual([]);
    const variants = await client
      .from("product_variants")
      .select("id, cost_price")
      .eq("product_id", ctx.dress.id);
    expect(variants.data).toEqual([]);
  });

  it("denies anonymous callers", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const { SUPABASE_URL, PUBLISHABLE_KEY } = await import("@/test/supabase");
    const anon = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "vestiq-anon" },
    });
    const { error } = await anon.rpc("search_supplier_products", {});
    expect(error?.code).toBe("42501");
  });

  it("gives a factory admin no suppliers of their own", async () => {
    setTestClient(ctx.aurora.user.client);
    expect(await listSuppliers()).toEqual([]);
    expect(await searchSupplierProducts()).toEqual([]);
    // sanity: the admin API still sees the factory's catalog
    const { count } = await admin()
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.aurora.org.id);
    expect(count).toBe(3);
  });
});
