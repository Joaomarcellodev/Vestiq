import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria").max(80),
});

export const renameCategorySchema = categorySchema.extend({
  id: z.string().uuid("Categoria inválida"),
});

export const categoryArchiveSchema = z.object({
  id: z.string().uuid("Categoria inválida"),
  archived: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const variantSchema = z.object({
  size: z.string().trim().max(20).optional().or(z.literal("")),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  sku: z.string().trim().max(40).optional().or(z.literal("")),
  costPrice: z.coerce.number().min(0, "Custo inválido").default(0),
  retailPrice: z.coerce.number().min(0, "Preço de venda inválido"),
  initialStock: z.coerce.number().int().min(0).default(0),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do produto").max(120),
  brand: z.string().trim().max(80).optional().or(z.literal("")),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  internalSku: z.string().trim().max(40).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  variants: z.array(variantSchema).default([]),
});

export type ProductInput = z.infer<typeof productSchema>;
export type VariantInput = z.infer<typeof variantSchema>;

/**
 * VES-68 — the variants of the edit form: the same rules as creation, plus the
 * id of an existing variant. "initialStock" only counts for a new one (no id);
 * an existing variant's stock moves through the inventory, never this form.
 */
export const editVariantSchema = variantSchema.extend({
  id: z.string().uuid("Variação inválida").optional().or(z.literal("")),
});

/** BR-CAT-03 — a product always keeps at least one variant. */
export const editVariantsSchema = z
  .array(editVariantSchema)
  .min(1, "O produto precisa de pelo menos uma variação");

export type EditVariantInput = z.infer<typeof editVariantSchema>;

/** Zod issues keyed by field path ("name", "variants.0.retailPrice"), first message wins. */
export function fieldErrorsOf(error: z.ZodError, prefix = ""): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = [prefix, ...issue.path].filter((p) => p !== "").join(".");
    if (key && !(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/** Product photos — Storage bucket `product-images`. */
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PRODUCT_IMAGE_MAX_COUNT = 5;

/** AC-PROD-006-03 — archive a product, publishing the chosen stock to a network. */
export const archiveToOffersSchema = z.object({
  productId: z.string().uuid("Produto inválido"),
  networkId: z.string().uuid("Escolha a rede").optional().or(z.literal("")),
  items: z.array(
    z.object({
      variantId: z.string().uuid(),
      quantity: z.coerce.number().int("Quantidade inválida").min(0, "Quantidade inválida"),
      transferPrice: z.coerce.number().min(0, "Preço inválido"),
    }),
  ),
});
