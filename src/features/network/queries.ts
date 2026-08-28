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
  const { data: members } = networkIds.length
    ? await supabase
        .from("network_members")
        .select("id, status, invited_email, joined_at, network_id, organizations(name)")
        .in("network_id", networkIds)
    : { data: [] };

  const { data: offers } = networkIds.length
    ? await supabase.from("offers").select("id").in("network_id", networkIds)
    : { data: [] };

  const { data: negotiations } = networkIds.length
    ? await supabase.from("negotiations").select("status").in("network_id", networkIds)
    : { data: [] };

  const activeMembers = (members ?? []).filter((m) => m.status === "ACTIVE").length;
  const negs = negotiations ?? [];

  return {
    factoryName: org.name,
    networks: networks ?? [],
    members: members ?? [],
    stats: {
      resellers: (members ?? []).length,
      activeResellers: activeMembers,
      offers: (offers ?? []).length,
      negotiationsStarted: negs.length,
      negotiationsCompleted: negs.filter((n) => n.status === "COMPLETED").length,
      utilizationRate:
        (members ?? []).length > 0 ? Math.round((activeMembers / (members ?? []).length) * 100) : 0,
    },
  };
}
