import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * VES-95 — gives the invited email an account with the chosen password, so
 * the invitee can sign in right after.
 *
 * Uses the service-role client: creating a user, or setting the password of
 * the password-less one the invite email created (`inviteUserByEmail`), are
 * admin-only Auth operations. An account that already has a password is never
 * touched — its owner signs in to accept instead.
 *
 * The invite token is the proof of the email: it only goes to the invitee
 * (or the factory that issued it), the same trust the invite email link has.
 */
export async function claimInviteAccount(
  token: string,
  email: string,
  password: string,
): Promise<{ error?: string }> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "O cadastro pelo convite não está configurado. Fale com o suporte." };
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { password_set: true },
  });
  if (!created.error) return {};

  if (created.error.code !== "email_exists" && created.error.status !== 422) {
    console.error("invite signup failed", created.error);
    return { error: "Não foi possível criar sua conta. Tente novamente em instantes." };
  }

  const { data: userId, error } = await admin.rpc("invite_signup_user_id", { p_token: token });
  if (error) {
    console.error("invite signup lookup failed", error);
    return { error: "Não foi possível criar sua conta. Tente novamente em instantes." };
  }
  if (!userId)
    return { error: "Você já tem uma conta com esse email. Entre para aceitar o convite." };

  const updated = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    user_metadata: { password_set: true },
  });
  if (updated.error) {
    console.error("invite signup password failed", updated.error);
    return { error: "Não foi possível criar sua conta. Tente novamente em instantes." };
  }
  return {};
}
