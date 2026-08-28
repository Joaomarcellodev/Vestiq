import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServerEnv, publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client — BYPASSES Row Level Security.
 *
 * Use ONLY for trusted administrative routines (seeds, platform-admin ops,
 * scheduled jobs). Never expose to the browser (RNF-SEC-004). Every call site
 * must document why RLS bypass is justified.
 */
export function createAdminClient() {
  const { SUPABASE_SECRET_KEY } = getServerEnv();

  if (!SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_SECRET_KEY is not configured — admin client unavailable.");
  }

  return createSupabaseClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
