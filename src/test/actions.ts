import { expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { admin, uniqueEmail } from "./supabase";
import { RedirectError } from "./next";

/**
 * Server Actions and queries call `createClient()` from `@/lib/supabase/server`,
 * which reads request cookies. In tests we bypass that: `useTestClient()` sets
 * the authenticated client the mock in `setup.ts` hands back.
 */

let current: SupabaseClient<Database> | null = null;

export function useTestClient(client: SupabaseClient<Database>): void {
  current = client;
}
export function clearTestClient(): void {
  current = null;
}
export function _currentClient(): SupabaseClient<Database> {
  if (!current) {
    throw new Error("useTestClient() must be called before invoking a Server Action in tests");
  }
  return current;
}

/** Build a FormData from a plain object (strings, numbers, booleans, File, arrays). */
export function formData(obj: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v instanceof File ? v : String(v));
    } else if (value instanceof File) {
      fd.append(key, value);
    } else {
      fd.append(key, String(value));
    }
  }
  return fd;
}

/**
 * A tiny valid PNG (1×1) for upload tests. Integration tests run in the `node`
 * environment (`// @vitest-environment node`), so `File` is Node's built-in and
 * `undici` fetch inside supabase-js sends the right Content-Type.
 */
export function pngFile(name = "photo.png"): File {
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
  return new File([bytes], name, { type: "image/png" });
}

/** A non-image file for rejection tests. */
export function textFile(name = "notes.txt"): File {
  return new File(["hello world"], name, { type: "text/plain" });
}

/** Asserts the action redirects (throws RedirectError) to a matching path. */
export async function expectRedirect(
  fn: () => Promise<unknown>,
  matcher: RegExp | string,
): Promise<string> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof RedirectError) {
      if (typeof matcher === "string") expect(err.destination).toBe(matcher);
      else expect(err.destination).toMatch(matcher);
      return err.destination;
    }
    throw err;
  }
  throw new Error("expected the action to redirect, but it returned normally");
}

// --- extra factories -------------------------------------------------------

export async function makeCategory(orgId: string, name = `Cat ${uniqueEmail("c")}`) {
  const { data, error } = await admin()
    .from("categories")
    .insert({ organization_id: orgId, name })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("makeCategory failed");
  return data;
}

export async function makeCustomer(orgId: string, overrides: Record<string, unknown> = {}) {
  const { data, error } = await admin()
    .from("customers")
    .insert({
      organization_id: orgId,
      name: `Cliente ${Math.random().toString(36).slice(2, 7)}`,
      ...overrides,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("makeCustomer failed");
  return data;
}

export async function makeNetwork(
  factoryId: string,
  name = `Rede ${Math.random().toString(36).slice(2, 7)}`,
) {
  const { data, error } = await admin()
    .from("factory_networks")
    .insert({ factory_id: factoryId, name })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("makeNetwork failed");
  return data;
}

export async function addMember(
  networkId: string,
  resellerId: string,
  status: "ACTIVE" | "INVITED" | "DISABLED" = "ACTIVE",
) {
  const { data, error } = await admin()
    .from("network_members")
    .insert({
      network_id: networkId,
      reseller_id: resellerId,
      invited_email: `${resellerId}@member.test`,
      status,
      joined_at: status === "ACTIVE" ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("addMember failed");
  return data;
}

export async function inviteMember(networkId: string, email = uniqueEmail("invite")) {
  const { data, error } = await admin()
    .from("network_members")
    .insert({ network_id: networkId, invited_email: email, status: "INVITED" })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("inviteMember failed");
  return data;
}

/** Adds stock to a variant via the entry RPC (needs an authed client for the org). */
export async function stockUp(
  client: SupabaseClient<Database>,
  variantId: string,
  quantity: number,
) {
  const { error } = await client.rpc("record_inventory_entry", {
    p_variant_id: variantId,
    p_quantity: quantity,
  });
  if (error) throw error;
}
