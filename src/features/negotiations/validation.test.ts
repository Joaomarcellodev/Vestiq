import { describe, expect, it } from "vitest";
import { negotiationActionSchema, openNegotiationSchema } from "./validation";

const VALID_UUID = "11111111-1111-1111-1111-111111111111";

describe("openNegotiationSchema", () => {
  it("accepts a valid payload without a message", () => {
    const result = openNegotiationSchema.safeParse({
      offerId: VALID_UUID,
      quantity: "2",
      amount: "150.5",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty message (optional)", () => {
    const result = openNegotiationSchema.safeParse({
      offerId: VALID_UUID,
      quantity: "1",
      amount: "10",
      message: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a message over 1000 characters", () => {
    const result = openNegotiationSchema.safeParse({
      offerId: VALID_UUID,
      quantity: "1",
      amount: "10",
      message: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a message right at the 1000 character limit", () => {
    const result = openNegotiationSchema.safeParse({
      offerId: VALID_UUID,
      quantity: "1",
      amount: "10",
      message: "a".repeat(1000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-positive quantity", () => {
    const result = openNegotiationSchema.safeParse({
      offerId: VALID_UUID,
      quantity: "0",
      amount: "10",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive amount", () => {
    const result = openNegotiationSchema.safeParse({
      offerId: VALID_UUID,
      quantity: "1",
      amount: "-5",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an offerId that is not a uuid", () => {
    const result = openNegotiationSchema.safeParse({
      offerId: "not-a-uuid",
      quantity: "1",
      amount: "10",
    });
    expect(result.success).toBe(false);
  });
});

describe("negotiationActionSchema", () => {
  it("accepts each known action", () => {
    for (const action of ["accept", "reject", "cancel", "message", "complete"]) {
      const result = negotiationActionSchema.safeParse({
        negotiationId: VALID_UUID,
        action,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an unknown action", () => {
    const result = negotiationActionSchema.safeParse({
      negotiationId: VALID_UUID,
      action: "delete",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a message over 1000 characters on an action too", () => {
    const result = negotiationActionSchema.safeParse({
      negotiationId: VALID_UUID,
      action: "message",
      message: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});
