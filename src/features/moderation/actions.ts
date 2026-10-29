"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rpcErrorMessage } from "@/lib/supabase/errors";
import { requirePlatformAdmin } from "./queries";
import { moderateReportSchema, suspensionSchema } from "./validation";

export type ModerationState = { error?: string };

const TOAST = {
  DISMISS_REPORT: "report-dismissed",
  REMOVE_OFFER: "report-offer-removed",
  SUSPEND_ORGANIZATION: "report-org-suspended",
} as const;

/** VES-44 — archive a report, remove the reported offer or suspend the store (`moderate_report`). */
export async function moderateReport(
  _prev: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  await requirePlatformAdmin();
  const parsed = moderateReportSchema.safeParse({
    reportId: formData.get("reportId"),
    action: formData.get("action"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { reportId, action, reason } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_report", {
    p_report_id: reportId,
    p_action: action,
    p_reason: reason,
  });
  if (error) return { error: rpcErrorMessage(error) };

  revalidatePath("/moderacao");
  redirect(`/moderacao/denuncias/${reportId}?toast=${TOAST[action]}`);
}

/** VES-44 — suspend or reactivate an organization outside a report. */
export async function setOrganizationSuspension(
  _prev: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  await requirePlatformAdmin();
  const parsed = suspensionSchema.safeParse({
    organizationId: formData.get("organizationId"),
    suspended: formData.get("suspended"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { organizationId, suspended, reason } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_organization_suspension", {
    p_org_id: organizationId,
    p_suspended: suspended,
    p_reason: reason,
  });
  if (error) return { error: rpcErrorMessage(error) };

  revalidatePath("/moderacao");
  const back = formData.get("back");
  const path = typeof back === "string" && back.startsWith("/moderacao") ? back : "/moderacao";
  redirect(`${path}?toast=${suspended ? "org-suspended" : "org-reactivated"}`);
}
