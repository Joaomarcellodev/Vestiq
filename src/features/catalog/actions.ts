"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import {
  archiveToOffersSchema,
  categoryArchiveSchema,
  categorySchema,
  editVariantsSchema,
  fieldErrorsOf,
  PRODUCT_IMAGE_MAX_COUNT,
  productSchema,
  renameCategorySchema,
} from "./validation";
import { parseWholesaleForm, type WholesaleInput } from "./wholesale";
import { keptImages as keepImages, readImageFiles, removeImages, uploadImages } from "./images";

export type ActionState = {
  error?: string;
  ok?: boolean;
  /** Per-field messages keyed by path — "name", "variants.0.retailPrice" (VES-68). */
  fieldErrors?: Record<string, string>;
};
export type CategoryActionState = ActionState & { category?: { id: string; name: string } };

const DUPLICATE_CATEGORY = "Já existe uma categoria com esse nome";

function revalidateCategories() {
  revalidatePath("/produtos");
  revalidatePath("/produtos/categorias");
}

/**
 * RF-PROD-007 / BR-CAT-13: only a factory sets wholesale conditions. A
 * reseller's form never posts them, and anything posted anyway is ignored.
 */
function readWholesale(
  orgType: string,
  formData: FormData,
): { wholesale: WholesaleInput | null; error?: string } {
  if (orgType !== "FACTORY") return { wholesale: null };
  const parsed = parseWholesaleForm(formData);
  if (!parsed.success) {
    return { wholesale: null, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  return { wholesale: parsed.data };
}

function wholesaleColumns(wholesale: WholesaleInput | null) {
  return wholesale
    ? { min_order_quantity: wholesale.minOrderQuantity, size_grid: wholesale.sizeGrid }
    : {};
}

export async function createCategory(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const org = await requireActiveOrganization();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ organization_id: org.id, name: parsed.data.name })
    .select("id, name")
    .single();

  if (error) {
    return { error: error.code === "23505" ? DUPLICATE_CATEGORY : error.message };
  }
  revalidateCategories();
  return { ok: true, category: data };
}

export async function renameCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireActiveOrganization();
  const parsed = renameCategorySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) {
    return { error: error.code === "23505" ? DUPLICATE_CATEGORY : error.message };
  }
  if (!data?.length) return { error: "Categoria não encontrada" };

  revalidateCategories();
  return { ok: true };
}

/** BR-CAT-10: archiving only hides the category from the pickers; products keep it. */
export async function setCategoryArchived(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActiveOrganization();
  const parsed = categoryArchiveSchema.safeParse({
    id: formData.get("id"),
    archived: formData.get("archived"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ archived_at: parsed.data.archived ? new Date().toISOString() : null })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Categoria não encontrada" };

  revalidateCategories();
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
  const { wholesale, error: wholesaleError } = readWholesale(org.type, formData);
  if (wholesaleError) return { error: wholesaleError };

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
      ...wholesaleColumns(wholesale),
    })
    .select("id")
    .single();

  if (error || !product) {
    return {
      error: error?.code === "23505" ? "SKU já utilizado" : (error?.message ?? "Falha ao salvar"),
    };
  }

  const imageFiles = readImageFiles(formData, PRODUCT_IMAGE_MAX_COUNT);
  if (imageFiles.length > 0) {
    const { urls, error: upErr } = await uploadImages(
      supabase,
      `${org.id}/${product.id}`,
      imageFiles,
    );
    if (upErr) {
      await supabase.from("products").delete().eq("id", product.id);
      return { error: upErr };
    }
    await supabase.from("products").update({ image_urls: urls }).eq("id", product.id);
  }

  // BR-CAT-03 / BR-CAT-14: at least one variant — one per grid size when the
  // factory gave a grid, otherwise a single "Único".
  const blank = { retailPrice: 0, costPrice: 0, initialStock: 0, color: "", sku: "" };
  const variants =
    input.variants.length > 0
      ? input.variants
      : wholesale?.sizeGrid.length
        ? wholesale.sizeGrid.map((size) => ({ ...blank, size }))
        : [{ ...blank, size: "Único" }];

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

/**
 * VES-68 — the variants posted by the edit form, or null when the form sent
 * none (the variants are then left as they are).
 */
function readEditVariants(formData: FormData) {
  const raw = formData.get("variants");
  if (raw === null) return { variants: null };
  let json: unknown;
  try {
    json = JSON.parse(String(raw));
  } catch {
    return { variants: null, error: "Variações inválidas" };
  }
  const parsed = editVariantsSchema.safeParse(json);
  if (!parsed.success) {
    return {
      variants: null,
      error: parsed.error.issues[0]?.message ?? "Variações inválidas",
      fieldErrors: fieldErrorsOf(parsed.error, "variants"),
    };
  }
  return { variants: parsed.data };
}

function updateProductError(message: string, code?: string): string {
  if (code === "23505") {
    return /product_variants/.test(message) ? "SKU de variação já utilizado" : "SKU já utilizado";
  }
  if (/not authorized/i.test(message)) return "Você não tem permissão para esta ação";
  return message;
}

/**
 * Edits the product and its variants (VES-68) in one transaction
 * (`update_product`, ADR-0004): a duplicated SKU or a bad price saves nothing.
 */
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
  const variants = readEditVariants(formData);
  if (!parsed.success || variants.error) {
    return {
      error: parsed.success
        ? variants.error
        : (parsed.error.issues[0]?.message ?? "Dados inválidos"),
      fieldErrors: {
        ...(parsed.success ? {} : fieldErrorsOf(parsed.error)),
        ...variants.fieldErrors,
      },
    };
  }
  const d = parsed.data;
  const { wholesale, error: wholesaleError } = readWholesale(org.type, formData);
  if (wholesaleError) return { error: wholesaleError };

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("products")
    .select("image_urls")
    .eq("id", d.id)
    .maybeSingle();
  if (!current) return { error: "Produto não encontrado" };
  const previousImages = current.image_urls ?? [];

  // Images: kept existing URLs (in the order chosen — the first is the cover)
  // + freshly uploaded files. Only URLs the product already had can be kept.
  const keptImages = keepImages(formData.get("existingImages"), previousImages);
  const imageFiles = readImageFiles(formData, PRODUCT_IMAGE_MAX_COUNT);
  let imageUrls = keptImages;
  let uploaded: string[] = [];
  if (imageFiles.length > 0) {
    const { urls, error: upErr } = await uploadImages(supabase, `${org.id}/${d.id}`, imageFiles);
    if (upErr) return { error: upErr };
    uploaded = urls;
    imageUrls = [...keptImages, ...urls].slice(0, PRODUCT_IMAGE_MAX_COUNT);
  }

  const { error } = await supabase.rpc("update_product", {
    p_product_id: d.id,
    p_product: {
      name: d.name,
      brand: d.brand ?? "",
      category_id: d.categoryId ?? "",
      internal_sku: d.internalSku ?? "",
      description: d.description ?? "",
      image_urls: imageUrls,
      ...(wholesale
        ? { min_order_quantity: wholesale.minOrderQuantity, size_grid: wholesale.sizeGrid }
        : {}),
    },
    p_variants:
      variants.variants?.map((v) => ({
        id: v.id || null,
        size: v.size ?? "",
        color: v.color ?? "",
        sku: v.sku ?? "",
        cost_price: v.costPrice,
        retail_price: v.retailPrice,
        initial_stock: v.id ? 0 : v.initialStock,
      })) ?? undefined,
  });

  if (error) {
    // Nothing was saved: the photos uploaded for this attempt are orphans.
    await removeImages(supabase, uploaded);
    return { error: updateProductError(error.message, error.code) };
  }

  // AC-PROD-002-02: removed photos leave the bucket too. A failure here only
  // leaves an orphan file behind, so it doesn't fail the save.
  await removeImages(
    supabase,
    previousImages.filter((u) => !imageUrls.includes(u)),
  );

  revalidatePath("/produtos");
  revalidatePath(`/produtos/${d.id}`);
  revalidatePath("/fornecedores", "layout");
  redirect(`/produtos/${d.id}?toast=product-updated`);
}

/**
 * AC-PROD-006-03/04 — archives the product and, in the same transaction,
 * publishes the chosen quantities as network offers (`archive_product_to_offers`).
 */
export async function archiveProductToOffers(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActiveOrganization();
  let items: unknown;
  try {
    items = JSON.parse((formData.get("items") as string) || "[]");
  } catch {
    return { error: "Itens inválidos" };
  }
  const parsed = archiveToOffersSchema.safeParse({
    productId: formData.get("productId"),
    networkId: formData.get("networkId") ?? "",
    items,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data: offers, error } = await supabase.rpc("archive_product_to_offers", {
    p_product_id: parsed.data.productId,
    p_network_id: parsed.data.networkId || undefined,
    p_items: parsed.data.items.map((i) => ({
      variant_id: i.variantId,
      quantity: i.quantity,
      transfer_price: i.transferPrice,
    })),
  });
  if (error) {
    return {
      error: /not authorized/i.test(error.message)
        ? "Você não tem permissão para esta ação"
        : error.message,
    };
  }

  revalidatePath("/produtos");
  revalidatePath("/rede");
  redirect(`/produtos?toast=${offers > 0 ? "product-archived-offered" : "product-archived"}`);
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
