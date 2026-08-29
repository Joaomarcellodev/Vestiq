"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveOrganization } from "@/features/organizations/queries";
import type { Database } from "@/types/database";
import {
  categorySchema,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MAX_COUNT,
  PRODUCT_IMAGE_TYPES,
  productSchema,
} from "./validation";

export type ActionState = { error?: string; ok?: boolean };

const IMAGE_BUCKET = "product-images";

/**
 * Uploads the picked files to `product-images/{orgId}/{productId}/…` and
 * returns their public URLs. Returns an error string instead of throwing so
 * the caller can surface it in the form.
 */
async function uploadProductImages(
  supabase: SupabaseClient<Database>,
  orgId: string,
  productId: string,
  files: File[],
): Promise<{ urls: string[]; error?: string }> {
  const urls: string[] = [];
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (!PRODUCT_IMAGE_TYPES.includes(file.type)) {
      return { urls, error: "Envie imagens JPG, PNG ou WebP." };
    }
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      return { urls, error: "Cada imagem deve ter no máximo 5 MB." };
    }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${orgId}/${productId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { urls, error: `Falha no upload da imagem: ${error.message}` };
    urls.push(supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return { urls };
}

function readImageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((v): v is File => v instanceof File && v.size > 0)
    .slice(0, PRODUCT_IMAGE_MAX_COUNT);
}

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

  const imageFiles = readImageFiles(formData);
  if (imageFiles.length > 0) {
    const { urls, error: upErr } = await uploadProductImages(
      supabase,
      org.id,
      product.id,
      imageFiles,
    );
    if (upErr) {
      await supabase.from("products").delete().eq("id", product.id);
      return { error: upErr };
    }
    await supabase.from("products").update({ image_urls: urls }).eq("id", product.id);
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
    if (vErr) {
      return { error: vErr.code === "23505" ? "SKU de variação já utilizado" : vErr.message };
    }

    if (variant && v.initialStock > 0) {
      await supabase.rpc("record_inventory_entry", {
        p_variant_id: variant.id,
        p_quantity: v.initialStock,
        p_note: "Estoque inicial",
      });
    }
  }

  revalidatePath("/produtos");
  redirect(`/produtos/${product.id}?toast=product-created`);
}

const updateProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Informe o nome do produto").max(120),
  brand: z.string().trim().max(80).optional().or(z.literal("")),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  internalSku: z.string().trim().max(40).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function updateProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const org = await requireActiveOrganization();
  const parsed = updateProductSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    brand: formData.get("brand"),
    categoryId: formData.get("categoryId") || "",
    internalSku: formData.get("internalSku"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;

  const supabase = await createClient();

  // Images: kept existing URLs + freshly uploaded files.
  let keptImages: string[] = [];
  try {
    const raw = formData.get("existingImages");
    keptImages = raw ? (JSON.parse(raw as string) as string[]) : [];
  } catch {
    keptImages = [];
  }
  const imageFiles = readImageFiles(formData);
  let imageUrls = keptImages;
  if (imageFiles.length > 0) {
    const { urls, error: upErr } = await uploadProductImages(supabase, org.id, d.id, imageFiles);
    if (upErr) return { error: upErr };
    imageUrls = [...keptImages, ...urls].slice(0, PRODUCT_IMAGE_MAX_COUNT);
  }

  const { error } = await supabase
    .from("products")
    .update({
      name: d.name,
      brand: d.brand || null,
      category_id: d.categoryId || null,
      internal_sku: d.internalSku || null,
      description: d.description || null,
      image_urls: imageUrls,
    })
    .eq("id", d.id);

  if (error) {
    return { error: error.code === "23505" ? "SKU já utilizado" : error.message };
  }
  revalidatePath("/produtos");
  revalidatePath(`/produtos/${d.id}`);
  redirect(`/produtos/${d.id}?toast=product-updated`);
}

export async function archiveProduct(formData: FormData): Promise<void> {
  await requireActiveOrganization();
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase.from("products").update({ archived_at: now }).eq("id", id);
  await supabase.from("product_variants").update({ archived_at: now }).eq("product_id", id);
  revalidatePath("/produtos");
  redirect("/produtos?toast=product-archived");
}

export async function unarchiveProduct(formData: FormData): Promise<void> {
  await requireActiveOrganization();
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("products").update({ archived_at: null }).eq("id", id);
  await supabase.from("product_variants").update({ archived_at: null }).eq("product_id", id);
  revalidatePath("/produtos");
  revalidatePath(`/produtos/${id}`);
  redirect(`/produtos/${id}?toast=product-unarchived`);
}
