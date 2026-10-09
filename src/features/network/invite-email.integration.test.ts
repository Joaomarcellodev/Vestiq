import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  admin,
  makeOrg,
  makeUser,
  PUBLISHABLE_KEY,
  SUPABASE_URL,
  supabaseUp,
  uniqueEmail,
} from "@/test/supabase";
import {
  clearTestClient,
  expectRedirect,
  formData,
  makeNetwork,
  setTestClient,
} from "@/test/actions";
import type { Database } from "@/types/database";

// Lets one test simulate an SMTP failure while the others send for real.
const failNext = vi.hoisted(() => ({ value: false }));
vi.mock("./invite-email", async (importOriginal) => {
  const real = await importOriginal<typeof import("./invite-email")>();
  return {
    sendInviteEmail: (email: string, token: string) => {
      if (failNext.value) {
        failNext.value = false;
        return Promise.resolve({ error: "Não foi possível enviar o email de convite." });
      }
      return real.sendInviteEmail(email, token);
    },
  };
});

const { acceptInvite, inviteReseller } = await import("./actions");
const { GET: confirmRoute } = await import("@/app/auth/confirm/route");

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

/** The link of the email button, with the HTML entities decoded. */
function emailLink(html: string): URL {
  const href = html.match(/href="([^"]*\/auth\/confirm[^"]*)"/)?.[1];
  if (!href) throw new Error("no /auth/confirm link in the email");
  return new URL(href.replace(/&amp;/g, "&"));
}

async function inviteToken(networkId: string, email: string) {
  const { data } = await admin()
    .from("network_members")
    .select("invite_token")
    .eq("network_id", networkId)
    .eq("invited_email", email)
    .maybeSingle();
  return data?.invite_token ?? null;
}

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("network invite email (VES-64)", () => {
  let networkId: string;

  beforeEach(async () => {
    const factory = await makeUser();
    const org = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica Email");
    networkId = (await makeNetwork(org.id)).id;
    setTestClient(factory.client);
  });
  afterEach(() => clearTestClient());

  it("invites a new email: Auth creates the account and the link opens the invite (TC-NET-13)", async () => {
    const email = uniqueEmail("convidada");
    expect(await inviteReseller({}, formData({ networkId, email }))).toEqual({ ok: true });
    const token = await inviteToken(networkId, email);

    const { subject, html } = await waitForEmail(email);
    expect(subject).toBe("Convite para uma rede no Vestiq");
    const link = emailLink(html);
    expect(link.pathname).toBe("/auth/confirm");
    expect(link.searchParams.get("next")).toBe(`/convite/${token}`);
    expect(link.searchParams.get("type")).toBe("invite");

    // Opening the link in the invitee's own browser starts her session.
    const browser = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    setTestClient(browser);
    const res = await confirmRoute(new NextRequest(link.toString()));
    expect(res.headers.get("location")).toMatch(new RegExp(`/convite/${token}$`));
    expect((await browser.auth.getUser()).data.user?.email).toBe(email);
  });

  it("the invited account sets its password when accepting (TC-NET-15)", async () => {
    const email = uniqueEmail("senha");
    await inviteReseller({}, formData({ networkId, email }));
    const token = await inviteToken(networkId, email);
    const browser = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    setTestClient(browser);
    await confirmRoute(new NextRequest(emailLink((await waitForEmail(email)).html).toString()));

    const accept = (password: string, confirm = password) =>
      acceptInvite({}, formData({ token, resellerName: "Loja Nova", password, confirm }));
    expect(await accept("curta")).toEqual({ error: "A senha deve ter ao menos 8 caracteres." });
    expect(await accept("senha-forte-1", "outra-senha")).toEqual({
      error: "As senhas não coincidem.",
    });
    await expectRedirect(() => accept("senha-forte-1"), /toast=network-joined/);

    const fresh = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signIn = await fresh.auth.signInWithPassword({ email, password: "senha-forte-1" });
    expect(signIn.error).toBeNull();
    expect(signIn.data.user?.user_metadata.password_set).toBe(true);
  });

  it("sends an access link to an email that already has an account (TC-NET-13)", async () => {
    const existing = await makeUser(uniqueEmail("ja-tem-conta"));
    expect(await inviteReseller({}, formData({ networkId, email: existing.email }))).toEqual({
      ok: true,
    });

    const { subject, html } = await waitForEmail(existing.email);
    expect(subject).toBe("Seu convite no Vestiq");
    const link = emailLink(html);
    expect(link.searchParams.get("type")).toBe("magiclink");
    expect(link.searchParams.get("next")).toBe(
      `/convite/${await inviteToken(networkId, existing.email)}`,
    );
  });

  it("undoes the invite when the email can't be sent (TC-NET-14)", async () => {
    const email = uniqueEmail("falha");
    failNext.value = true;
    expect(await inviteReseller({}, formData({ networkId, email }))).toEqual({
      error: "Não foi possível enviar o email de convite.",
    });
    expect(await inviteToken(networkId, email)).toBeNull();

    // Nothing left behind: trying again just works.
    expect(await inviteReseller({}, formData({ networkId, email }))).toEqual({ ok: true });
  });

  it("rejects a used or malformed link at /auth/confirm", async () => {
    const bad = await confirmRoute(
      new NextRequest("http://localhost:3000/auth/confirm?token_hash=nope&type=invite&next=/x"),
    );
    expect(bad.headers.get("location")).toBe("http://localhost:3000/login?error=link");
    const wrongType = await confirmRoute(
      new NextRequest("http://localhost:3000/auth/confirm?token_hash=x&type=recovery"),
    );
    expect(wrongType.headers.get("location")).toBe("http://localhost:3000/login?error=link");
  });
});
