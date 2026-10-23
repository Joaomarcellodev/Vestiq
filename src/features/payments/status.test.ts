import { describe, expect, it } from "vitest";
import { eventOutcome, fromCents, isCheckoutEvent, sessionOutcome, toCents } from "./status";

describe("payment status (SPEC-013)", () => {
  it("settles a session only once it is paid or expired", () => {
    expect(sessionOutcome({ status: "complete", payment_status: "paid" })).toBe("PAID");
    expect(sessionOutcome({ status: "expired", payment_status: "unpaid" })).toBe("EXPIRED");
    expect(sessionOutcome({ status: "open", payment_status: "unpaid" })).toBeNull();
    // a delayed method completes the session before the money arrives
    expect(sessionOutcome({ status: "complete", payment_status: "unpaid" })).toBeNull();
    expect(sessionOutcome({ status: null, payment_status: "unpaid" })).toBeNull();
  });

  it("maps each checkout event to the status it implies (BR-PAY-05)", () => {
    const unpaid = { status: "complete", payment_status: "unpaid" };
    const paid = { status: "complete", payment_status: "paid" };
    expect(eventOutcome("checkout.session.completed", paid)).toBe("PAID");
    expect(eventOutcome("checkout.session.completed", unpaid)).toBeNull();
    expect(eventOutcome("checkout.session.async_payment_succeeded", unpaid)).toBe("PAID");
    expect(eventOutcome("checkout.session.async_payment_failed", unpaid)).toBe("FAILED");
    expect(eventOutcome("checkout.session.expired", unpaid)).toBe("EXPIRED");
  });

  it("only acts on checkout events", () => {
    expect(isCheckoutEvent("checkout.session.completed")).toBe(true);
    expect(isCheckoutEvent("payment_intent.succeeded")).toBe(false);
    expect(isCheckoutEvent("charge.refunded")).toBe(false);
  });

  it("converts BRL to centavos without floating-point drift", () => {
    expect(toCents(1678.2)).toBe(167820);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(79.9)).toBe(7990);
    expect(fromCents(167820)).toBe(1678.2);
  });
});
