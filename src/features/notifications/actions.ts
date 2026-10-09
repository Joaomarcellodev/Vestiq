"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";

export type MarkReadResult = { error?: string };

const FAILED = "Não foi possível marcar as notificações como lidas.";

export async function markAllNotificationsRead(): Promise<MarkReadResult> {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("organization_id", org.id)
    .is("read_at", null);
  if (error) return { error: FAILED };
  revalidatePath("/", "layout");
  return {};
}

export async function markNotificationRead(id: string): Promise<MarkReadResult> {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", org.id)
    .is("read_at", null);
  if (error) return { error: FAILED };
  revalidatePath("/", "layout");
  return {};
}
