import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

const { signUpFromInvite } = await import("./actions");

/** A browser with no session — the invitee opening the link. */
function anon() {
  return createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const up = await supabaseUp();
const d = up ? describe : describe.skip;

d("signup from the invite link (VES-95)", () => {
  let networkId: string;

  async function invite(email: string, patch: Record<string, unknown> = {}) {
    const { data, error } = await admin()
      .from("network_members")
      .insert({ network_id: networkId, invited_email: email, status: "INVITED", ...patch })
      .select("invite_token")
      .single();
    if (error || !data) throw error ?? new Error("invite failed");
    return data.invite_token;
  }

  const signup = (token: string, password = "senha-forte-1") =>
    signUpFromInvite(
      {},
      formData({ token, resellerName: "Loja da Convidada", password, confirm: password }),
    );

  beforeEach(async () => {
    const factory = await makeUser();
    const org = await makeOrg(factory.userId, "FACTORY", "FACTORY_ADMIN", "Fábrica Cadastro");
    networkId = (await makeNetwork(org.id, "Rede Cadastro")).id;
    setTestClient(anon());
  });
  afterEach(() => clearTestClient());

  it("shows the invite to whoever holds the token, without a session", async () => {
    const email = uniqueEmail("ver");
    const token = await invite(email);

    const { data } = await anon().rpc("get_network_invite", { p_token: token }).maybeSingle();
    expect(data).toEqual({
      email,
      network_name: "Rede Cadastro",
      factory_name: "Fábrica Cadastro",
      state: "PENDING",
      has_account: false,
    });

    const unknown = await anon()
      .rpc("get_network_invite", { p_token: crypto.randomUUID() })
      .maybeSingle();
    expect(unknown.data).toBeNull();
  });

  it("tells expired and used invites apart", async () => {
    const expired = await invite(uniqueEmail("exp"), {
      invite_expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    const used = await invite(uniqueEmail("usado"), { status: "DISABLED" });

    const state = async (token: string) =>
      (await anon().rpc("get_network_invite", { p_token: token }).maybeSingle()).data?.state;
    expect(await state(expired)).toBe("EXPIRED");
    expect(await state(used)).toBe("USED");

    expect(await signup(expired)).toEqual({
      error: "Este convite não está mais disponível. Peça um novo convite à fábrica.",
    });
    expect(await signup(used)).toEqual({
      error: "Este convite não está mais disponível. Peça um novo convite à fábrica.",
    });
  });

  it("keeps the account lookup away from the browser", async () => {
    const token = await invite(uniqueEmail("rpc"));
    const { error } = await anon().rpc("invite_signup_user_id", { p_token: token });
    expect(error?.code).toBe("42501");
  });

  it("creates the account, accepts the invite and lands on the dashboard", async () => {
    const email = uniqueEmail("nova");
    const token = await invite(email);

    await expectRedirect(() => signup(token), "/dashboard?toast=network-joined");

    const fresh = anon();
    const signIn = await fresh.auth.signInWithPassword({ email, password: "senha-forte-1" });
    expect(signIn.error).toBeNull();
    const { data: member } = await admin()
      .from("network_members")
      .select("status, reseller:organizations!network_members_reseller_id_fkey(name)")
      .eq("invite_token", token)
      .single();
    expect(member).toEqual({ status: "ACTIVE", reseller: { name: "Loja da Convidada" } });
  });

  it("claims the password-less account the invite email created", async () => {
    const email = uniqueEmail("pelo-email");
    const token = await invite(email);
    const invited = await admin().auth.admin.inviteUserByEmail(email);
    expect(invited.error).toBeNull();

    await expectRedirect(() => signup(token), /toast=network-joined/);

    const signIn = await anon().auth.signInWithPassword({ email, password: "senha-forte-1" });
    expect(signIn.data.user?.id).toBe(invited.data.user?.id);
    expect(signIn.data.user?.user_metadata.password_set).toBe(true);
  });

  it("won't claim an account another network's open invite created", async () => {
    // Factory A invited her first: the invite email created her account, still
    // without a password. Factory B, holding its own token, must not set one.
    const otherFactory = await makeUser();
    const otherOrg = await makeOrg(otherFactory.userId, "FACTORY", "FACTORY_ADMIN");
    const otherNetwork = await makeNetwork(otherOrg.id);
    const email = uniqueEmail("de-outra-rede");
    await admin()
      .from("network_members")
      .insert({ network_id: otherNetwork.id, invited_email: email, status: "INVITED" });
    expect((await admin().auth.admin.inviteUserByEmail(email)).error).toBeNull();
    const token = await invite(email);

    const { data } = await anon().rpc("get_network_invite", { p_token: token }).maybeSingle();
    expect(data?.has_account).toBe(true);

    expect(await signup(token, "senha-da-fabrica")).toEqual({
      error: "Você já tem uma conta com esse email. Entre para aceitar o convite.",
    });
    const taken = await anon().auth.signInWithPassword({ email, password: "senha-da-fabrica" });
    expect(taken.error).not.toBeNull();
  });

  it("won't claim a password-less account that already has an organization", async () => {
    const email = uniqueEmail("com-loja");
    const invited = await admin().auth.admin.inviteUserByEmail(email);
    expect(invited.error).toBeNull();
    await makeOrg(invited.data.user!.id);
    const token = await invite(email);

    const { data } = await anon().rpc("get_network_invite", { p_token: token }).maybeSingle();
    expect(data?.has_account).toBe(true);

    expect(await signup(token, "senha-da-fabrica")).toEqual({
      error: "Você já tem uma conta com esse email. Entre para aceitar o convite.",
    });
    const taken = await anon().auth.signInWithPassword({ email, password: "senha-da-fabrica" });
    expect(taken.error).not.toBeNull();
  });

  it("never overwrites the password of an existing account", async () => {
    const existing = await makeUser(uniqueEmail("ja-tem"));
    const token = await invite(existing.email);

    const { data } = await anon().rpc("get_network_invite", { p_token: token }).maybeSingle();
    expect(data?.has_account).toBe(true);

    expect(await signup(token, "tentativa-123")).toEqual({
      error: "Você já tem uma conta com esse email. Entre para aceitar o convite.",
    });
    const old = await anon().auth.signInWithPassword({
      email: existing.email,
      password: "test-pass-1234",
    });
    expect(old.error).toBeNull();
  });

  it("reports form errors per field", async () => {
    const token = await invite(uniqueEmail("campos"));
    expect(
      await signUpFromInvite(
        {},
        formData({ token, resellerName: "", password: "curta", confirm: "outra" }),
      ),
    ).toEqual({
      fieldErrors: {
        resellerName: "Informe o nome da sua loja.",
        password: "A senha deve ter ao menos 8 caracteres.",
        confirm: "As senhas não coincidem.",
      },
    });
  });
});
