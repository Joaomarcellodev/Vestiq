import { z } from "@/lib/zod";

/** The transaction a review is about (SPEC-016). */
export const REVIEW_KINDS = ["negotiation", "supply_order"] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const REVIEW_COMMENT_MAX_LENGTH = 500;

export const reviewSchema = z.object({
  kind: z.enum(REVIEW_KINDS, { message: "Transação inválida" }),
  transactionId: z.string().uuid("Transação inválida"),
  rating: z.coerce
    .number({ message: "Escolha uma nota de 1 a 5" })
    .int("Escolha uma nota de 1 a 5")
    .min(1, "Escolha uma nota de 1 a 5")
    .max(5, "Escolha uma nota de 1 a 5"),
  comment: z
    .string()
    .trim()
    .max(
      REVIEW_COMMENT_MAX_LENGTH,
      `Use no máximo ${REVIEW_COMMENT_MAX_LENGTH} caracteres no comentário`,
    )
    .optional()
    .or(z.literal("")),
});

/** Where each kind of transaction lives — the action comes back to it. */
export function transactionPath(kind: ReviewKind, id: string): string {
  return kind === "negotiation" ? `/negociacoes/${id}` : `/pedidos/${id}`;
}
