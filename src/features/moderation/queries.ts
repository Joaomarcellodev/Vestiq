import "server-only";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { pageOf, pageRange, type Page } from "@/lib/pagination";
import type { Database } from "@/types/database";
import type { ReportStatus } from "./validation";

type ReportRow = Database["public"]["Functions"]["list_moderation_reports"]["Returns"][number];

export interface ModerationReport {
  id: string;
  targetType: ReportRow["target_type"];
  targetId: string;
  targetLabel: string;
  /** For an offer: whether it is still in the feed (can be removed). */
  targetActive: boolean;
  targetOrgId: string;
  targetOrgName: string;
  targetOrgSuspended: boolean;
  targetOrgSuspensionReason: string | null;
  reporterOrgName: string;
  reason: ReportRow["reason"];
  description: string | null;
  status: ReportStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  openReportsOnOrg: number;
}

/**
 * VES-44 — the moderation panel is for the platform admin only (BR-MOD-01):
 * anyone else gets a 404, so the page doesn't reveal it exists. RLS and the
 * functions check it again (`is_platform_admin`).
 */
export async function requirePlatformAdmin() {
  const org = await requireActiveOrganization();
  if (org.type !== "PLATFORM" || org.role !== "PLATFORM_ADMIN") notFound();
  return org;
}

function toReport(r: ReportRow): ModerationReport {
  return {
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    targetLabel: r.target_label ?? "—",
    targetActive: r.target_active,
    targetOrgId: r.target_org_id,
    targetOrgName: r.target_org_name,
    targetOrgSuspended: r.target_org_status === "SUSPENDED",
    targetOrgSuspensionReason: r.target_org_suspension_reason ?? null,
    reporterOrgName: r.reporter_org_name,
    reason: r.reason,
    description: r.description ?? null,
    status: r.status,
    resolutionNote: r.resolution_note ?? null,
    resolvedAt: r.resolved_at ?? null,
    createdAt: r.created_at,
    openReportsOnOrg: r.open_reports_on_org,
  };
}

/** The report queue, newest first, one page at a time; `null` = every status. */
export async function listModerationReports(
  status: ReportStatus | null,
  page = 1,
): Promise<Page<ModerationReport>> {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("list_moderation_reports", { p_status: status ?? undefined })
    .range(...pageRange(page));
  if (error) throw error;
  return pageOf((data ?? []).map(toReport), page);
}

export async function countOpenReports(): Promise<number> {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "OPEN");
  if (error) throw error;
  return count ?? 0;
}

export async function getModerationReport(id: string): Promise<ModerationReport | null> {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("list_moderation_reports", { p_report_id: id })
    .maybeSingle();
  // 22P02: not a uuid
  if (error?.code === "22P02") return null;
  if (error) throw error;
  return data ? toReport(data) : null;
}

/** Suspended organizations, most recent first — where they are reactivated. */
export async function listSuspendedOrganizations() {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, type, suspended_at, suspension_reason")
    .eq("status", "SUSPENDED")
    .order("suspended_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    type: o.type,
    suspendedAt: o.suspended_at,
    reason: o.suspension_reason,
  }));
}
