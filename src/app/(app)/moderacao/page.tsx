import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/molecules/page-header";
import { FilterTabs } from "@/components/molecules/filter-tabs";
import { EmptyState } from "@/components/molecules/empty-state";
import { Pager } from "@/components/molecules/pager";
import { Badge, Icon } from "@/components/atoms";
import {
  countOpenReports,
  listModerationReports,
  listSuspendedOrganizations,
} from "@/features/moderation/queries";
import { STATUS_PARAM } from "@/features/moderation/validation";
import { SuspensionForm } from "@/features/moderation/components/suspension-form";
import { REPORT_REASON, REPORT_STATUS, REPORT_TARGET } from "@/lib/i18n/labels";
import { parsePage } from "@/lib/pagination";

export const metadata: Metadata = { title: "Moderação" };

// Rendered on the server (UTC on Netlify) — pin the timezone.
const DATE = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** VES-44 — the platform admin's queue of reports and the suspended stores. */
export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; pagina?: string }>;
}) {
  const { status: raw = "", pagina } = await searchParams;
  const tab = raw in STATUS_PARAM ? raw : "";
  const [{ items: reports, page, hasNext }, openCount, suspended] = await Promise.all([
    listModerationReports(STATUS_PARAM[tab]!, parsePage(pagina)),
    countOpenReports(),
    listSuspendedOrganizations(),
  ]);

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Moderação"
        description="Denúncias de ofertas, conversas e lojas da plataforma."
      />

      <div className="overflow-x-auto">
        <FilterTabs
          basePath="/moderacao"
          param="status"
          current={tab}
          tabs={[
            { value: "", label: "Abertas", count: openCount },
            { value: "resolvidas", label: "Resolvidas" },
            { value: "arquivadas", label: "Arquivadas" },
            { value: "todas", label: "Todas" },
          ]}
        />
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon="shield"
          title={tab ? "Nenhuma denúncia aqui" : "Nenhuma denúncia aberta"}
          description={tab ? undefined : "Quando alguém denunciar algo, aparece nesta fila."}
        />
      ) : (
        <ul className="space-y-sm">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`/moderacao/denuncias/${r.id}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface transition-colors hover:bg-surface-container-low"
              >
                <div className="min-w-0">
                  <p className="font-title-lg text-title-lg text-on-surface">
                    {REPORT_REASON[r.reason]}
                  </p>
                  <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
                    {REPORT_TARGET[r.targetType]}: {r.targetLabel} · {r.targetOrgName}
                  </p>
                  <p className="mt-0.5 font-label-md text-label-md text-on-surface-variant">
                    Denunciada por {r.reporterOrgName} em {DATE.format(new Date(r.createdAt))}
                  </p>
                </div>
                <Badge tone={REPORT_STATUS[r.status].tone}>{REPORT_STATUS[r.status].label}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pager basePath="/moderacao" params={{ status: tab }} page={page} hasNext={hasNext} />

      <section className="space-y-md">
        <h2 className="flex items-center gap-2 font-title-lg text-title-lg text-on-surface">
          <Icon name="block" size={20} />
          Lojas suspensas
        </h2>
        {suspended.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            Nenhuma loja suspensa.
          </p>
        ) : (
          <ul className="space-y-sm">
            {suspended.map((o) => (
              <li
                key={o.id}
                className="space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface"
              >
                <div>
                  <p className="font-body-md text-body-md font-semibold text-on-surface">
                    {o.name}
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {o.suspendedAt
                      ? `Suspensa em ${DATE.format(new Date(o.suspendedAt))}`
                      : "Suspensa"}
                    {o.reason ? ` · ${o.reason}` : ""}
                  </p>
                </div>
                <SuspensionForm
                  organizationId={o.id}
                  organizationName={o.name}
                  suspended={false}
                  back="/moderacao"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
