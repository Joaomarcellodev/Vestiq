import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The SDK is faked so each test checks exactly what we send to Stripe.
// `Stripe.webhooks` (signature checking) stays the real one.
const sdk = vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    keys: [] as string[],
    checkout: { sessions: { create: fn(), retrieve: fn(), expire: fn() } },
    refunds: { create: fn() },
    paymentIntents: { retrieve: fn() },
    v2: { core: { accounts: { create: fn(), retrieve: fn() }, accountLinks: { create: fn() } } },
  };
});

vi.mock("stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("stripe")>();
  function FakeStripe(key: string) {
    sdk.keys.push(key);
    return sdk;
  }
  FakeStripe.webhooks = actual.default.webhooks;
  return { default: FakeStripe };
});

const provider = await import("./stripe");

const session = (over: Record<string, unknown> = {}) => ({
  id: "cs_test_1",
  url: "https://checkout.stripe.com/c/pay/cs_test_1",
  status: "open",
  payment_status: "unpaid",
  amount_total: 23970,
  payment_intent: null,
  metadata: { supply_order_id: "order-1" },
  ...over,
});

describe("Stripe provider (ADR-0012)", () => {
  beforeEach(() => vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_provider"));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("is unavailable without a secret key", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(provider.paymentsConfigured()).toBe(false);
    await expect(provider.getCheckout("cs_x")).rejects.toBeInstanceOf(
      provider.PaymentsNotConfiguredError,
    );
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_provider");
    expect(provider.paymentsConfigured()).toBe(true);
  });

  it("opens a card checkout as a destination charge with the platform fee", async () => {
    sdk.checkout.sessions.create.mockResolvedValue(session());
    const checkout = await provider.createCheckout({
      orderId: "order-1",
      description: "Pedido #ORDER1 · Fábrica",
      amount: 239.7,
      customerEmail: "loja@vestiq.dev",
      successUrl: "http://localhost:3000/ok",
      cancelUrl: "http://localhost:3000/cancel",
      transfer: { destination: "acct_fabrica", platformFee: 23.97 },
    });

    const params = sdk.checkout.sessions.create.mock.calls[0]![0];
    expect(params).toMatchObject({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      line_items: [{ quantity: 1, price_data: { currency: "brl", unit_amount: 23970 } }],
      client_reference_id: "order-1",
      metadata: { supply_order_id: "order-1" },
      payment_intent_data: {
        metadata: { supply_order_id: "order-1" },
        transfer_data: { destination: "acct_fabrica" },
        application_fee_amount: 2397,
      },
      customer_email: "loja@vestiq.dev",
      locale: "pt-BR",
    });
    expect(params).not.toHaveProperty("payment_method_types");
    expect(params.expires_at - Date.now() / 1000).toBeGreaterThan(29 * 60);
    expect(checkout).toEqual({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
      orderId: "order-1",
      outcome: null,
      amount: 239.7,
      paymentIntentId: null,
    });
  });

  it("leaves out a zero platform fee and refuses a session without a URL", async () => {
    sdk.checkout.sessions.create.mockResolvedValueOnce(session());
    await provider.createCheckout({
      orderId: "order-1",
      description: "Pedido",
      amount: 10,
      successUrl: "s",
      cancelUrl: "c",
      transfer: { destination: "acct_fabrica", platformFee: 0 },
    });
    expect(sdk.checkout.sessions.create.mock.calls[0]![0].payment_intent_data).not.toHaveProperty(
      "application_fee_amount",
    );

    sdk.checkout.sessions.create.mockResolvedValueOnce(session({ url: null }));
    await expect(
      provider.createCheckout({
        orderId: "order-1",
        description: "Pedido",
        amount: 10,
        successUrl: "s",
        cancelUrl: "c",
        transfer: { destination: "acct_fabrica", platformFee: 1 },
      }),
    ).rejects.toThrow(/without a URL/);
  });

  it("reads a paid session and expires an open one", async () => {
    sdk.checkout.sessions.retrieve.mockResolvedValue(
      session({
        status: "complete",
        payment_status: "paid",
        url: null,
        payment_intent: { id: "pi_1" },
      }),
    );
    expect(await provider.getCheckout("cs_test_1")).toMatchObject({
      outcome: "PAID",
      amount: 239.7,
      paymentIntentId: "pi_1",
    });

    sdk.checkout.sessions.retrieve.mockResolvedValue(
      session({ amount_total: null, metadata: null, payment_intent: "pi_2" }),
    );
    expect(await provider.getCheckout("cs_test_1")).toMatchObject({
      amount: null,
      orderId: null,
      paymentIntentId: "pi_2",
    });

    await provider.expireCheckout("cs_test_1");
    expect(sdk.checkout.sessions.expire).toHaveBeenCalledWith("cs_test_1");
  });

  it("refunds a destination charge from the supplier, with the commission", async () => {
    sdk.refunds.create.mockResolvedValue({ id: "re_1", status: "succeeded", amount: 23970 });
    sdk.paymentIntents.retrieve.mockResolvedValue({ latest_charge: { amount_refunded: 23970 } });

    expect(
      await provider.refundPayment({
        paymentIntentId: "pi_1",
        orderId: "order-1",
        idempotencyKey: "vestiq-refund-p1",
        destinationCharge: true,
      }),
    ).toEqual({ paymentIntentId: "pi_1", amountRefunded: 239.7 });
    expect(sdk.refunds.create).toHaveBeenCalledWith(
      {
        payment_intent: "pi_1",
        reason: "requested_by_customer",
        metadata: { supply_order_id: "order-1" },
        reverse_transfer: true,
        refund_application_fee: true,
      },
      { idempotencyKey: "vestiq-refund-p1" },
    );
    expect(sdk.paymentIntents.retrieve).toHaveBeenCalledWith("pi_1", {
      expand: ["latest_charge"],
    });
  });

  it("refunds a platform-only charge plainly, and fails on a failed refund", async () => {
    sdk.refunds.create.mockResolvedValueOnce({ id: "re_2", status: "pending", amount: 1000 });
    sdk.paymentIntents.retrieve.mockResolvedValueOnce({ latest_charge: null });
    const input = {
      paymentIntentId: "pi_2",
      orderId: "order-2",
      idempotencyKey: "k",
      destinationCharge: false,
    };
    // the charge didn't come back: fall back to this refund's amount
    expect(await provider.refundPayment(input)).toEqual({
      paymentIntentId: "pi_2",
      amountRefunded: 10,
    });
    expect(sdk.refunds.create.mock.calls[0]![0]).not.toHaveProperty("reverse_transfer");

    sdk.refunds.create.mockResolvedValueOnce({ id: "re_3", status: "failed", amount: 1000 });
    await expect(provider.refundPayment(input)).rejects.toThrow(/re_3 failed/);
  });

  it("creates the factory's connected account as a Brazilian marketplace recipient", async () => {
    sdk.v2.core.accounts.create.mockResolvedValue({
      id: "acct_new",
      configuration: {
        recipient: {
          capabilities: { stripe_balance: { stripe_transfers: { status: "pending" } } },
        },
      },
    });
    expect(
      await provider.createRecipientAccount({
        organizationId: "org-1",
        name: "Fábrica Modah",
        email: "fabrica@vestiq.dev",
      }),
    ).toEqual({ id: "acct_new", transfersStatus: "pending" });
    expect(sdk.v2.core.accounts.create).toHaveBeenCalledWith(
      {
        display_name: "Fábrica Modah",
        contact_email: "fabrica@vestiq.dev",
        dashboard: "express",
        identity: { country: "br" },
        defaults: {
          responsibilities: { fees_collector: "application", losses_collector: "application" },
        },
        configuration: {
          recipient: {
            capabilities: { stripe_balance: { stripe_transfers: { requested: true } } },
          },
        },
        metadata: { organization_id: "org-1" },
        include: ["configuration.recipient"],
      },
      { idempotencyKey: "vestiq-recipient-org-1" },
    );
  });

  it("reads whether the account can receive, treating anything unknown as pending", async () => {
    const withStatus = (status?: string) => ({
      configuration: {
        recipient: { capabilities: { stripe_balance: { stripe_transfers: { status } } } },
      },
    });
    sdk.v2.core.accounts.retrieve.mockResolvedValueOnce(withStatus("active"));
    expect(await provider.getRecipientStatus("acct_1")).toBe("active");
    expect(sdk.v2.core.accounts.retrieve).toHaveBeenCalledWith("acct_1", {
      include: ["configuration.recipient"],
    });
    sdk.v2.core.accounts.retrieve.mockResolvedValueOnce(withStatus("something_new"));
    expect(await provider.getRecipientStatus("acct_1")).toBe("pending");
    sdk.v2.core.accounts.retrieve.mockResolvedValueOnce({ configuration: null });
    expect(await provider.getRecipientStatus("acct_1")).toBe("pending");
  });

  it("creates a hosted onboarding link for the account", async () => {
    sdk.v2.core.accountLinks.create.mockResolvedValue({ url: "https://connect.stripe.com/x" });
    expect(
      await provider.createOnboardingLink({
        accountId: "acct_1",
        refreshUrl: "http://localhost:3000/api/payments/onboarding",
        returnUrl: "http://localhost:3000/recebimentos?cadastro=retorno",
      }),
    ).toBe("https://connect.stripe.com/x");
    expect(sdk.v2.core.accountLinks.create).toHaveBeenCalledWith({
      account: "acct_1",
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          refresh_url: "http://localhost:3000/api/payments/onboarding",
          return_url: "http://localhost:3000/recebimentos?cadastro=retorno",
        },
      },
    });
  });

  it("reuses one client per process", () => {
    expect(sdk.keys).toEqual(["sk_test_provider"]);
  });
});
