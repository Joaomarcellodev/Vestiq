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

export const MESSAGE_MAX_LENGTH = 1000;

export const sendMessageSchema = z.object({
  negotiationId: z.string().uuid("Negociação inválida"),
  body: z
    .string()
    .trim()
    .min(1, "Escreva uma mensagem")
    .max(
      MESSAGE_MAX_LENGTH,
      `A mensagem pode ter até ${MESSAGE_MAX_LENGTH.toLocaleString("pt-BR")} caracteres`,
    ),
});
