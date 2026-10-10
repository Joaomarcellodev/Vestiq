import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/features/organizations/queries";

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
            "id, status, invited_email, joined_at, network_id, reseller:organizations!network_members_reseller_id_fkey(name)",
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

  return {
    factoryName: org.name,
    networks: networks ?? [],
    members: members ?? [],
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
