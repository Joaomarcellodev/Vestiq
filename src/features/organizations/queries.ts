import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/queries";
import type { Database } from "@/types/database";

export type MemberRole = Database["public"]["Enums"]["member_role"];
export type OrganizationType = Database["public"]["Enums"]["organization_type"];

export interface ActiveOrg {
  id: string;
  name: string;
  type: OrganizationType;
  role: MemberRole;
}

/**
 * The current user's memberships (ACTIVE). Empty array => "aguardando convite".
 */
export async function listMyOrganizations(): Promise<ActiveOrg[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, type)")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE");

  if (error) throw error;

  return (data ?? [])
    .filter((m) => m.organizations)
    .map((m) => ({
      id: m.organizations!.id,
      name: m.organizations!.name,
      type: m.organizations!.type,
      role: m.role,
    }));
}

/** Resolve the active organization, or null when the user has none. */
export async function getActiveOrganization(): Promise<ActiveOrg | null> {
  const orgs = await listMyOrganizations();
  return orgs[0] ?? null;
}

/** Require an active organization; redirect to the waiting screen otherwise. */
export async function requireActiveOrganization(): Promise<ActiveOrg> {
  const org = await getActiveOrganization();
  if (!org) redirect("/aguardando-convite");
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
