import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";

/**
 * Sends the network invite email (RF-NET-003, AC-NET-003-02) through Supabase
 * Auth, so it goes out on the project's SMTP with the templates in
 * `supabase/templates`. The link lands on `/auth/confirm`, which starts the
 * invitee's session and forwards to `/convite/<token>`.
 *
 * Uses the service-role client: creating an auth user for someone else
 * (`inviteUserByEmail`) is an admin-only Auth operation. Nothing else is
 * read or written with it.
 */
export async function sendInviteEmail(
  email: string,
  inviteToken: string,
): Promise<{ error?: string }> {
  const redirectTo = `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent(
    `/convite/${inviteToken}`,
  )}`;

  let auth;
  try {
    auth = createAdminClient().auth;
  } catch {
    return { error: "O envio de emails não está configurado. Fale com o suporte." };
  }

  const invited = await auth.admin.inviteUserByEmail(email, { redirectTo });
  if (!invited.error) return {};

  // Someone who already has an account can't be "invited" by Auth again —
  // send a one-time access link that leads to the same invite instead.
  if (invited.error.code === "email_exists" || invited.error.status === 422) {
    const link = await auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    });
    if (!link.error) return {};
    if (isRateLimited(link.error)) return { error: RATE_LIMITED };
    console.error("invite magic link failed", link.error);
  } else if (isRateLimited(invited.error)) {
    return { error: RATE_LIMITED };
  } else {
    console.error("invite email failed", invited.error);
  }
  return { error: "Não foi possível enviar o email de convite. Tente novamente em instantes." };
}

const RATE_LIMITED =
  "Muitos emails enviados em pouco tempo. Aguarde alguns minutos e tente de novo — enquanto isso, você pode copiar o link do convite.";

/** Auth caps how often it emails (per address and per hour) — VES-88 resend. */
function isRateLimited(error: { status?: number; code?: string }): boolean {
  return error.status === 429 || error.code === "over_email_send_rate_limit";
}
