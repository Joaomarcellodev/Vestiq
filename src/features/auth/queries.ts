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
