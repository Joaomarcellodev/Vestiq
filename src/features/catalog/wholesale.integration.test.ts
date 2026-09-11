import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, supabaseUp } from "@/test/supabase";
import { clearTestClient, expectRedirect, formData, setTestClient } from "@/test/actions";
import { createProduct, updateProduct } from "./actions";
import { getProduct, listProducts } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

const pForm = (over: Record<string, unknown>) =>
  formData({
    brand: "",
    internalSku: "",
    description: "",
    categoryId: "",
    variants: "[]",
    ...over,
  });
const idFrom = (dest: string) => dest.split("/")[2]!.split("?")[0]!;

d("wholesale conditions (SPEC-004 RF-PROD-007)", () => {
  afterEach(() => clearTestClient());

  describe("as a factory", () => {
    let factoryOrgId: string;

    beforeEach(async () => {
      const user = await makeUser();
      const org = await makeOrg(user.userId, "FACTORY", "FACTORY_ADMIN");
      factoryOrgId = org.id;
      setTestClient(user.client);
    });

    it("createProduct stores the minimum order and the normalised grid (TC-PROD-11)", async () => {
      const dest = await expectRedirect(
        () =>
          createProduct(
            {},
            pForm({
              name: "Vestido Midi",
              minOrderQuantity: "12",
              sizeGrid: " P, M, m ,G, GG ",
              variants: JSON.stringify([{ size: "P", retailPrice: 80 }]),
            }),
          ),
        /toast=product-created/,
      );
      const product = await getProduct(idFrom(dest));
      expect(product.min_order_quantity).toBe(12);
      expect(product.size_grid).toEqual(["P", "M", "G", "GG"]);
    });

    it("createProduct creates one variant per grid size when none is given (TC-PROD-12)", async () => {
      const dest = await expectRedirect(
        () =>
          createProduct(
            {},
            pForm({ name: "Calça Wide", minOrderQuantity: "6", sizeGrid: "36, 38, 40" }),
          ),
        /toast=product-created/,
      );
      const { data } = await admin()
        .from("product_variants")
        .select("size")
        .eq("product_id", idFrom(dest));
      expect((data ?? []).map((v) => v.size).sort()).toEqual(["36", "38", "40"]);
    });

    it("createProduct rejects a minimum order below one piece", async () => {
      const state = await createProduct({}, pForm({ name: "Sem mínimo", minOrderQuantity: "0" }));
      expect(state.error).toMatch(/pelo menos 1 peça/i);
    });

    it("updateProduct changes the conditions (TC-PROD-11)", async () => {
      const product = await makeProduct(factoryOrgId, { name: "Blusa" });
      await expectRedirect(
        () =>
          updateProduct(
            {},
            pForm({ id: product.id, name: "Blusa", minOrderQuantity: "24", sizeGrid: "PP, P, M" }),
          ),
        new RegExp(`/produtos/${product.id}\\?toast=product-updated`),
      );
      const fetched = await getProduct(product.id);
      expect(fetched.min_order_quantity).toBe(24);
      expect(fetched.size_grid).toEqual(["PP", "P", "M"]);
    });

    it("listProducts exposes the conditions", async () => {
      await makeProduct(factoryOrgId, {
        name: "Saia",
        min_order_quantity: 10,
        size_grid: ["P", "M"],
      });
      const row = (await listProducts()).find((p) => p.name === "Saia");
      expect(row).toMatchObject({ minOrderQuantity: 10, sizeGrid: ["P", "M"] });
    });
  });

  describe("as a reseller (BR-CAT-13)", () => {
    it("createProduct ignores wholesale fields posted by a reseller (TC-PROD-13)", async () => {
      const user = await makeUser();
      await makeOrg(user.userId, "RESELLER");
      setTestClient(user.client);
      const dest = await expectRedirect(
        () => createProduct({}, pForm({ name: "Peça", minOrderQuantity: "50", sizeGrid: "P, M" })),
        /toast=product-created/,
      );
      const product = await getProduct(idFrom(dest));
      expect(product.min_order_quantity).toBe(1);
      expect(product.size_grid).toEqual([]);
    });

    it("the database refuses wholesale conditions on a reseller product (TC-PROD-14)", async () => {
      const user = await makeUser();
      const org = await makeOrg(user.userId, "RESELLER");
      const product = await makeProduct(org.id);
      const { error } = await user.client
        .from("products")
        .update({ min_order_quantity: 10, size_grid: ["P"] })
        .eq("id", product.id);
      expect(error?.message).toMatch(/somente a fábrica/i);
    });
  });

  it("the database rejects a blank size in the grid", async () => {
    const user = await makeUser();
    const org = await makeOrg(user.userId, "FACTORY", "FACTORY_ADMIN");
    const { error } = await admin()
      .from("products")
      .insert({ organization_id: org.id, name: "Grade vazia", size_grid: ["P", ""] });
    expect(error).not.toBeNull();
  });
});
