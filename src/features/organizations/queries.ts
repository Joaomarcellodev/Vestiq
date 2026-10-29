import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/features/auth/queries";
import type { Database } from "@/types/database";

export type MemberRole = Database["public"]["Enums"]["member_role"];
export type OrganizationType = Database["public"]["Enums"]["organization_type"];

export interface ActiveOrg {
  id: string;
  name: string;
  type: OrganizationType;
  role: MemberRole;
  /** Shown on the reseller's public profile (VES-65). */
  city: string | null;
}

/**
 * The current user's memberships (ACTIVE). Empty array => "aguardando convite".
 * `cache()`d — the layout and every feature query resolve the active org from
 * this within one render, so it must not re-query per call. Keyed on the JWT
 * subject (`requireUserId`), so it doesn't wait for the `getUser()` round-trip.
 */
export const listMyOrganizations = cache(async (): Promise<ActiveOrg[]> => {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, type, city)")
    .eq("user_id", userId)
    .eq("status", "ACTIVE");

  if (error) throw error;

  return (data ?? [])
    .filter((m) => m.organizations)
    .map((m) => ({
      id: m.organizations!.id,
      name: m.organizations!.name,
      type: m.organizations!.type,
      role: m.role,
      city: m.organizations!.city ?? null,
    }));
});

/** Resolve the active organization, or null when the user has none. */
export const getActiveOrganization = cache(async (): Promise<ActiveOrg | null> => {
  const orgs = await listMyOrganizations();
  return orgs[0] ?? null;
});

export interface Suspension {
  organizationName: string;
  reason: string | null;
  suspendedAt: string | null;
}

/**
 * VES-44 — the user's store was suspended by the moderation and she has no
 * other active organization (`get_my_suspension`, migration 0047). Suspended
 * memberships don't count in `listMyOrganizations` (RLS), so this tells a
 * suspended account apart from one still waiting for an invite.
 */
export const getMySuspension = cache(async (): Promise<Suspension | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_suspension").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    organizationName: data.organization_name,
    reason: data.reason ?? null,
    suspendedAt: data.suspended_at ?? null,
  };
});

/**
 * Require an active organization; otherwise redirect to the suspension notice
 * (VES-44) or to the waiting screen.
 */
export async function requireActiveOrganization(): Promise<ActiveOrg> {
  const org = await getActiveOrganization();
  if (!org) redirect((await getMySuspension()) ? "/conta-suspensa" : "/aguardando-convite");
  return org;
}

/** Require the active org to have one of the given roles. */
export async function requireRole(...roles: MemberRole[]): Promise<ActiveOrg> {
  const org = await requireActiveOrganization();
  if (!roles.includes(org.role)) {
    throw new Error("Ação não permitida para o seu perfil");
  }
  return org;
}
