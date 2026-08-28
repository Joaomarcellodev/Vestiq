"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { inventoryAdjustSchema, inventoryEntrySchema } from "./validation";

export type ActionState = { error?: string; ok?: boolean };

export async function recordEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireActiveOrganization();
  const parsed = inventoryEntrySchema.safeParse({
    variantId: formData.get("variantId"),
    quantity: formData.get("quantity"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_inventory_entry", {
    p_variant_id: parsed.data.variantId,
    p_quantity: parsed.data.quantity,
    p_note: parsed.data.note || undefined,
  });
  if (error) return { error: error.message };

  revalidatePath("/produtos");
  revalidatePath("/estoque");
  return { ok: true };
}

export async function adjustStock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireActiveOrganization();
  const parsed = inventoryAdjustSchema.safeParse({
    variantId: formData.get("variantId"),
    delta: formData.get("delta"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("adjust_inventory", {
    p_variant_id: parsed.data.variantId,
    p_delta: parsed.data.delta,
    p_note: parsed.data.note,
  });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  revalidatePath("/produtos");
  revalidatePath("/estoque");
  return { ok: true };
}
