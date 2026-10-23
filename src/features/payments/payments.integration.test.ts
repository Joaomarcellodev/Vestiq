import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { NextRequest } from "next/server";
import { admin, makeOrg, makeProduct, makeUser, makeVariant, supabaseUp } from "@/test/supabase";
import {
  addMember,
  clearTestClient,
  expectRedirect,
  formData,
  makeNetwork,
  setTestClient,
} from "@/test/actions";
import type { Checkout } from "./provider/stripe";

// Stripe's API is faked; signature checking (`parseWebhook`) stays real.
const stripeApi = vi.hoisted(() => ({
  configured: true,
  sessions: new Map<string, Checkout>(),
  created: [] as { orderId: string; amount: number; successUrl: string; cancelUrl: string }[],
  expired: [] as string[],
  refunds: [] as { paymentIntentId: string; idempotencyKey: string }[],
  refundFails: false,
  /** Refunded total per payment intent, as Stripe's charge reports it. */
  refunded: new Map<string, number>(),
  amounts: new Map<string, number>(),
}));

vi.mock("./provider/stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./provider/stripe")>();
  return {
    ...actual,
    paymentsConfigured: () => stripeApi.configured,
    createCheckout: async (input: {
      orderId: string;
      amount: number;
      successUrl: string;
      cancelUrl: string;
    }) => {
      const id = `cs_test_${crypto.randomUUID().replace(/-/g, "")}`;
      const checkout = {
        id,
        url: `https://checkout.stripe.com/c/pay/${id}`,
        orderId: input.orderId,
        outcome: null,
        amount: input.amount,
        paymentIntentId: null,
      };
      stripeApi.sessions.set(id, checkout);
      stripeApi.created.push(input);
      return checkout;
    },
    getCheckout: async (id: string) => {
      const checkout = stripeApi.sessions.get(id);
      if (!checkout) throw new Error(`No such checkout.session: ${id}`);
      return checkout;
    },
    expireCheckout: async (id: string) => {
      stripeApi.expired.push(id);
    },
    refundPayment: async (input: {
      paymentIntentId: string;
      orderId: string;
      idempotencyKey: string;
    }) => {
      if (stripeApi.refundFails) throw new Error("Stripe is down");
      stripeApi.refunds.push(input);
      // a full refund of what is left, like refunds.create without `amount`
      const total = stripeApi.amounts.get(input.paymentIntentId) ?? 0;
      stripeApi.refunded.set(input.paymentIntentId, total);
      return { paymentIntentId: input.paymentIntentId, amountRefunded: total };
    },
  };
});

const { payOrderWithCard, refundSupplyOrderPayment } = await import("./actions");
const { getSupplyOrderPayment } = await import("./queries");
const { syncCheckout } = await import("./sync");
const { POST: webhook } = await import("@/app/api/payments/webhook/route");

const up = await supabaseUp();
const d = up ? describe : describe.skip;

const WEBHOOK_SECRET = "whsec_vestiq_integration_test";

type User = Awaited<ReturnType<typeof makeUser>>;

d("supply order payments (SPEC-014)", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const factoryAdmin = await makeUser();
    const factory = await makeOrg(factoryAdmin.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica Paga");
    const reseller = await makeUser();
    const shop = await makeOrg(reseller.userId, "RESELLER", "RESELLER", "Loja Paga");
    const outsider = await makeUser();
    const outsiderShop = await makeOrg(outsider.userId, "RESELLER", "RESELLER", "Loja Alheia");
    const net = await makeNetwork(factory.id, "Rede Paga");
    await addMember(net.id, shop.id);
    await addMember(net.id, outsiderShop.id);

    const product = await makeProduct(factory.id, { name: "Blusa Paga", min_order_quantity: 1 });
    const variant = await makeVariant(product.id, { size: "M", retail_price: 79.9 });
    return { factoryAdmin, factory, reseller, shop, outsider, variant };
  }

  /** A supply order of `quantity` × R$ 79,90, confirmed by the factory unless told otherwise. */
  async function order(quantity = 3, confirm = true) {
    const { data, error } = await ctx.reseller.client.rpc("place_supply_order", {
      p_reseller_id: ctx.shop.id,
      p_supplier_id: ctx.factory.id,
      p_items: [{ variant_id: ctx.variant.id, quantity }],
    });
    if (error) throw error;
    if (confirm) {
      const res = await ctx.factoryAdmin.client.rpc("respond_supply_order", {
        p_order_id: data.id,
        p_decision: "confirm",
      });
      if (res.error) throw res.error;
    }
    return { id: data.id, total: Number(data.total_amount) };
  }

  async function pay(user: User, orderId: string) {
    setTestClient(user.client);
    return payOrderWithCard({}, formData({ orderId }));
  }

  /** Pays through the action and returns the checkout it opened. */
  async function startCheckout(orderId: string): Promise<Checkout> {
    setTestClient(ctx.reseller.client);
    const url = await expectRedirect(
      () => payOrderWithCard({}, formData({ orderId })),
      /^https:\/\/checkout\.stripe\.com\//,
    );
    return stripeApi.sessions.get(url.split("/").at(-1)!)!;
  }

  async function paymentRows(orderId: string) {
    const { data } = await admin()
      .from("supply_order_payments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at");
    return data ?? [];
  }

  function signedEvent(type: string, session: Record<string, unknown>) {
    const payload = JSON.stringify({
      id: `evt_${crypto.randomUUID()}`,
      object: "event",
      type,
      data: { object: { object: "checkout.session", ...session } },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    return { payload, signature };
  }

  async function post(payload: string, signature: string | null) {
    const headers = new Headers({ "content-type": "application/json" });
    if (signature) headers.set("stripe-signature", signature);
    return webhook(
      new NextRequest("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        body: payload,
        headers,
      }),
    );
  }

  function paidEvent(checkout: Checkout, amountTotal = Math.round(checkout.amount! * 100)) {
    return signedEvent("checkout.session.completed", {
      id: checkout.id,
      status: "complete",
      payment_status: "paid",
      amount_total: amountTotal,
      payment_intent: "pi_test_123",
      metadata: { supply_order_id: checkout.orderId },
    });
  }

  /** A confirmed order paid through the signed webhook. */
  async function paidOrder(quantity = 3) {
    const o = await order(quantity);
    const checkout = await startCheckout(o.id);
    const paymentIntentId = `pi_test_${crypto.randomUUID().replace(/-/g, "")}`;
    const event = signedEvent("checkout.session.completed", {
      id: checkout.id,
      status: "complete",
      payment_status: "paid",
      amount_total: Math.round(o.total * 100),
      payment_intent: paymentIntentId,
    });
    expect((await post(event.payload, event.signature)).status).toBe(200);
    stripeApi.amounts.set(paymentIntentId, o.total);
    return { ...o, paymentIntentId };
  }

  function refundedEvent(paymentIntentId: string, amountRefunded: number) {
    return signedEvent("charge.refunded", {
      object: "charge",
      id: `ch_${crypto.randomUUID()}`,
      payment_intent: paymentIntentId,
      amount_refunded: Math.round(amountRefunded * 100),
      refunded: true,
    });
  }

  async function refund(user: User, orderId: string, extra: Record<string, unknown> = {}) {
    setTestClient(user.client);
    return refundSupplyOrderPayment({}, formData({ orderId, confirm: "on", ...extra }));
  }

  async function notificationsOf(orgId: string, type: string, orderId: string) {
    const { data } = await admin()
      .from("notifications")
      .select("title, body")
      .eq("organization_id", orgId)
      .eq("type", type as "SUPPLY_ORDER_REFUNDED")
      .eq("link", `/pedidos/${orderId}`)
      .order("created_at");
    return data ?? [];
  }

  beforeAll(async () => {
    ctx = await setup();
  });
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
    stripeApi.configured = true;
    stripeApi.created.length = 0;
    stripeApi.expired.length = 0;
    stripeApi.refunds.length = 0;
    stripeApi.refundFails = false;
  });
  afterEach(() => {
    clearTestClient();
    vi.unstubAllEnvs();
  });

  it("opens a card checkout for the frozen order total (TC-PAY-01)", async () => {
    const o = await order(3);
    const checkout = await startCheckout(o.id);

    expect(stripeApi.created).toEqual([
      expect.objectContaining({
        orderId: o.id,
        amount: 239.7,
        successUrl: `http://localhost:3000/pedidos/${o.id}?checkout={CHECKOUT_SESSION_ID}`,
        cancelUrl: `http://localhost:3000/pedidos/${o.id}?toast=supply-order-payment-cancelled`,
      }),
    ]);
    expect(await paymentRows(o.id)).toEqual([
      expect.objectContaining({
        checkout_session_id: checkout.id,
        status: "PENDING",
        amount: 239.7,
        currency: "BRL",
        created_by: ctx.reseller.userId,
      }),
    ]);
    setTestClient(ctx.factoryAdmin.client);
    expect(await getSupplyOrderPayment(o.id)).toEqual({
      status: "PENDING",
      amount: 239.7,
      paidAt: null,
      refundedAmount: 0,
      refundedAt: null,
      refundReason: null,
    });
  });

  it("reuses the open checkout instead of opening a second one (TC-PAY-02)", async () => {
    const o = await order();
    const first = await startCheckout(o.id);
    const again = await startCheckout(o.id);
    expect(again.id).toBe(first.id);
    expect(stripeApi.created).toHaveLength(1);
    expect(await paymentRows(o.id)).toHaveLength(1);
  });

  it("only lets the order's reseller pay a confirmed order (TC-PAY-03)", async () => {
    const pending = await order(2, false);
    expect(await pay(ctx.reseller, pending.id)).toEqual({
      error: "Só é possível pagar um pedido confirmado pelo fornecedor",
    });

    const o = await order();
    expect(await pay(ctx.factoryAdmin, o.id)).toEqual({
      error: "Somente a revendedora do pedido pode pagar",
    });
    expect(await pay(ctx.outsider, o.id)).toEqual({ error: "Pedido não encontrado" });
    expect(await pay(ctx.reseller, "nope")).toEqual({ error: "Pedido não encontrado" });
    expect(stripeApi.created).toEqual([]);
    expect(await paymentRows(o.id)).toEqual([]);
  });

  it("says payments are unavailable when Stripe is not configured (TC-PAY-04)", async () => {
    stripeApi.configured = false;
    const o = await order();
    expect(await pay(ctx.reseller, o.id)).toEqual({
      error: "Os pagamentos estão indisponíveis no momento.",
    });
  });

  it("guards the registration and the status in the database too (TC-PAY-05)", async () => {
    const o = await order(2);
    const register = (client: User["client"], p: Record<string, unknown> = {}) =>
      client.rpc("register_supply_order_payment", {
        p_order_id: o.id,
        p_checkout_session_id: `cs_test_${crypto.randomUUID()}`,
        p_amount: o.total,
        ...p,
      });

    expect((await register(ctx.outsider.client)).error?.message).toBe("not authorized");
    expect((await register(ctx.reseller.client, { p_amount: 1 })).error?.message).toBe(
      "O valor do pagamento não confere com o total do pedido",
    );
    expect((await register(ctx.reseller.client)).error).toBeNull();
    expect((await register(ctx.reseller.client)).error?.message).toBe(
      "Já existe um pagamento em andamento para este pedido",
    );
    // the status only comes from Stripe, through the service role
    const { error } = await ctx.reseller.client.rpc("apply_supply_order_payment_status", {
      p_checkout_session_id: (await paymentRows(o.id))[0]!.checkout_session_id,
      p_status: "PAID",
      p_amount: o.total,
    });
    expect(error?.code).toBe("42501");
    expect((await paymentRows(o.id))[0]!.status).toBe("PENDING");
  });

  it("marks the order paid from the signed webhook and tells the supplier (TC-PAY-06)", async () => {
    const o = await order(4);
    const checkout = await startCheckout(o.id);
    const { payload, signature } = paidEvent(checkout);

    const res = await post(payload, signature);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, status: "PAID" });

    const [row] = await paymentRows(o.id);
    expect(row).toMatchObject({ status: "PAID", payment_intent_id: "pi_test_123" });
    expect(row!.paid_at).not.toBeNull();

    const { data: notes } = await admin()
      .from("notifications")
      .select("type, title, body, link")
      .eq("organization_id", ctx.factory.id)
      .eq("type", "SUPPLY_ORDER_PAID")
      .eq("link", `/pedidos/${o.id}`);
    expect(notes).toEqual([
      {
        type: "SUPPLY_ORDER_PAID",
        title: "Pedido pago",
        body: "Loja Paga pagou o pedido de 4 peças",
        link: `/pedidos/${o.id}`,
      },
    ]);

    // Stripe retries: the same event changes nothing and notifies once.
    expect((await post(payload, signature)).status).toBe(200);
    const { count } = await admin()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("type", "SUPPLY_ORDER_PAID")
      .eq("link", `/pedidos/${o.id}`);
    expect(count).toBe(1);

    expect(await pay(ctx.reseller, o.id)).toEqual({ error: "Este pedido já foi pago" });
  });

  it("rejects unsigned or tampered events (TC-PAY-07)", async () => {
    const o = await order();
    const checkout = await startCheckout(o.id);
    const { payload, signature } = paidEvent(checkout);

    expect((await post(payload, null)).status).toBe(400);
    expect((await post(payload.replace("pi_test_123", "pi_forged"), signature)).status).toBe(400);
    const forged = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_other" });
    expect((await post(payload, forged)).status).toBe(400);
    expect((await paymentRows(o.id))[0]!.status).toBe("PENDING");
  });

  it("refuses a paid amount that differs from the order (TC-PAY-08)", async () => {
    const o = await order();
    const checkout = await startCheckout(o.id);
    const { payload, signature } = paidEvent(checkout, 100);
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect((await post(payload, signature)).status).toBe(500);
    expect((await paymentRows(o.id))[0]!.status).toBe("PENDING");
  });

  it("acknowledges events it doesn't act on (TC-PAY-09)", async () => {
    const other = signedEvent("checkout.session.completed", {
      id: "cs_test_from_another_integration",
      status: "complete",
      payment_status: "paid",
      amount_total: 1000,
    });
    expect(await (await post(other.payload, other.signature)).json()).toEqual({
      received: true,
      ignored: true,
    });
    const unrelated = signedEvent("payment_intent.created", { id: "pi_x" });
    expect(await (await post(unrelated.payload, unrelated.signature)).json()).toEqual({
      received: true,
    });
  });

  it("lets the reseller try again after a checkout expires (TC-PAY-10)", async () => {
    const o = await order();
    const first = await startCheckout(o.id);
    const { payload, signature } = signedEvent("checkout.session.expired", {
      id: first.id,
      status: "expired",
      payment_status: "unpaid",
      amount_total: Math.round(first.amount! * 100),
    });
    expect((await post(payload, signature)).status).toBe(200);
    setTestClient(ctx.reseller.client);
    expect(await getSupplyOrderPayment(o.id)).toMatchObject({ status: "EXPIRED" });

    const second = await startCheckout(o.id);
    expect(second.id).not.toBe(first.id);
    expect((await paymentRows(o.id)).map((p) => p.status)).toEqual(["EXPIRED", "PENDING"]);
  });

  it("records the outcome when the reseller comes back from the checkout (TC-PAY-11)", async () => {
    const o = await order();
    const checkout = await startCheckout(o.id);
    const other = await order();

    // still open: nothing to record
    expect(await syncCheckout(o.id, checkout.id)).toBeNull();

    stripeApi.sessions.set(checkout.id, { ...checkout, outcome: "PAID", url: null });
    // a session id that belongs to another order changes nothing
    expect(await syncCheckout(other.id, checkout.id)).toBeNull();
    expect(await syncCheckout(o.id, checkout.id)).toBe("PAID");

    setTestClient(ctx.reseller.client);
    expect(await getSupplyOrderPayment(o.id)).toMatchObject({ status: "PAID", amount: 239.7 });
  });

  it("settles a checkout paid meanwhile instead of opening a new one (TC-PAY-12)", async () => {
    const o = await order();
    const checkout = await startCheckout(o.id);
    stripeApi.sessions.set(checkout.id, { ...checkout, outcome: "PAID", url: null });

    setTestClient(ctx.reseller.client);
    await expectRedirect(
      () => payOrderWithCard({}, formData({ orderId: o.id })),
      `/pedidos/${o.id}?toast=supply-order-paid`,
    );
    expect(stripeApi.created).toHaveLength(1);
    expect((await paymentRows(o.id)).map((p) => p.status)).toEqual(["PAID"]);
  });

  it("lets the supplier refund a paid order in full (TC-PAY-14)", async () => {
    const o = await paidOrder(3);
    setTestClient(ctx.factoryAdmin.client);
    await expectRedirect(
      () =>
        refundSupplyOrderPayment(
          {},
          formData({ orderId: o.id, confirm: "on", reason: "  Sem tecido para produzir  " }),
        ),
      `/pedidos/${o.id}?toast=supply-order-refunded`,
    );

    expect(stripeApi.refunds).toEqual([
      expect.objectContaining({ paymentIntentId: o.paymentIntentId, orderId: o.id }),
    ]);
    const [row] = await paymentRows(o.id);
    expect(row).toMatchObject({
      status: "REFUNDED",
      refunded_amount: 239.7,
      refunded_by: ctx.factoryAdmin.userId,
      refund_reason: "Sem tecido para produzir",
    });
    expect(row!.refunded_at).not.toBeNull();
    expect(await notificationsOf(ctx.shop.id, "SUPPLY_ORDER_REFUNDED", o.id)).toEqual([
      {
        title: "Pagamento reembolsado",
        body: "R$ 239,70 do pedido para Fábrica Paga foram reembolsados no seu cartão",
      },
    ]);

    setTestClient(ctx.reseller.client);
    expect(await getSupplyOrderPayment(o.id)).toMatchObject({
      status: "REFUNDED",
      refundedAmount: 239.7,
      refundReason: "Sem tecido para produzir",
    });
    // BR-PAY-07: a refunded order is not paid again
    expect(await pay(ctx.reseller, o.id)).toEqual({ error: "Este pedido foi reembolsado" });
    // and there's nothing left to refund
    expect(await refund(ctx.factoryAdmin, o.id)).toEqual({
      error: "Este pedido não tem um pagamento para reembolsar",
    });
    expect(stripeApi.refunds).toHaveLength(1);
  });

  it("only lets a supplier admin refund a paid order (TC-PAY-15)", async () => {
    const o = await paidOrder();
    const notPaid = await order();

    expect(await refund(ctx.reseller, o.id)).toEqual({
      error: "Você não tem permissão para esta ação",
    });
    expect(await refund(ctx.outsider, o.id)).toEqual({
      error: "Você não tem permissão para esta ação",
    });
    expect(await refund(ctx.factoryAdmin, notPaid.id)).toEqual({
      error: "Este pedido não tem um pagamento para reembolsar",
    });
    expect(await refund(ctx.factoryAdmin, o.id, { confirm: undefined })).toEqual({
      error: "Confirme o reembolso",
    });
    expect(await refund(ctx.factoryAdmin, o.id, { reason: "x".repeat(501) })).toEqual({
      error: "O motivo pode ter até 500 caracteres",
    });
    expect(stripeApi.refunds).toEqual([]);

    // the refund itself is service-role only
    const { error } = await ctx.factoryAdmin.client.rpc("apply_supply_order_payment_refund", {
      p_payment_intent_id: o.paymentIntentId,
      p_amount_refunded: o.total,
    });
    expect(error?.code).toBe("42501");
    expect((await paymentRows(o.id))[0]).toMatchObject({ status: "PAID", refunded_amount: 0 });
  });

  it("keeps the order paid when Stripe refuses the refund (TC-PAY-16)", async () => {
    const o = await paidOrder();
    stripeApi.refundFails = true;
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await refund(ctx.factoryAdmin, o.id)).toEqual({
      error: "Não foi possível reembolsar o pagamento. Tente novamente.",
    });
    expect((await paymentRows(o.id))[0]).toMatchObject({ status: "PAID", refunded_amount: 0 });
  });

  it("records refunds made on the Stripe Dashboard from the webhook (TC-PAY-17)", async () => {
    const o = await paidOrder(4); // R$ 319,60

    // partial refund: still paid, amount recorded
    const partial = refundedEvent(o.paymentIntentId, 100);
    expect(await (await post(partial.payload, partial.signature)).json()).toEqual({
      received: true,
      status: "PAID",
    });
    expect((await paymentRows(o.id))[0]).toMatchObject({ status: "PAID", refunded_amount: 100 });

    // a late, smaller total never lowers what was recorded
    const stale = refundedEvent(o.paymentIntentId, 50);
    expect((await post(stale.payload, stale.signature)).status).toBe(200);
    expect((await paymentRows(o.id))[0]!.refunded_amount).toBe(100);

    // the rest: fully refunded
    const full = refundedEvent(o.paymentIntentId, 319.6);
    expect(await (await post(full.payload, full.signature)).json()).toEqual({
      received: true,
      status: "REFUNDED",
    });
    expect((await post(full.payload, full.signature)).status).toBe(200);

    expect(await notificationsOf(ctx.shop.id, "SUPPLY_ORDER_REFUNDED", o.id)).toEqual([
      {
        title: "Reembolso parcial",
        body: "R$ 100,00 do pedido para Fábrica Paga foram reembolsados no seu cartão",
      },
      {
        title: "Pagamento reembolsado",
        body: "R$ 319,60 do pedido para Fábrica Paga foram reembolsados no seu cartão",
      },
    ]);

    // more than was paid is refused, and Stripe retries
    vi.spyOn(console, "error").mockImplementation(() => {});
    const over = refundedEvent(o.paymentIntentId, 400);
    expect((await post(over.payload, over.signature)).status).toBe(500);
  });

  it("ignores refunds of charges the app never recorded (TC-PAY-18)", async () => {
    const other = refundedEvent("pi_test_from_another_integration", 10);
    expect(await (await post(other.payload, other.signature)).json()).toEqual({
      received: true,
      ignored: true,
    });
  });
});
