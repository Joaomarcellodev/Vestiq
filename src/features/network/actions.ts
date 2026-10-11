"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/queries";
import { requireRole } from "@/features/organizations/queries";
import {
  acceptInviteSchema,
  createNetworkSchema,
  inviteResellerSchema,
  inviteSignupSchema,
} from "./validation";
import { sendInviteEmail } from "./invite-email";
import { claimInviteAccount } from "./invite-signup";
import { needsPassword } from "./invite-password";
import { newPasswordSchema } from "@/features/auth/validation";

export type ActionState = { error?: string; ok?: boolean };

export async function createNetwork(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const org = await requireRole("FACTORY_ADMIN", "PLATFORM_ADMIN");
  const parsed = createNetworkSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("factory_networks")
    .insert({ factory_id: org.id, name: parsed.data.name });
  if (error) return { error: error.message };

  revalidatePath("/rede-fabrica");
  return { ok: true };
}

export async function inviteReseller(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("FACTORY_ADMIN", "PLATFORM_ADMIN");
  const parsed = inviteResellerSchema.safeParse({
    networkId: formData.get("networkId"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();

  // VES-76: `invited_email` is citext, so this match ignores case. An accepted
  // invite keeps the address it was sent to, which is the reseller's login.
  const { data: existing, error: lookupError } = await supabase
    .from("network_members")
    .select("status, invite_expires_at")
    .eq("network_id", parsed.data.networkId)
    .eq("invited_email", parsed.data.email);
  if (lookupError) return { error: lookupError.message };
  const rows = existing ?? [];
  if (rows.some((m) => m.status === "ACTIVE")) {
    return { error: "Essa revendedora já faz parte da rede" };
  }
  if (rows.some((m) => m.status === "DISABLED")) {
    return { error: "Essa revendedora está desativada na rede — reative-a na lista de membros" };
  }
  // An expired invite can no longer be accepted, so it does not block a new one.
  const now = Date.now();
  if (rows.some((m) => m.status === "INVITED" && Date.parse(m.invite_expires_at) > now)) {
    return { error: "Já existe um convite pendente para esse e-mail" };
  }

  const { data: invite, error } = await supabase
    .from("network_members")
    .insert({
      network_id: parsed.data.networkId,
      invited_email: parsed.data.email,
      status: "INVITED",
    })
    .select("id, invite_token")
    .single();
  if (error) {
    return { error: error.code === "23505" ? "Essa revendedora já foi convidada" : error.message };
  }

  // AC-NET-003-03: an invite nobody was told about is useless — undo it so the
  // admin can simply try again.
  const sent = await sendInviteEmail(parsed.data.email, invite.invite_token);
  if (sent.error) {
    await supabase.from("network_members").delete().eq("id", invite.id);
    return { error: sent.error };
  }

  revalidatePath("/rede-fabrica");
  return { ok: true };
}

export async function acceptInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = acceptInviteSchema.safeParse({
    token: formData.get("token"),
    resellerName: formData.get("resellerName"),
  });
  if (!parsed.success) return { error: "Convite inválido" };

  const supabase = await createClient();

  if (needsPassword(user)) {
    const password = newPasswordSchema.safeParse({
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });
    if (!password.success) {
      return { error: password.error.issues[0]?.message ?? "Senha inválida" };
    }
    const { error } = await supabase.auth.updateUser({
      password: password.data.password,
      data: { password_set: true },
    });
    if (error) return { error: "Não foi possível salvar a senha. Tente novamente." };
  }

  const { error } = await supabase.rpc("accept_network_invite", {
    p_token: parsed.data.token,
    p_reseller_name: parsed.data.resellerName || undefined,
  });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  redirect("/dashboard?toast=network-joined");
}

export type InviteSignupState = {
  error?: string;
  fieldErrors?: Partial<Record<"resellerName" | "password" | "confirm", string>>;
};

/**
 * VES-95 — someone without a session opens the invite link: create her
 * account for the invited email, sign her in and accept the invite, in one go.
 * The email is read from the invite, never from the form.
 */
export async function signUpFromInvite(
  _prev: InviteSignupState,
  formData: FormData,
): Promise<InviteSignupState> {
  const parsed = inviteSignupSchema.safeParse({
    token: formData.get("token"),
    resellerName: formData.get("resellerName"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    if (flat.token) return { error: "Convite inválido" };
    return {
      fieldErrors: {
        resellerName: flat.resellerName?.[0],
        password: flat.password?.[0],
        confirm: flat.confirm?.[0],
      },
    };
  }
  const { token, resellerName, password } = parsed.data;

  const supabase = await createClient();
  const { data: invite } = await supabase
    .rpc("get_network_invite", { p_token: token })
    .maybeSingle();
  if (!invite || invite.state !== "PENDING") {
    return { error: "Este convite não está mais disponível. Peça um novo convite à fábrica." };
  }

  const claimed = await claimInviteAccount(token, invite.email, password);
  if (claimed.error) return { error: claimed.error };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });
  if (signInError) {
    return { error: "Sua conta foi criada, mas não conseguimos entrar. Entre com email e senha." };
  }

  const { error } = await supabase.rpc("accept_network_invite", {
    p_token: token,
    p_reseller_name: resellerName,
  });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  redirect("/dashboard?toast=network-joined");
}

/** Same lifetime as the `invite_expires_at` column default. */
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * VES-88 — withdraw an invite that wasn't accepted yet. Deleting the row
 * invalidates its token and drops it from the list and the indicators. Only an
 * `INVITED` row goes: one accepted meanwhile is a member now.
 */
export async function cancelInvite(formData: FormData): Promise<ActionState> {
  await requireRole("FACTORY_ADMIN", "PLATFORM_ADMIN");
  const memberId = formData.get("memberId") as string;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("network_members")
    .delete()
    .eq("id", memberId)
    .eq("status", "INVITED")
    .select("id");
  // RLS doesn't raise on rows it hides — a delete that touched nothing failed too.
  if (error || !data?.length) {
    return { error: "Não foi possível cancelar o convite. Atualize a página e tente novamente." };
  }
  revalidatePath("/rede-fabrica");
  return {};
}

/**
 * VES-88 — send the invite again with a fresh token and a new 14-day window:
 * the previous link stops working and an expired invite becomes valid again.
 * If the email can't go out, the previous token is restored.
 */
export async function resendInvite(formData: FormData): Promise<ActionState> {
  await requireRole("FACTORY_ADMIN", "PLATFORM_ADMIN");
  const memberId = formData.get("memberId") as string;
  const supabase = await createClient();
  const failed = {
    error: "Não foi possível reenviar o convite. Atualize a página e tente novamente.",
  };

  const { data: current } = await supabase
    .from("network_members")
    .select("invited_email, invite_token, invite_expires_at")
    .eq("id", memberId)
    .eq("status", "INVITED")
    .maybeSingle();
  if (!current) return failed;

  const { data: renewed, error } = await supabase
    .from("network_members")
    .update({
      invite_token: crypto.randomUUID(),
      invite_expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    })
    .eq("id", memberId)
    .eq("status", "INVITED")
    .select("invite_token")
    .maybeSingle();
  if (error || !renewed) return failed;

  const sent = await sendInviteEmail(current.invited_email, renewed.invite_token);
  if (sent.error) {
    await supabase
      .from("network_members")
      .update({ invite_token: current.invite_token, invite_expires_at: current.invite_expires_at })
      .eq("id", memberId);
    return { error: sent.error };
  }

  revalidatePath("/rede-fabrica");
  return { ok: true };
}

/**
 * RF-NET-007 — toggle a reseller's access to the network with a single
 * on/off control. `active=true` (re)activates, `active=false` disables.
 */
export async function setMemberActive(formData: FormData): Promise<ActionState> {
  await requireRole("FACTORY_ADMIN", "PLATFORM_ADMIN");
  const memberId = formData.get("memberId") as string;
  const active = formData.get("active") === "true";
  const supabase = await createClient();

  const patch: { status: "ACTIVE" | "DISABLED"; joined_at?: string } = {
    status: active ? "ACTIVE" : "DISABLED",
  };
  if (active) patch.joined_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("network_members")
    .update(patch)
    .eq("id", memberId)
    .select("id");
  // RLS doesn't raise on rows it hides — an update that touched nothing failed too.
  if (error || !data?.length) {
    return { error: "Não foi possível alterar o acesso da revendedora. Tente novamente." };
  }
  revalidatePath("/rede-fabrica");
  return {};
}
