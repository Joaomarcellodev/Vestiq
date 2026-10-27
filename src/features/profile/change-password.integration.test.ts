import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { makeUser, PUBLISHABLE_KEY, SUPABASE_URL, supabaseUp } from "@/test/supabase";
import { clearTestClient, formData, setTestClient } from "@/test/actions";
import { changePassword } from "./actions";

const up = await supabaseUp();
const d = up ? describe : describe.skip;

const OLD = "test-pass-1234";

async function canSignIn(email: string, password: string) {
  const c = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password });
  return !error;
}

// VES-92 — "Senha" section of /perfil.
d("changePassword (VES-92)", () => {
  let user: Awaited<ReturnType<typeof makeUser>>;

  beforeEach(async () => {
    user = await makeUser(undefined, OLD);
    setTestClient(user.client);
  });
  afterEach(() => clearTestClient());

  it("changes the password and keeps the current session", async () => {
    const state = await changePassword(
      {},
      formData({ current: OLD, password: "nova-senha-123", confirm: "nova-senha-123" }),
    );
    expect(state).toEqual({ ok: true });

    expect(await canSignIn(user.email, "nova-senha-123")).toBe(true);
    expect(await canSignIn(user.email, OLD)).toBe(false);
    // the browser's session is the one that made the change — still valid
    const { data, error } = await user.client.auth.getUser();
    expect(error).toBeNull();
    expect(data.user?.id).toBe(user.userId);
  });

  it("refuses a wrong current password and leaves the password as it was", async () => {
    const state = await changePassword(
      {},
      formData({ current: "errada-123", password: "nova-senha-123", confirm: "nova-senha-123" }),
    );
    expect(state.fieldErrors?.current).toBe("Senha atual incorreta.");
    expect(await canSignIn(user.email, OLD)).toBe(true);
  });

  it("returns the schema's errors per field", async () => {
    const state = await changePassword(
      {},
      formData({ current: OLD, password: "curta", confirm: "outra" }),
    );
    expect(state.fieldErrors?.password).toBe("A senha deve ter ao menos 8 caracteres.");
    expect(state.fieldErrors?.confirm).toBe("As senhas não coincidem.");
    expect(await canSignIn(user.email, OLD)).toBe(true);
  });
});
