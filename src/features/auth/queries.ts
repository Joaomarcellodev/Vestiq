import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Current authenticated user, or null. Wrapped in `cache()` so the layout,
 * page and feature queries that all call it during one render share a single
 * round-trip instead of hitting the Auth server several times.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Id of the signed-in user, read from the verified access token. The project
 * signs JWTs with an asymmetric key (ES256), so `getClaims()` checks the
 * signature locally against a process-wide cached JWKS — no round-trip to the
 * Auth server. Lookups that only need the id (the org membership) use this and
 * stop waiting on `getUser()`; with a legacy HS256 project it falls back to
 * `getUser()` on its own.
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

export async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) {
    redirect("/login");
  }
  return id;
}

/**
 * RF-AUTH-003 — require an authenticated session. Redirects to /login otherwise.
 * Use at the top of every protected Server Component / Action.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
