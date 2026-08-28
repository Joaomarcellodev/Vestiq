import { z } from "zod";

export const saleItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().positive("Quantidade inválida"),
  unitPrice: z.coerce.number().min(0),
});

export const saleSchema = z.object({
  customerId: z.string().uuid().optional().or(z.literal("")),
  paymentMethod: z.enum(["PIX", "CARTAO", "DINHEIRO"]),
  discount: z.coerce.number().min(0).default(0),
  items: z.array(saleItemSchema).min(1, "Adicione ao menos um item"),
});

export const cancelSaleSchema = z.object({
  saleId: z.string().uuid(),
  reason: z.string().trim().min(1, "Informe o motivo do cancelamento").max(500),
});

export type SaleInput = z.infer<typeof saleSchema>;
