"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import {
  credentialsSchema,
  newPasswordSchema,
  oauthProviderSchema,
  resetRequestSchema,
} from "./validation";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
};

export type ResetRequestState = {
  ok?: boolean;
  fieldErrors?: Partial<Record<"email", string>>;
};

export type NewPasswordState = {
  error?: string;
  fieldErrors?: Partial<Record<"password" | "confirm", string>>;
};

/** RF-AUTH-001 — sign in with email + password. */
export async function signInWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    remember: formData.get("remember"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        email: flat.email?.[0],
        password: flat.password?.[0],
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Email ou senha incorretos." };
  }

  const next = sanitizeNext(formData.get("next"));
  redirect(next);
}

/** RF-AUTH-001 — sign in with a social provider (Google). */
export async function signInWithOAuth(formData: FormData): Promise<void> {
  const provider = oauthProviderSchema.parse(formData.get("provider"));
  const next = sanitizeNext(formData.get("next"));
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=oauth`);
  }

  redirect(data.url);
}

/**
 * RF-AUTH-005 — send a password-reset email. Always reports success so the
 * response never reveals whether an account exists for the address.
 */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: { email: parsed.error.flatten().fieldErrors.email?.[0] } };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent("/redefinir-senha")}`,
  });

  return { ok: true };
}

/** RF-AUTH-005 — set a new password using the active recovery session. */
export async function updatePassword(
  _prev: NewPasswordState,
  formData: FormData,
): Promise<NewPasswordState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { password: flat.password?.[0], confirm: flat.confirm?.[0] } };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão expirada. Solicite um novo link de redefinição." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error: /different from the old/i.test(error.message)
        ? "A nova senha precisa ser diferente da anterior."
        : "Não foi possível redefinir a senha. Tente novamente.",
    };
  }

  redirect("/dashboard?toast=password-updated");
}

/** RF-AUTH-002 — end the session. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  // "local" — end only this device's session, not every session for the user.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

/** Only allow redirects to internal, absolute paths. */
function sanitizeNext(value: FormDataEntryValue | null): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/dashboard";
}
