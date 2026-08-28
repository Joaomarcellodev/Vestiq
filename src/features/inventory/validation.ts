import { z } from "zod";

export const inventoryEntrySchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().positive("Quantidade deve ser maior que zero"),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const inventoryAdjustSchema = z.object({
  variantId: z.string().uuid(),
  delta: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, "Informe um ajuste diferente de zero"),
  note: z.string().trim().min(1, "Informe o motivo do ajuste").max(500),
});
