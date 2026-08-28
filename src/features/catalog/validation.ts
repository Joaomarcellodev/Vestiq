import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria").max(80),
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
