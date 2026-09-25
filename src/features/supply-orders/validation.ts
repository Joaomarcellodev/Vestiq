import { z } from "zod";
import { MAX_QUANTITY, MAX_VARIANTS } from "./order-math";

const note = z.string().trim().max(1000, "O texto pode ter até 1.000 caracteres").optional();

export const placeSupplyOrderSchema = z.object({
  supplierId: z.string().uuid("Fornecedor inválido"),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid("Item inválido"),
        quantity: z.coerce
          .number()
          .int("Informe peças inteiras")
          .min(1, "Quantidade inválida no item")
          .max(MAX_QUANTITY, "Quantidade inválida no item"),
      }),
    )
    .min(1, "Adicione ao menos um item")
    .max(MAX_VARIANTS, `O pedido pode ter até ${MAX_VARIANTS} variações`),
  note,
});

export const respondSupplyOrderSchema = z.object({
  orderId: z.string().uuid(),
  decision: z.enum(["confirm", "reject"]),
  note,
});

export const cancelSupplyOrderSchema = z.object({
  orderId: z.string().uuid(),
  reason: note,
});

/** `JSON.parse` that never throws — a malformed payload fails validation instead. */
export function parseJsonArray(raw: FormDataEntryValue | null): unknown {
  try {
    const value: unknown = JSON.parse(typeof raw === "string" && raw ? raw : "[]");
    return value;
  } catch {
    return null;
  }
}
