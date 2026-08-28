import { z } from "zod";

export const openNegotiationSchema = z.object({
  offerId: z.string().uuid(),
  quantity: z.coerce.number().int().positive("Quantidade inválida"),
  amount: z.coerce.number().positive("Informe um valor válido"),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const negotiationActionSchema = z.object({
  negotiationId: z.string().uuid(),
  action: z.enum(["accept", "reject", "cancel", "message", "complete"]),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});
