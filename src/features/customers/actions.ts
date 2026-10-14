"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrorsOf, z } from "@/lib/zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { customerSchema } from "./validation";

export type ActionState = {
  error?: string;
  /** Per-field messages ("phone", "document") shown next to the field (VES-80). */
  fieldErrors?: Record<string, string>;
};

function payload(formData: FormData) {
  return {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    document: formData.get("document"),
    notes: formData.get("notes"),
  };
}

export async function createCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const org = await requireActiveOrganization();
  const parsed = customerSchema.safeParse(payload(formData));
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
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
    return { error: error.code === "23505" ? "Cliente com este CPF já existe" : error.message };
  }
  revalidatePath("/clientes");
  redirect("/clientes?toast=customer-created");
}

export async function updateCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireActiveOrganization();
  const id = z.string().uuid().safeParse(formData.get("id"));
  const parsed = customerSchema.safeParse(payload(formData));
  if (!id.success || !parsed.success) {
    if (parsed.success) return { error: "Cliente inválido" };
    return { error: parsed.error.issues[0]?.message, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: d.name,
      email: d.email || null,
      phone: d.phone || null,
      document: d.document || null,
      notes: d.notes || null,
    })
    .eq("id", id.data);

  if (error) {
    return { error: error.code === "23505" ? "Cliente com este CPF já existe" : error.message };
  }
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id.data}`);
  redirect(`/clientes/${id.data}?toast=customer-updated`);
}

export async function archiveCustomer(formData: FormData): Promise<void> {
  await requireActiveOrganization();
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  // RLS doesn't raise on rows it hides — an update that touched nothing failed too.
  if (error || !data?.length) redirect(`/clientes/${id}?toast=customer-archive-failed`);
  revalidatePath("/clientes");
  redirect("/clientes?toast=customer-archived");
}

export async function unarchiveCustomer(formData: FormData): Promise<void> {
  await requireActiveOrganization();
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ archived_at: null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) redirect("/clientes?scope=archived&toast=customer-unarchive-failed");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}?toast=customer-unarchived`);
}
