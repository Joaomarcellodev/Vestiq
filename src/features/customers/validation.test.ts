import { describe, expect, it } from "vitest";
import { customerSchema } from "./validation";

describe("customer validation", () => {
  it("requires a name", () => {
    expect(customerSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accepts a minimal customer", () => {
    expect(customerSchema.safeParse({ name: "Maria Rodrigues" }).success).toBe(true);
  });

  it("rejects an invalid CPF", () => {
    const r = customerSchema.safeParse({ name: "X", document: "111" });
    expect(r.success).toBe(false);
  });

  it("accepts a valid CPF", () => {
    const r = customerSchema.safeParse({ name: "X", document: "529.982.247-25" });
    expect(r.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(customerSchema.safeParse({ name: "X", email: "nope" }).success).toBe(false);
  });
});
