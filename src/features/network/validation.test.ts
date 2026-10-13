import { describe, expect, it } from "vitest";
import { inviteSignupSchema } from "./validation";

const valid = {
  token: "6f1c2b9e-3d4a-4e8b-9f0a-1b2c3d4e5f60",
  resellerName: "Atelier Sarah",
  password: "segredo123",
  confirm: "segredo123",
};

describe("inviteSignupSchema (VES-95)", () => {
  it("accepts a complete signup", () => {
    expect(inviteSignupSchema.safeParse(valid).success).toBe(true);
  });

  it("requires the store name", () => {
    const r = inviteSignupSchema.safeParse({ ...valid, resellerName: "   " });
    expect(r.error?.issues[0]).toMatchObject({
      path: ["resellerName"],
      message: "Informe o nome da sua loja.",
    });
  });

  it("requires 8+ characters and a matching confirmation", () => {
    expect(
      inviteSignupSchema.safeParse({ ...valid, password: "curta", confirm: "curta" }).error
        ?.issues[0]?.path,
    ).toEqual(["password"]);
    const r = inviteSignupSchema.safeParse({ ...valid, confirm: "outra-senha" });
    expect(r.error?.issues[0]).toMatchObject({
      path: ["confirm"],
      message: "As senhas não coincidem.",
    });
  });

  it("rejects a token that is not a uuid", () => {
    expect(inviteSignupSchema.safeParse({ ...valid, token: "abc" }).success).toBe(false);
  });
});
