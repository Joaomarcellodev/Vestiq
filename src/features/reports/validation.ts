import { z } from "@/lib/zod";
import type { Database } from "@/types/database";

export type ReportTarget = Database["public"]["Enums"]["report_target"];
export type ReportReason = Database["public"]["Enums"]["report_reason"];

export const REPORT_REASONS = [
  "SPAM",
  "FRAUDE",
  "PRODUTO_FALSIFICADO",
  "CONTEUDO_INADEQUADO",
  "ASSEDIO",
  "OUTRO",
] as const satisfies readonly ReportReason[];

export const REPORT_DESCRIPTION_MAX_LENGTH = 1000;

/** `/denunciar?alvo=…` — the URL keeps pt-BR words, the database the enum. */
export const REPORT_TARGET_PARAM: Record<string, ReportTarget> = {
  oferta: "OFFER",
  negociacao: "NEGOTIATION",
  revendedora: "ORGANIZATION",
};

export function reportTargetParam(target: ReportTarget): string {
  return Object.entries(REPORT_TARGET_PARAM).find(([, t]) => t === target)![0];
}

/** Where the reported thing lives — the reporter goes back there. */
export function reportTargetPath(target: ReportTarget, id: string): string {
  if (target === "OFFER") return `/rede/ofertas/${id}`;
  if (target === "NEGOTIATION") return `/negociacoes/${id}`;
  return `/rede/revendedoras/${id}`;
}

/** Link to the report form for a target. */
export function reportHref(target: ReportTarget, id: string): string {
  return `/denunciar?alvo=${reportTargetParam(target)}&id=${id}`;
}

export const reportSchema = z.object({
  targetType: z.enum(["OFFER", "NEGOTIATION", "ORGANIZATION"], { message: "Denúncia inválida" }),
  targetId: z.string().uuid("Denúncia inválida"),
  reason: z.enum(REPORT_REASONS, { message: "Escolha o motivo da denúncia" }),
  description: z
    .string()
    .trim()
    .max(
      REPORT_DESCRIPTION_MAX_LENGTH,
      `Use no máximo ${REPORT_DESCRIPTION_MAX_LENGTH} caracteres na descrição`,
    )
    .optional()
    .or(z.literal("")),
});
