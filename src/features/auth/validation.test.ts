import { describe, expect, it } from "vitest";
import { credentialsSchema, oauthProviderSchema } from "./validation";

describe("credentialsSchema", () => {
  it("accepts a valid email + password", () => {
    const result = credentialsSchema.safeParse({
      email: "reseller@marca.com.br",
      password: "s3nh4-forte",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = credentialsSchema.safeParse({ email: "nope", password: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email?.[0]).toBe("Email inválido.");
    }
  });

  it("requires a password", () => {
    const result = credentialsSchema.safeParse({ email: "a@b.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("coerces the remember flag", () => {
    const result = credentialsSchema.parse({
      email: "a@b.com",
      password: "x",
      remember: "true",
    });
    expect(result.remember).toBe(true);
  });
});

describe("oauthProviderSchema", () => {
  it("allows google and apple only", () => {
    expect(oauthProviderSchema.safeParse("google").success).toBe(true);
    expect(oauthProviderSchema.safeParse("apple").success).toBe(true);
    expect(oauthProviderSchema.safeParse("facebook").success).toBe(false);
  });
});
