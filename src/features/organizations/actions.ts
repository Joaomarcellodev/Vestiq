"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rpcErrorMessage } from "@/lib/supabase/errors";
import { requireActiveOrganization } from "./queries";
import { organizationCitySchema } from "./validation";

export type OrganizationState = { error?: string; ok?: string };

/** VES-65 — the city shown on the reseller's public profile. Empty clears it. */
export async function updateOrganizationCity(
  _prev: OrganizationState,
  formData: FormData,
): Promise<OrganizationState> {
  const org = await requireActiveOrganization();
  const parsed = organizationCitySchema.safeParse({ city: formData.get("city") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_organization_city", {
    p_org_id: org.id,
    p_city: parsed.data.city,
  });
  if (error) return { error: rpcErrorMessage(error) };

  revalidatePath("/perfil");
  return { ok: "Cidade da loja atualizada." };
}
