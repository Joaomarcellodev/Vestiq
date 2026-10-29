import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/molecules/back-button";
import { PageHeader } from "@/components/molecules/page-header";
import { Badge } from "@/components/atoms";
import { getModerationReport } from "@/features/moderation/queries";
import { ModerationDecisionForm } from "@/features/moderation/components/moderation-decision-form";
import { SuspensionForm } from "@/features/moderation/components/suspension-form";
import { REPORT_REASON, REPORT_STATUS, REPORT_TARGET } from "@/lib/i18n/labels";

export const metadata: Metadata = { title: "Denúncia" };

// Rendered on the server (UTC on Netlify) — pin the timezone.
const DATE = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** VES-44 — one report: what was reported, by whom, and the decision. */
export default async function ModerationReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getModerationReport(id);
  if (!report) notFound();

  const rows = [
    { label: "Tipo", value: REPORT_TARGET[report.targetType] },
    { label: "Denunciado", value: report.targetLabel },
    {
      label: "Loja",
      value: `${report.targetOrgName}${report.targetOrgSuspended ? " (suspensa)" : ""}`,
    },
    { label: "Denúncias abertas contra a loja", value: String(report.openReportsOnOrg) },
    { label: "Denunciada por", value: report.reporterOrgName },
    { label: "Em", value: DATE.format(new Date(report.createdAt)) },
  ];
  if (report.targetType === "OFFER") {
    rows.splice(2, 0, {
      label: "Oferta",
      value: report.targetActive ? "Ainda na rede" : "Fora da rede",
    });
  }

  return (
    <div className="space-y-lg">
      <BackButton fallback="/moderacao" label="Moderação" />
      <PageHeader
        title={REPORT_REASON[report.reason]}
        description={`${REPORT_TARGET[report.targetType]} · ${report.targetOrgName}`}
        action={
          <Badge tone={REPORT_STATUS[report.status].tone}>
            {REPORT_STATUS[report.status].label}
          </Badge>
        }
      />

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <dl className="divide-y divide-outline-variant">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0">
              <dt className="font-body-md text-body-md text-on-surface-variant">{r.label}</dt>
              <dd className="text-right font-body-md text-body-md text-on-surface">{r.value}</dd>
            </div>
          ))}
        </dl>
        {report.description && (
          <div className="mt-md border-t border-outline-variant pt-md">
            <p className="font-body-md text-body-md font-semibold text-on-surface">
              Relato de quem denunciou
            </p>
            <p className="mt-1 whitespace-pre-line font-body-md text-body-md text-on-surface-variant">
              {report.description}
            </p>
          </div>
        )}
      </section>

      {report.status === "OPEN" ? (
        <ModerationDecisionForm report={report} />
      ) : (
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
          <h2 className="font-title-lg text-title-lg text-on-surface">Decisão</h2>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            {REPORT_STATUS[report.status].label}
            {report.resolvedAt ? ` em ${DATE.format(new Date(report.resolvedAt))}` : ""}
          </p>
          {report.resolutionNote && (
            <p className="mt-2 whitespace-pre-line font-body-md text-body-md text-on-surface">
              {report.resolutionNote}
            </p>
          )}
        </section>
      )}

      {report.targetOrgSuspended && (
        <section className="space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
          <h2 className="font-title-lg text-title-lg text-on-surface">Loja suspensa</h2>
          {report.targetOrgSuspensionReason && (
            <p className="font-body-md text-body-md text-on-surface-variant">
              {report.targetOrgSuspensionReason}
            </p>
          )}
          <SuspensionForm
            organizationId={report.targetOrgId}
            organizationName={report.targetOrgName}
            suspended={false}
            back={`/moderacao/denuncias/${report.id}`}
          />
        </section>
      )}
    </div>
  );
}
