import { describe, expect, it } from "vitest";
import { changePasswordSchema, profileSchema } from "./validation";

describe("profileSchema", () => {
  it("accepts a valid profile", () => {
    const r = profileSchema.safeParse({
      fullName: "Sarah Mendes",
      email: "sarah@loja.com",
      birthDate: "1994-05-10",
    });
    expect(r.success).toBe(true);
  });

  it("requires a name of at least 2 chars", () => {
    expect(profileSchema.safeParse({ fullName: "S", email: "a@b.com" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(profileSchema.safeParse({ fullName: "Sarah", email: "nope" }).success).toBe(false);
  });

  it("allows an empty birth date", () => {
    const r = profileSchema.safeParse({ fullName: "Sarah", email: "a@b.com", birthDate: "" });
    expect(r.success).toBe(true);
  });

  it("rejects a birth date in the future", () => {
    const r = profileSchema.safeParse({
      fullName: "Sarah",
      email: "a@b.com",
      birthDate: "3000-01-01",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const r = profileSchema.safeParse({ fullName: "Sarah", email: "a@b.com", birthDate: "10/05" });
    expect(r.success).toBe(false);
  });
});

describe("changePasswordSchema (VES-92)", () => {
  const ok = { current: "senha-antiga", password: "senha-nova-1", confirm: "senha-nova-1" };
  const issue = (over: Partial<typeof ok>) => {
    const r = changePasswordSchema.safeParse({ ...ok, ...over });
    return r.success ? null : r.error.issues[0];
  };

  it("accepts the current password plus a confirmed new one", () => {
    expect(changePasswordSchema.safeParse(ok).success).toBe(true);
  });

  it("requires the current password", () => {
    expect(issue({ current: "" })).toMatchObject({
      path: ["current"],
      message: "Informe a senha atual.",
    });
  });

  it("keeps the reset rules: 8 characters and a matching confirmation", () => {
    expect(issue({ password: "curta", confirm: "curta" })).toMatchObject({ path: ["password"] });
    expect(issue({ confirm: "outra-senha" })).toMatchObject({
      path: ["confirm"],
      message: "As senhas não coincidem.",
    });
  });

  it("rejects a new password equal to the current one", () => {
    expect(issue({ password: "senha-antiga", confirm: "senha-antiga" })).toMatchObject({
      path: ["password"],
      message: "A nova senha precisa ser diferente da atual.",
    });
  });
});
