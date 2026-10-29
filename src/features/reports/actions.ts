"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rpcErrorMessage } from "@/lib/supabase/errors";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { reportSchema, reportTargetPath } from "./validation";

export type ReportState = { error?: string };

/** VES-43 — report an offer, a negotiation or a reseller (`submit_report`, migration 0046). */
export async function submitReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  await requireActiveOrganization();
  const parsed = reportSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    reason: formData.get("reason") ?? undefined,
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { targetType, targetId, reason, description } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_report", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
    p_description: description || undefined,
  });
  if (error) return { error: rpcErrorMessage(error) };

  redirect(`${reportTargetPath(targetType, targetId)}?toast=report-submitted`);
}
