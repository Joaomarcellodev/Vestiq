import type { User } from "@supabase/supabase-js";

/**
 * AC-NET-004-04 — an account created by the invite email (`inviteUserByEmail`)
 * has no password yet; it signs in only through that link. It sets one when
 * accepting, and `password_set` marks it done.
 */
export function needsPassword(user: Pick<User, "invited_at" | "user_metadata">): boolean {
  return Boolean(user.invited_at) && user.user_metadata?.password_set !== true;
}
