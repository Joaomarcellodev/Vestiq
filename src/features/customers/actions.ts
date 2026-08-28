"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { customerSchema } from "./validation";

export type ActionState = { error?: string };

export async function createCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const org = await requireActiveOrganization();
  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    document: formData.get("document"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    organization_id: org.id,
    name: d.name,
    email: d.email || null,
    phone: d.phone || null,
    document: d.document || null,
    notes: d.notes || null,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "Cliente com este CPF já existe" : error.message,
    };
  }
  revalidatePath("/clientes");
  redirect("/clientes");
}
