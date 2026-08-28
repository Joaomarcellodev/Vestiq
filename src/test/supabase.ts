import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Integration-test helpers against the local Supabase stack.
 * Requires `npm run db:start`. Keys come from `.env.local` (loaded in
 * `src/test/setup.ts`). Tests are skipped when the API is unreachable.
 */

export const SUPABASE_URL =
  process.env.SUPABASE_TEST_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54421";
export const SERVICE_KEY =
  process.env.SUPABASE_TEST_SERVICE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
export const PUBLISHABLE_KEY =
  process.env.SUPABASE_TEST_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

export function admin(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `vestiq-test-${Math.random().toString(36).slice(2)}`,
    },
  });
}

export async function supabaseUp(): Promise<boolean> {
  if (!SERVICE_KEY || !PUBLISHABLE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: PUBLISHABLE_KEY },
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

let seq = 0;
export function uniqueEmail(prefix = "user"): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}@vestiq.test`;
}

/** Create a confirmed auth user and return an authenticated client + ids. */
export async function makeUser(email = uniqueEmail(), password = "test-pass-1234") {
  const a = admin();
  const { data, error } = await a.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");

  const client = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `vestiq-test-${Math.random().toString(36).slice(2)}`,
    },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;

  return { userId: data.user.id, email, client, admin: a };
}

/** Create an organization and attach the given user as an ACTIVE member. */
export async function makeOrg(
  userId: string,
  type: Database["public"]["Enums"]["organization_type"] = "RESELLER",
  role: Database["public"]["Enums"]["member_role"] = "RESELLER",
  name = `Org ${Math.random().toString(36).slice(2, 8)}`,
) {
  const a = admin();
  const { data: org, error } = await a
    .from("organizations")
    .insert({ name, type })
    .select()
    .single();
  if (error || !org) throw error;
  const { error: memErr } = await a
    .from("organization_members")
    .insert({ organization_id: org.id, user_id: userId, role, status: "ACTIVE" });
  if (memErr) throw memErr;
  return org;
}

export async function makeProduct(orgId: string, overrides: Record<string, unknown> = {}) {
  const a = admin();
  const { data: product, error } = await a
    .from("products")
    .insert({
      organization_id: orgId,
      name: `Produto ${Math.random().toString(36).slice(2, 6)}`,
      ...overrides,
    })
    .select()
    .single();
  if (error || !product) throw error;
  return product;
}

export async function makeVariant(
  productId: string,
  overrides: Partial<Database["public"]["Tables"]["product_variants"]["Insert"]> = {},
) {
  const a = admin();
  // organization_id is set by trigger from the product.
  const { data: variant, error } = await a
    .from("product_variants")
    .insert({
      product_id: productId,
      organization_id: "00000000-0000-0000-0000-000000000000",
      retail_price: 100,
      cost_price: 60,
      ...overrides,
    })
    .select()
    .single();
  if (error || !variant) throw error;
  return variant;
}
