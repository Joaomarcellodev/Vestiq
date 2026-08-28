"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { categorySchema, productSchema } from "./validation";

export type ActionState = { error?: string; ok?: boolean };

export async function createCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const org = await requireActiveOrganization();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .insert({ organization_id: org.id, name: parsed.data.name });

  if (error) {
    return {
      error: error.code === "23505" ? "Já existe uma categoria com esse nome" : error.message,
    };
  }
  revalidatePath("/produtos");
  return { ok: true };
}

export async function createProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const org = await requireActiveOrganization();

  const raw = {
    name: formData.get("name"),
    brand: formData.get("brand"),
    categoryId: formData.get("categoryId") || "",
    internalSku: formData.get("internalSku"),
    description: formData.get("description"),
    variants: JSON.parse((formData.get("variants") as string) || "[]"),
  };
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const input = parsed.data;

  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from("products")
    .insert({
      organization_id: org.id,
      name: input.name,
      brand: input.brand || null,
      category_id: input.categoryId || null,
      internal_sku: input.internalSku || null,
      description: input.description || null,
    })
    .select("id")
    .single();

  if (error || !product) {
    return {
      error: error?.code === "23505" ? "SKU já utilizado" : (error?.message ?? "Falha ao salvar"),
    };
  }

  const variants =
    input.variants.length > 0
      ? input.variants
      : [{ size: "Único", retailPrice: 0, costPrice: 0, initialStock: 0, color: "", sku: "" }];

  for (const v of variants) {
    const { data: variant, error: vErr } = await supabase
      .from("product_variants")
      .insert({
        organization_id: org.id,
        product_id: product.id,
        size: v.size || null,
        color: v.color || null,
        sku: v.sku || null,
        cost_price: v.costPrice,
        retail_price: v.retailPrice,
      })
      .select("id")
      .single();
    if (vErr)
      return { error: vErr.code === "23505" ? "SKU de variação já utilizado" : vErr.message };

    if (variant && v.initialStock > 0) {
      await supabase.rpc("record_inventory_entry", {
        p_variant_id: variant.id,
        p_quantity: v.initialStock,
        p_note: "Estoque inicial",
      });
    }
  }

  revalidatePath("/produtos");
  redirect(`/produtos/${product.id}`);
}

export async function archiveProduct(id: string): Promise<void> {
  await requireActiveOrganization();
  const supabase = await createClient();
  await supabase.from("products").update({ archived_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/produtos");
}
