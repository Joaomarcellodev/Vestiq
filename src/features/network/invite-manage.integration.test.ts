import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { admin, makeOrg, makeUser, supabaseUp, uniqueEmail } from "@/test/supabase";
import { clearTestClient, formData, makeNetwork, setTestClient } from "@/test/actions";

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

const { cancelInvite, inviteReseller, resendInvite } = await import("./actions");

const MAILPIT = "http://127.0.0.1:54424";

/** Waits for an email to `to` whose HTML mentions `text`. */
async function waitForEmailWith(to: string, text: string): Promise<boolean> {
  for (let i = 0; i < 25; i++) {
    const list = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const { messages } = (await list.json()) as { messages: { ID: string }[] | null };
    for (const m of messages ?? []) {
      const msg = await fetch(`${MAILPIT}/api/v1/message/${m.ID}`);
      const body = (await msg.json()) as { HTML: string };
      if (body.HTML.includes(text)) return true;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("cancel and resend a pending invite (VES-88)", () => {
  let networkId: string;
  let factoryClient: Awaited<ReturnType<typeof makeUser>>["client"];

  async function invite(email: string, patch: Record<string, unknown> = {}) {
    const { data, error } = await admin()
      .from("network_members")
      .insert({ network_id: networkId, invited_email: email, status: "INVITED", ...patch })
      .select("id, invite_token, invite_expires_at")
      .single();
    if (error || !data) throw error ?? new Error("invite failed");
    return data;
  }

  const row = async (id: string) =>
    (
      await admin()
        .from("network_members")
        .select("status, invite_token, invite_expires_at")
        .eq("id", id)
        .maybeSingle()
    ).data;

  const pendingInvites = async () =>
    (
      await factoryClient
        .from("factory_network_stats")
        .select("pending_invites")
        .eq("network_id", networkId)
        .single()
    ).data?.pending_invites;

  beforeEach(async () => {
    const factory = await makeUser();
    const org = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica Convites");
    networkId = (await makeNetwork(org.id)).id;
    factoryClient = factory.client;
    setTestClient(factory.client);
  });
  afterEach(() => clearTestClient());

  it("cancels: the invite leaves the list, the indicators and its link stops working", async () => {
    const pending = await invite(uniqueEmail("cancelar"));
    expect(await pendingInvites()).toBe(1);

    expect(await cancelInvite(formData({ memberId: pending.id }))).toEqual({});

    expect(await row(pending.id)).toBeNull();
    expect(await pendingInvites()).toBe(0);
    const { data } = await admin()
      .rpc("get_network_invite", { p_token: pending.invite_token })
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("never cancels someone who already joined", async () => {
    const reseller = await makeUser();
    const org = await makeOrg(reseller.userId, "RESELLER", "RESELLER", "Loja Ativa");
    const member = await invite(reseller.email, {
      status: "ACTIVE",
      reseller_id: org.id,
      joined_at: new Date().toISOString(),
    });

    expect(await cancelInvite(formData({ memberId: member.id }))).toEqual({
      error: "Não foi possível cancelar o convite. Atualize a página e tente novamente.",
    });
    expect((await row(member.id))?.status).toBe("ACTIVE");
  });

  it("resends with a new token and a new 14-day window", async () => {
    const email = uniqueEmail("reenviar");
    const pending = await invite(email);

    expect(await resendInvite(formData({ memberId: pending.id }))).toEqual({ ok: true });

    const renewed = await row(pending.id);
    expect(renewed?.invite_token).not.toBe(pending.invite_token);
    const days = (Date.parse(renewed!.invite_expires_at) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(13.9);
    expect(await waitForEmailWith(email, renewed!.invite_token)).toBe(true);

    // The previous link is dead.
    const { data } = await admin()
      .rpc("get_network_invite", { p_token: pending.invite_token })
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("resends to someone the first invite email already reached", async () => {
    const email = uniqueEmail("segundo-envio");
    expect(await inviteReseller({}, formData({ networkId, email }))).toEqual({ ok: true });
    const { data: first } = await admin()
      .from("network_members")
      .select("id")
      .eq("network_id", networkId)
      .eq("invited_email", email)
      .single();

    expect(await resendInvite(formData({ memberId: first!.id }))).toEqual({ ok: true });
    expect(await waitForEmailWith(email, (await row(first!.id))!.invite_token)).toBe(true);
  });

  it("brings an expired invite back to life", async () => {
    const pending = await invite(uniqueEmail("expirado"), {
      invite_expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(await pendingInvites()).toBe(0);

    expect(await resendInvite(formData({ memberId: pending.id }))).toEqual({ ok: true });

    const { data } = await admin()
      .rpc("get_network_invite", { p_token: (await row(pending.id))!.invite_token })
      .maybeSingle();
    expect(data?.state).toBe("PENDING");
    expect(await pendingInvites()).toBe(1);
  });

  it("keeps the previous link when the email can't be sent", async () => {
    const pending = await invite(uniqueEmail("falha"));
    failNext.value = true;

    expect(await resendInvite(formData({ memberId: pending.id }))).toEqual({
      error: "Não foi possível enviar o email de convite.",
    });
    const after = await row(pending.id);
    expect(after?.invite_token).toBe(pending.invite_token);
    expect(Date.parse(after!.invite_expires_at)).toBe(Date.parse(pending.invite_expires_at));
  });
});
