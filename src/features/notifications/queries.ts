import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/features/organizations/queries";
import type { Database } from "@/types/database";

export type NotificationType = Database["public"]["Enums"]["notification_type"];

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function listNotifications(limit = 20): Promise<AppNotification[]> {
  const org = await getActiveOrganization();
  if (!org) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));
}

/** Unread count for the active org. `cache()`d for the layout + bell. */
export const countUnreadNotifications = cache(async (): Promise<number> => {
  const org = await getActiveOrganization();
  if (!org) return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
});
