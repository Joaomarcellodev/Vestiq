import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import {
  addMember,
  clearTestClient,
  expectRedirect,
  formData,
  makeNetwork,
  setTestClient,
} from "@/test/actions";
import {
  advanceSupplyOrder,
  cancelSupplyOrder,
  placeSupplyOrder,
  receiveSupplyOrder,
  respondSupplyOrder,
} from "./actions";
import { getOrderCatalog, getSupplyOrder, listSupplyOrders } from "./queries";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

type User = Awaited<ReturnType<typeof makeUser>>;

d("supply orders (SPEC-012)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factoryAdmin = await makeUser();
    const factory = await makeOrg(
      factoryAdmin.userId,
      "FACTORY",
      "FACTORY_ADMIN",
      "Confecção Pedido",
    );
    const reseller = await makeUser();
    const shop = await makeOrg(reseller.userId, "RESELLER", "RESELLER", "Loja Pedido");
    const net = await makeNetwork(factory.id, "Rede Pedido");
    await addMember(net.id, shop.id);

    // someone else, outside the order
    const outsider = await makeUser();
    const outsiderShop = await makeOrg(outsider.userId, "RESELLER", "RESELLER", "Loja Curiosa");
    await addMember(net.id, outsiderShop.id);
    // a factory the shop does not buy from
    const otherAdmin = await makeUser();
    const otherFactory = await makeOrg(
      otherAdmin.userId,
      "FACTORY",
      "FACTORY_ADMIN",
      "Fábrica Alheia",
    );

    const dress = await makeProduct(factory.id, {
      name: "Vestido Pedido",
      min_order_quantity: 12,
      size_grid: ["P", "M"],
    });
    const dressP = await makeVariant(dress.id, {
      color: "Preto",
      size: "P",
      sku: "VP-P",
      retail_price: 79.9,
      cost_price: 30,
    });
    const dressM = await makeVariant(dress.id, {
      color: "Preto",
      size: "M",
      sku: "VP-M",
      retail_price: 79.9,
      cost_price: 30,
    });
    const pants = await makeProduct(factory.id, { name: "Calça Pedido", min_order_quantity: 6 });
    const pants38 = await makeVariant(pants.id, { color: "Bege", size: "38", retail_price: 119.9 });
    const unpriced = await makeProduct(factory.id, { name: "Peça Sem Preço" });
    const unpricedV = await makeVariant(unpriced.id, { retail_price: 0 });
    const archived = await makeVariant(pants.id, {
      size: "40",
      retail_price: 119.9,
      archived_at: new Date().toISOString(),
    });
    const foreign = await makeVariant((await makeProduct(otherFactory.id)).id, {
      retail_price: 50,
    });

    return {
      factoryAdmin,
      factory,
      reseller,
      shop,
      outsider,
      otherAdmin,
      otherFactory,
      dress,
      dressP,
      dressM,
      pants,
      pants38,
      unpricedV,
      archived,
      foreign,
    };
  }

  const items = (list: [string, number][]) =>
    JSON.stringify(list.map(([variantId, quantity]) => ({ variantId, quantity })));

  async function place(user: User, list: [string, number][], note = "", supplierId?: string) {
    setTestClient(user.client);
    return placeSupplyOrder(
      {},
      formData({ supplierId: supplierId ?? ctx.factory.id, items: items(list), note }),
    );
  }

  async function placeOk(list: [string, number][], note = "") {
    setTestClient(ctx.reseller.client);
    const dest = await expectRedirect(
      () =>
        placeSupplyOrder({}, formData({ supplierId: ctx.factory.id, items: items(list), note })),
      /toast=supply-order-placed/,
    );
    return dest.split("/")[2]!.split("?")[0]!;
  }

  beforeAll(async () => {
    ctx = await setup();
  });
  afterEach(() => clearTestClient());

  it("lists the supplier catalog for the order form without cost or stock", async () => {
    setTestClient(ctx.reseller.client);
    const catalog = await getOrderCatalog(ctx.factory.id);
    expect(catalog.map((p) => p.name)).toEqual([
      "Calça Pedido",
      "Peça Sem Preço",
      "Vestido Pedido",
    ]);
    const dress = catalog.find((p) => p.id === ctx.dress.id)!;
    expect(dress.sizes).toEqual(["P", "M"]);
    expect(dress.variants.map((v) => v.id)).toEqual([ctx.dressP.id, ctx.dressM.id]);
    expect(JSON.stringify(catalog)).not.toMatch(/cost|stock_on_hand/);
    expect(await getOrderCatalog(ctx.otherFactory.id)).toEqual([]);
  });

  it("places an order with several products, summing repeated variants (TC-ORD-01)", async () => {
    const id = await placeOk(
      [
        [ctx.dressP.id, 4],
        [ctx.dressM.id, 6],
        [ctx.dressP.id, 2],
        [ctx.pants38.id, 6],
      ],
      "  Entregar até sexta  ",
    );
    const order = await getSupplyOrder(id);
    expect(order).toMatchObject({
      status: "PENDING",
      party: "reseller",
      supplierName: "Confecção Pedido",
      resellerName: "Loja Pedido",
      note: "Entregar até sexta",
      totalQuantity: 18,
      totalAmount: 1678.2, // 12 × 79.90 + 6 × 119.90
    });
    expect(order!.items).toEqual([
      expect.objectContaining({
        productName: "Calça Pedido",
        color: "Bege",
        size: "38",
        quantity: 6,
        unitPrice: 119.9,
        lineTotal: 719.4,
      }),
      expect.objectContaining({ productName: "Vestido Pedido", sku: "VP-P", quantity: 6 }),
      expect.objectContaining({ productName: "Vestido Pedido", sku: "VP-M", quantity: 6 }),
    ]);
  });

  it("rejects suppliers outside the networks and unavailable or unpriced items (TC-ORD-02)", async () => {
    const before = await admin()
      .from("supply_orders")
      .select("id", { count: "exact", head: true })
      .eq("reseller_id", ctx.shop.id);

    expect(await place(ctx.reseller, [[ctx.foreign.id, 12]], "", ctx.otherFactory.id)).toEqual({
      error: "Fornecedor indisponível",
    });
    expect(await place(ctx.reseller, [[ctx.foreign.id, 12]])).toEqual({
      error: "Item indisponível",
    });
    expect(await place(ctx.reseller, [[ctx.archived.id, 12]])).toEqual({
      error: "Item indisponível",
    });
    expect(await place(ctx.reseller, [[ctx.unpricedV.id, 1]])).toEqual({
      error: "Item sem preço definido: Peça Sem Preço",
    });
    expect(await place(ctx.reseller, [])).toEqual({ error: "Adicione ao menos um item" });
    expect(await place(ctx.reseller, [[ctx.dressP.id, 0]])).toEqual({
      error: "Quantidade inválida no item",
    });
    setTestClient(ctx.reseller.client);
    expect(
      await placeSupplyOrder({}, formData({ supplierId: ctx.factory.id, items: "{bad" })),
    ).toHaveProperty("error");

    const after = await admin()
      .from("supply_orders")
      .select("id", { count: "exact", head: true })
      .eq("reseller_id", ctx.shop.id);
    expect(after.count).toBe(before.count);
  });

  it("does not let a factory place orders", async () => {
    expect(await place(ctx.factoryAdmin, [[ctx.dressP.id, 12]])).toEqual({
      error: "Somente revendedoras fazem pedidos",
    });
  });

  it("enforces the minimum order per product in the database (TC-ORD-05)", async () => {
    expect(
      await place(ctx.reseller, [
        [ctx.dressP.id, 6],
        [ctx.dressM.id, 4],
        [ctx.pants38.id, 6],
      ]),
    ).toEqual({
      error: "Pedido mínimo de 12 peças para Vestido Pedido",
    });
    // straight to the RPC too, bypassing the app validation
    const { error } = await ctx.reseller.client.rpc("place_supply_order", {
      p_reseller_id: ctx.shop.id,
      p_supplier_id: ctx.factory.id,
      p_items: [{ variant_id: ctx.pants38.id, quantity: 5 }],
    });
    expect(error?.message).toBe("Pedido mínimo de 6 peças para Calça Pedido");
  });

  it("rejects malformed items sent straight to the RPC", async () => {
    for (const p_items of [
      [{ variant_id: ctx.pants38.id, quantity: 6.5 }],
      [{ variant_id: ctx.pants38.id, quantity: "6" }],
      [{ variant_id: "nope", quantity: 6 }],
      [42],
    ]) {
      const { error } = await ctx.reseller.client.rpc("place_supply_order", {
        p_reseller_id: ctx.shop.id,
        p_supplier_id: ctx.factory.id,
        p_items,
      });
      expect(error?.message).toBe("Quantidade inválida no item");
    }
  });

  it("does not let a user order on behalf of another shop", async () => {
    const { error } = await ctx.outsider.client.rpc("place_supply_order", {
      p_reseller_id: ctx.shop.id,
      p_supplier_id: ctx.factory.id,
      p_items: [{ variant_id: ctx.pants38.id, quantity: 6 }],
    });
    expect(error?.message).toBe("not authorized");
  });

  it("freezes the price on the order (TC-ORD-03)", async () => {
    const id = await placeOk([[ctx.pants38.id, 6]]);
    await admin().from("product_variants").update({ retail_price: 199.9 }).eq("id", ctx.pants38.id);
    const order = await getSupplyOrder(id);
    expect(order!.items[0]!.unitPrice).toBe(119.9);
    expect(order!.totalAmount).toBe(719.4);
    await admin().from("product_variants").update({ retail_price: 119.9 }).eq("id", ctx.pants38.id);
  });

  it("shows orders only to the two parties and blocks direct writes (TC-ORD-06)", async () => {
    const id = await placeOk([[ctx.pants38.id, 6]]);

    setTestClient(ctx.reseller.client);
    expect((await listSupplyOrders()).find((o) => o.id === id)).toMatchObject({
      party: "reseller",
      counterparty: "Confecção Pedido",
      status: "PENDING",
    });
    setTestClient(ctx.factoryAdmin.client);
    expect((await listSupplyOrders("PENDING")).find((o) => o.id === id)).toMatchObject({
      party: "supplier",
      counterparty: "Loja Pedido",
    });
    expect((await listSupplyOrders("CONFIRMED")).find((o) => o.id === id)).toBeUndefined();
    expect(await getSupplyOrder(id)).toMatchObject({ party: "supplier", canRespond: true });

    for (const stranger of [ctx.outsider, ctx.otherAdmin]) {
      setTestClient(stranger.client);
      expect(await getSupplyOrder(id)).toBeNull();
      expect((await listSupplyOrders()).find((o) => o.id === id)).toBeUndefined();
      const { data } = await stranger.client
        .from("supply_order_items")
        .select("id")
        .eq("order_id", id);
      expect(data).toEqual([]);
    }

    const insert = await ctx.reseller.client.from("supply_orders").insert({
      reseller_id: ctx.shop.id,
      supplier_id: ctx.factory.id,
      total_quantity: 1,
      total_amount: 0,
    });
    expect(insert.error).not.toBeNull();
    const update = await ctx.factoryAdmin.client
      .from("supply_orders")
      .update({ status: "CONFIRMED" })
      .eq("id", id)
      .select();
    expect(update.data ?? []).toEqual([]);
  });

  it("lets the factory confirm, and only the factory (TC-ORD-07, TC-ORD-08)", async () => {
    const id = await placeOk([[ctx.pants38.id, 6]]);

    setTestClient(ctx.reseller.client);
    expect(await respondSupplyOrder({}, formData({ orderId: id, decision: "confirm" }))).toEqual({
      error: "Você não tem permissão para esta ação",
    });

    setTestClient(ctx.factoryAdmin.client);
    await expectRedirect(
      () => respondSupplyOrder({}, formData({ orderId: id, decision: "confirm" })),
      /toast=supply-order-confirmed/,
    );
    const order = await getSupplyOrder(id);
    expect(order).toMatchObject({ status: "CONFIRMED", responseNote: null });
    expect(order!.respondedAt).not.toBeNull();
  });

  it("lets the factory reject with a reason (TC-ORD-07)", async () => {
    const id = await placeOk([[ctx.pants38.id, 6]]);
    setTestClient(ctx.factoryAdmin.client);
    await expectRedirect(
      () =>
        respondSupplyOrder(
          {},
          formData({ orderId: id, decision: "reject", note: "Sem tecido até março" }),
        ),
      /toast=supply-order-rejected/,
    );
    expect(await getSupplyOrder(id)).toMatchObject({
      status: "REJECTED",
      responseNote: "Sem tecido até março",
    });
  });

  it("lets the reseller cancel a pending order, and nothing changes afterwards (TC-ORD-09, TC-ORD-10)", async () => {
    const id = await placeOk([[ctx.pants38.id, 6]]);

    setTestClient(ctx.factoryAdmin.client);
    expect(await cancelSupplyOrder({}, formData({ orderId: id }))).toEqual({
      error: "Você não tem permissão para esta ação",
    });

    setTestClient(ctx.reseller.client);
    await expectRedirect(
      () => cancelSupplyOrder({}, formData({ orderId: id, reason: "Pedi errado" })),
      /toast=supply-order-cancelled/,
    );
    const order = await getSupplyOrder(id);
    expect(order).toMatchObject({ status: "CANCELLED", cancelReason: "Pedi errado" });
    expect(order!.cancelledAt).not.toBeNull();

    expect(await cancelSupplyOrder({}, formData({ orderId: id }))).toEqual({
      error: "Este pedido não está mais pendente",
    });
    setTestClient(ctx.factoryAdmin.client);
    expect(await respondSupplyOrder({}, formData({ orderId: id, decision: "confirm" }))).toEqual({
      error: "Este pedido não está mais pendente",
    });
  });

  it("notifies the other party on every step (TC-ORD-11)", async () => {
    const notes = async (orgId: string, link: string) => {
      const { data } = await admin()
        .from("notifications")
        .select("type, title, body")
        .eq("organization_id", orgId)
        .eq("link", link)
        .order("created_at");
      return data ?? [];
    };

    const confirmed = await placeOk([[ctx.pants38.id, 6]]);
    expect(await notes(ctx.factory.id, `/pedidos/${confirmed}`)).toEqual([
      {
        type: "SUPPLY_ORDER_PLACED",
        title: "Novo pedido de abastecimento",
        body: "Loja Pedido · 6 peças",
      },
    ]);
    setTestClient(ctx.factoryAdmin.client);
    await expectRedirect(
      () => respondSupplyOrder({}, formData({ orderId: confirmed, decision: "confirm" })),
      /toast=/,
    );
    expect(await notes(ctx.shop.id, `/pedidos/${confirmed}`)).toEqual([
      expect.objectContaining({ type: "SUPPLY_ORDER_CONFIRMED", title: "Pedido confirmado" }),
    ]);

    const rejected = await placeOk([[ctx.pants38.id, 6]]);
    setTestClient(ctx.factoryAdmin.client);
    await expectRedirect(
      () => respondSupplyOrder({}, formData({ orderId: rejected, decision: "reject" })),
      /toast=/,
    );
    expect(await notes(ctx.shop.id, `/pedidos/${rejected}`)).toEqual([
      expect.objectContaining({ type: "SUPPLY_ORDER_REJECTED" }),
    ]);

    const cancelled = await placeOk([[ctx.pants38.id, 6]]);
    await expectRedirect(() => cancelSupplyOrder({}, formData({ orderId: cancelled })), /toast=/);
    expect((await notes(ctx.factory.id, `/pedidos/${cancelled}`)).map((n) => n.type)).toEqual([
      "SUPPLY_ORDER_PLACED",
      "SUPPLY_ORDER_CANCELLED",
    ]);
  });

  // ---------------------------------------------------------------------------
  // VES-32 — fulfillment: production, shipping, delivery into the reseller's stock
  // ---------------------------------------------------------------------------
  async function confirmedOrder(list: [string, number][]) {
    const id = await placeOk(list);
    setTestClient(ctx.factoryAdmin.client);
    await expectRedirect(
      () => respondSupplyOrder({}, formData({ orderId: id, decision: "confirm" })),
      /toast=supply-order-confirmed/,
    );
    return id;
  }
  const advance = (user: User, orderId: string, stage: string, trackingCode = "") => {
    setTestClient(user.client);
    return advanceSupplyOrder({}, formData({ orderId, stage, trackingCode }));
  };
  const receive = (user: User, orderId: string) => {
    setTestClient(user.client);
    return receiveSupplyOrder({}, formData({ orderId }));
  };

  it("follows an order through production and shipping up to the reseller's stock (VES-32)", async () => {
    const id = await confirmedOrder([
      [ctx.dressP.id, 8],
      [ctx.dressM.id, 4],
    ]);

    await expectRedirect(
      () => advance(ctx.factoryAdmin, id, "IN_PRODUCTION"),
      /toast=supply-order-in-production/,
    );
    await expectRedirect(
      () => advance(ctx.factoryAdmin, id, "SHIPPED", " BR123456789BR "),
      /toast=supply-order-shipped/,
    );
    setTestClient(ctx.reseller.client);
    expect(await getSupplyOrder(id)).toMatchObject({
      status: "SHIPPED",
      trackingCode: "BR123456789BR",
    });

    await expectRedirect(() => receive(ctx.reseller, id), /toast=supply-order-received/);
    setTestClient(ctx.reseller.client);
    const order = await getSupplyOrder(id);
    expect(order).toMatchObject({ status: "DELIVERED" });
    expect(order!.productionStartedAt).not.toBeNull();
    expect(order!.shippedAt).not.toBeNull();
    expect(order!.deliveredAt).not.toBeNull();

    // the pieces entered the shop's own catalog, one ENTRADA per item tied to the order
    const { data: variants } = await admin()
      .from("product_variants")
      .select("id, size, color, stock_on_hand, cost_price, products!inner(name, organization_id)")
      .eq("organization_id", ctx.shop.id)
      .eq("products.name", "Vestido Pedido")
      .order("size");
    expect(variants?.map((v) => [v.size, v.color, v.stock_on_hand, Number(v.cost_price)])).toEqual([
      ["M", "Preto", 4, 79.9],
      ["P", "Preto", 8, 79.9],
    ]);
    const { data: moves } = await admin()
      .from("inventory_movements")
      .select("type, quantity, reference_type, organization_id")
      .eq("reference_id", id);
    expect(moves).toHaveLength(2);
    for (const m of moves ?? []) {
      expect(m).toMatchObject({
        type: "ENTRADA",
        reference_type: "supply_order",
        organization_id: ctx.shop.id,
      });
    }

    // a second order for the same pieces adds to the same variants
    const again = await confirmedOrder([[ctx.dressP.id, 12]]);
    await expectRedirect(() => advance(ctx.factoryAdmin, again, "SHIPPED"), /toast=/);
    await expectRedirect(() => receive(ctx.reseller, again), /toast=/);
    const { data: p } = await admin()
      .from("product_variants")
      .select("stock_on_hand, products!inner(name)")
      .eq("organization_id", ctx.shop.id)
      .eq("products.name", "Vestido Pedido")
      .eq("size", "P");
    expect(p?.map((v) => v.stock_on_hand)).toEqual([20]);
  });

  it("guards who moves the order and in what order (VES-32)", async () => {
    const id = await confirmedOrder([[ctx.pants38.id, 6]]);

    // only the factory advances, only the reseller receives
    expect(await advance(ctx.reseller, id, "SHIPPED")).toEqual({
      error: "Você não tem permissão para esta ação",
    });
    expect(await advance(ctx.otherAdmin, id, "SHIPPED")).toEqual({
      error: "Você não tem permissão para esta ação",
    });
    expect(await receive(ctx.outsider, id)).toEqual({
      error: "Você não tem permissão para esta ação",
    });
    // nothing to receive before it ships
    expect(await receive(ctx.reseller, id)).toEqual({
      error: "Só um pedido enviado pode ser marcado como recebido",
    });
    expect(await advance(ctx.factoryAdmin, id, "DELIVERED")).toEqual({
      error: expect.any(String),
    });

    await expectRedirect(() => advance(ctx.factoryAdmin, id, "SHIPPED"), /toast=/);
    expect(await advance(ctx.factoryAdmin, id, "IN_PRODUCTION")).toEqual({
      error: "Só um pedido confirmado entra em produção",
    });
    expect(await receive(ctx.factoryAdmin, id)).toEqual({
      error: "Você não tem permissão para esta ação",
    });
    await expectRedirect(() => receive(ctx.reseller, id), /toast=/);
    expect(await receive(ctx.reseller, id)).toEqual({
      error: "Só um pedido enviado pode ser marcado como recebido",
    });

    // a pending order can't skip confirmation
    const pending = await placeOk([[ctx.pants38.id, 6]]);
    expect(await advance(ctx.factoryAdmin, pending, "SHIPPED")).toEqual({
      error: "Só um pedido confirmado ou em produção pode ser enviado",
    });
  });

  it("notifies each fulfillment stage to the other side (VES-32)", async () => {
    const id = await confirmedOrder([[ctx.pants38.id, 6]]);
    await expectRedirect(() => advance(ctx.factoryAdmin, id, "IN_PRODUCTION"), /toast=/);
    await expectRedirect(() => advance(ctx.factoryAdmin, id, "SHIPPED", "BR1"), /toast=/);
    await expectRedirect(() => receive(ctx.reseller, id), /toast=/);

    const notes = async (orgId: string) => {
      const { data } = await admin()
        .from("notifications")
        .select("type, body")
        .eq("organization_id", orgId)
        .eq("link", `/pedidos/${id}`)
        .order("created_at");
      return data ?? [];
    };
    expect(await notes(ctx.shop.id)).toEqual([
      expect.objectContaining({ type: "SUPPLY_ORDER_CONFIRMED" }),
      {
        type: "SUPPLY_ORDER_IN_PRODUCTION",
        body: "Confecção Pedido começou a produzir seu pedido de 6 peças",
      },
      {
        type: "SUPPLY_ORDER_SHIPPED",
        body: "Confecção Pedido enviou seu pedido de 6 peças · rastreio BR1",
      },
    ]);
    expect((await notes(ctx.factory.id)).map((n) => n.type)).toEqual([
      "SUPPLY_ORDER_PLACED",
      "SUPPLY_ORDER_DELIVERED",
    ]);
  });

  it("filters the order list by the new stages (VES-32)", async () => {
    const id = await confirmedOrder([[ctx.pants38.id, 6]]);
    await expectRedirect(() => advance(ctx.factoryAdmin, id, "IN_PRODUCTION"), /toast=/);
    setTestClient(ctx.factoryAdmin.client);
    const inProduction = await listSupplyOrders("IN_PRODUCTION");
    expect(inProduction.map((o) => o.id)).toContain(id);
    expect(inProduction.every((o) => o.status === "IN_PRODUCTION")).toBe(true);
  });
});
