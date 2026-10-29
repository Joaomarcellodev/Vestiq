import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization, requireRole } from "@/features/organizations/queries";

export interface ResellerProfile {
  id: string;
  name: string;
  city: string | null;
  avatarUrl: string | null;
  memberSince: string;
  activeOffers: number;
  completedDeals: number;
  /** The viewer's own organization — her profile as the network sees it. */
  isMine: boolean;
}

/**
 * VES-65 — public profile of a reseller of one of the viewer's networks
 * (`get_reseller_profile`, migration 0044). `null` for anyone else — the page
 * answers 404, so the profile of an outsider doesn't even reveal it exists.
 */
export async function getResellerProfile(id: string): Promise<ResellerProfile | null> {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_reseller_profile", { p_org_id: id })
    .maybeSingle();
  // 22P02: not a uuid — same as a profile that doesn't exist.
  if (error?.code === "22P02") return null;
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    city: data.city ?? null,
    avatarUrl: data.avatar_url ?? null,
    memberSince: data.member_since,
    activeOffers: data.active_offers,
    completedDeals: data.completed_deals,
    isMine: data.id === org.id,
  };
}

export async function getFactoryNetworkOverview() {
  const org = await requireRole("FACTORY_ADMIN", "PLATFORM_ADMIN");
  const supabase = await createClient();

  const { data: networks } = await supabase
    .from("factory_networks")
    .select("id, name, status")
    .eq("factory_id", org.id);

  const networkIds = (networks ?? []).map((n) => n.id);

  // Offers and negotiations are private to the resellers (RLS hides them from
  // the factory admin), so the counts come from `factory_network_stats`, which
  // exposes aggregates only (RF-FACTORY-DASH-001).
  const [{ data: members }, { data: networkStats }] = networkIds.length
    ? await Promise.all([
        supabase
          .from("network_members")
          .select(
            "id, status, invited_email, invite_token, invite_expires_at, joined_at, network_id, reseller:organizations!network_members_reseller_id_fkey(name)",
          )
          .in("network_id", networkIds)
          .order("created_at"),
        supabase.from("factory_network_stats").select("*").in("network_id", networkIds),
      ])
    : [{ data: [] }, { data: [] }];

  const sum = (key: keyof NonNullable<typeof networkStats>[number]) =>
    (networkStats ?? []).reduce((total, row) => total + Number(row[key] ?? 0), 0);

  // A pending invite is not a reseller yet: it neither counts as one nor drags
  // the utilisation rate down (VES-76).
  const activeResellers = sum("active_resellers");
  const resellers = activeResellers + sum("disabled_resellers");

  // VES-95: only an invite that can still be accepted offers its link to copy.
  const now = Date.now();
  return {
    factoryName: org.name,
    networks: networks ?? [],
    members: (members ?? []).map((m) => ({
      ...m,
      invitePending: m.status === "INVITED" && Date.parse(m.invite_expires_at) > now,
    })),
    stats: {
      resellers,
      activeResellers,
      pendingInvites: sum("pending_invites"),
      offers: sum("active_offers"),
      totalOffers: sum("total_offers"),
      negotiationsStarted: sum("negotiations_started"),
      negotiationsCompleted: sum("negotiations_completed"),
      utilizationRate: resellers > 0 ? Math.round((activeResellers / resellers) * 100) : 0,
    },
  };
}
