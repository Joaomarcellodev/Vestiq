import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { makeUser, PUBLISHABLE_KEY, SUPABASE_URL, supabaseUp, uniqueEmail } from "@/test/supabase";
import type { Database } from "@/types/database";

const MAILPIT = "http://127.0.0.1:54424";

/** Waits for the email Auth sends to `to` and returns its subject and HTML. */
async function waitForEmail(to: string): Promise<{ subject: string; html: string }> {
  for (let i = 0; i < 25; i++) {
    const list = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const { messages } = (await list.json()) as { messages: { ID: string }[] | null };
    if (messages?.length) {
      const msg = await fetch(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`);
      const body = (await msg.json()) as { Subject: string; HTML: string };
      return { subject: body.Subject, html: body.HTML };
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no email for ${to}`);
}

const up = await supabaseUp();
const d = up ? describe : describe.skip;

// VES-102 — the Auth emails use the pt-BR templates of supabase/config.toml.
d("Auth emails in pt-BR (VES-102)", () => {
  it("sends the password recovery email in pt-BR with the Vestiq look", async () => {
    const email = uniqueEmail();
    await makeUser(email);
    const anon = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/auth/callback?next=%2Fredefinir-senha",
    });
    expect(error).toBeNull();

    const { subject, html } = await waitForEmail(email);
    expect(subject).toBe("Redefinir sua senha no Vestiq");
    expect(html).toContain("VESTIQ");
    expect(html).toContain("Redefinir senha");
    expect(html).not.toMatch(/reset your password/i);
    // The button keeps Supabase's own verification link.
    expect(html).toMatch(/href="[^"]*\/auth\/v1\/verify\?token=[^"]*type=recovery/);
  });

  it("sends the email-change confirmation in pt-BR, naming both addresses", async () => {
    const email = uniqueEmail();
    const user = await makeUser(email);
    const next = uniqueEmail();
    const { error } = await user.client.auth.updateUser({ email: next });
    expect(error).toBeNull();

    const { subject, html } = await waitForEmail(next);
    expect(subject).toBe("Confirme o novo email da sua conta no Vestiq");
    expect(html).toContain("Confirmar troca de email");
    expect(html).toContain(email);
    expect(html).toContain(next);
  });
});
