import { z } from "zod";

export const publishOfferSchema = z.object({
  variantId: z.string().uuid(),
  networkId: z.string().uuid(),
  quantity: z.coerce.number().int().positive("Quantidade inválida"),
  transferPrice: z.coerce.number().min(0, "Preço inválido"),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const cancelOfferSchema = z.object({ offerId: z.string().uuid() });
