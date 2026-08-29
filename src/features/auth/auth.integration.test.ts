import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeUser, supabaseUp, uniqueEmail } from "@/test/supabase";
import { clearTestClient, expectRedirect, formData, useTestClient } from "@/test/actions";
import {
  requestPasswordReset,
  signInWithOAuth,
  signInWithPassword,
  signOut,
  updatePassword,
} from "./actions";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("auth actions (SPEC-002)", () => {
  let user: Awaited<ReturnType<typeof makeUser>>;

  beforeEach(async () => {
    user = await makeUser(uniqueEmail("auth"), "test-pass-1234");
    useTestClient(user.client);
  });
  afterEach(() => clearTestClient());

  describe("signInWithPassword", () => {
    it("signs in with valid credentials and redirects to next (sanitised)", async () => {
      await expectRedirect(
        () =>
          signInWithPassword(
            {},
            formData({ email: user.email, password: "test-pass-1234", next: "/vendas" }),
          ),
        "/vendas",
      );
    });

    it("defaults to /dashboard and rejects protocol-relative next", async () => {
      await expectRedirect(
        () =>
          signInWithPassword(
            {},
            formData({ email: user.email, password: "test-pass-1234", next: "//evil.com" }),
          ),
        "/dashboard",
      );
    });

    it("returns a generic error for wrong credentials", async () => {
      const state = await signInWithPassword(
        {},
        formData({ email: user.email, password: "wrong-password" }),
      );
      expect(state.error).toMatch(/email ou senha/i);
    });

    it("returns field errors for malformed input", async () => {
      const state = await signInWithPassword({}, formData({ email: "nope", password: "" }));
      expect(state.fieldErrors?.email).toBeTruthy();
      expect(state.fieldErrors?.password).toBeTruthy();
    });
  });

  describe("signInWithOAuth", () => {
    it("throws on an unsupported provider", async () => {
      await expect(
        signInWithOAuth(formData({ provider: "apple", next: "/dashboard" })),
      ).rejects.toThrow();
    });

    it("redirects for a supported provider", async () => {
      // local Supabase returns a provider URL even without Google configured
      await expectRedirect(
        () => signInWithOAuth(formData({ provider: "google", next: "/dashboard" })),
        /./,
      );
    });
  });

  describe("requestPasswordReset", () => {
    it("always reports success (no account enumeration)", async () => {
      expect((await requestPasswordReset({}, formData({ email: user.email }))).ok).toBe(true);
      expect((await requestPasswordReset({}, formData({ email: "ghost@nowhere.test" }))).ok).toBe(
        true,
      );
    });

    it("returns a field error for a malformed email", async () => {
      const state = await requestPasswordReset({}, formData({ email: "bad" }));
      expect(state.fieldErrors?.email).toBeTruthy();
      expect(state.ok).toBeUndefined();
    });
  });

  describe("updatePassword", () => {
    it("updates the password and redirects logged in", async () => {
      await expectRedirect(
        () => updatePassword({}, formData({ password: "new-pass-9876", confirm: "new-pass-9876" })),
        "/dashboard?toast=password-updated",
      );
    });

    it("rejects a short password", async () => {
      const state = await updatePassword({}, formData({ password: "short", confirm: "short" }));
      expect(state.fieldErrors?.password).toMatch(/8 caracteres/i);
    });

    it("rejects mismatched confirmation", async () => {
      const state = await updatePassword(
        {},
        formData({ password: "longenough1", confirm: "different1" }),
      );
      expect(state.fieldErrors?.confirm).toMatch(/não coincidem/i);
    });

    it("fails when there is no session", async () => {
      await user.client.auth.signOut({ scope: "local" });
      const state = await updatePassword(
        {},
        formData({ password: "another-pass-1", confirm: "another-pass-1" }),
      );
      expect(state.error).toMatch(/sessão expirada/i);
    });
  });

  describe("signOut", () => {
    it("ends the session and redirects to /login", async () => {
      await expectRedirect(() => signOut(), "/login");
    });
  });
});
