import { describe, expect, it } from "vitest";
import { profileSchema } from "./validation";

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
