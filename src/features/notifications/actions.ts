"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";

export async function markAllNotificationsRead(): Promise<void> {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("organization_id", org.id)
    .is("read_at", null);
  revalidatePath("/", "layout");
}

export async function markNotificationRead(id: string): Promise<void> {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", org.id)
    .is("read_at", null);
  revalidatePath("/", "layout");
}
