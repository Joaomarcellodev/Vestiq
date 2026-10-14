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

  it("rejects a phone with letters or without DDD (VES-80)", () => {
    for (const phone of ["abcdef", "98765-4321", "(11) 9876-543a"]) {
      const r = customerSchema.safeParse({ name: "X", phone });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.message).toBe("Telefone inválido: informe DDD + número");
    }
  });

  it("stores the phone and the CPF as digits (VES-80)", () => {
    const r = customerSchema.parse({
      name: "X",
      phone: "(11) 98765-4321",
      document: "529.982.247-25",
    });
    expect(r).toMatchObject({ phone: "11987654321", document: "52998224725" });
    expect(customerSchema.parse({ name: "X", phone: "" })).toMatchObject({ phone: "" });
  });

  it("rejects an invalid email", () => {
    expect(customerSchema.safeParse({ name: "X", email: "nope" }).success).toBe(false);
  });
});
