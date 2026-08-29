"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/features/auth/queries";
import { requireRole } from "@/features/organizations/queries";
import { acceptInviteSchema, createNetworkSchema, inviteResellerSchema } from "./validation";

export type ActionState = { error?: string; ok?: boolean };

export async function createNetwork(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const org = await requireRole("FACTORY_ADMIN", "PLATFORM_ADMIN");
  const parsed = createNetworkSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("factory_networks")
    .insert({ factory_id: org.id, name: parsed.data.name });
  if (error) return { error: error.message };

  revalidatePath("/rede-fabrica");
  return { ok: true };
}

export async function inviteReseller(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("FACTORY_ADMIN", "PLATFORM_ADMIN");
  const parsed = inviteResellerSchema.safeParse({
    networkId: formData.get("networkId"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("network_members").insert({
    network_id: parsed.data.networkId,
    invited_email: parsed.data.email,
    status: "INVITED",
  });
  if (error) {
    return { error: error.code === "23505" ? "Essa revendedora já foi convidada" : error.message };
  }

  revalidatePath("/rede-fabrica");
  return { ok: true };
}

export async function acceptInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = acceptInviteSchema.safeParse({
    token: formData.get("token"),
    resellerName: formData.get("resellerName"),
  });
  if (!parsed.success) return { error: "Convite inválido" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_network_invite", {
    p_token: parsed.data.token,
    p_reseller_name: parsed.data.resellerName || undefined,
  });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  redirect("/dashboard");
}

/**
 * RF-NET-007 — toggle a reseller's access to the network with a single
 * on/off control. `active=true` (re)activates, `active=false` disables.
 */
export async function setMemberActive(formData: FormData): Promise<void> {
  await requireRole("FACTORY_ADMIN", "PLATFORM_ADMIN");
  const memberId = formData.get("memberId") as string;
  const active = formData.get("active") === "true";
  const supabase = await createClient();

  const patch: { status: "ACTIVE" | "DISABLED"; joined_at?: string } = {
    status: active ? "ACTIVE" : "DISABLED",
  };
  if (active) patch.joined_at = new Date().toISOString();

  await supabase.from("network_members").update(patch).eq("id", memberId);
  revalidatePath("/rede-fabrica");
}
