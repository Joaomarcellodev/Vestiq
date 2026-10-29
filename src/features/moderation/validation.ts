import { z } from "@/lib/zod";
import type { Database } from "@/types/database";

export type ReportStatus = Database["public"]["Enums"]["report_status"];

export const MODERATION_REASON_MAX_LENGTH = 1000;

/** `/moderacao?status=…` — pt-BR in the URL; no param = the open queue. */
export const STATUS_PARAM: Record<string, ReportStatus | null> = {
  "": "OPEN",
  resolvidas: "ACTIONED",
  arquivadas: "DISMISSED",
  todas: null,
};

const reason = z
  .string()
  .trim()
  .min(1, "Informe o motivo da decisão")
  .max(
    MODERATION_REASON_MAX_LENGTH,
    `Use no máximo ${MODERATION_REASON_MAX_LENGTH} caracteres no motivo`,
  );

export const moderateReportSchema = z.object({
  reportId: z.string().uuid("Denúncia inválida"),
  action: z.enum(["DISMISS_REPORT", "REMOVE_OFFER", "SUSPEND_ORGANIZATION"], {
    message: "Ação inválida",
  }),
  reason,
});

export const suspensionSchema = z.object({
  organizationId: z.string().uuid("Organização inválida"),
  suspended: z.enum(["0", "1"]).transform((v) => v === "1"),
  reason,
});
