"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { credentialsSchema, oauthProviderSchema } from "./validation";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
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
