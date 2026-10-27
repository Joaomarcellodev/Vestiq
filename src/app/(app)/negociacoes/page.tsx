import type { Metadata } from "next";
import Link from "next/link";
import { countPendingNegotiations, listNegotiations } from "@/features/negotiations/queries";
import { NegotiationProductSummary } from "@/features/negotiations/components/negotiation-product";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { FilterTabs } from "@/components/molecules/filter-tabs";
import { Pager } from "@/components/molecules/pager";
import { Badge } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";
import { parsePage } from "@/lib/pagination";
import { NEGOTIATION_STATUS } from "@/lib/i18n/labels";
import type { Database } from "@/types/database";

export const metadata: Metadata = { title: "Negociações" };

// VES-91: the status filter, in the URL as `?status=<pt-BR slug>`.
const STATUS_BY_PARAM: Record<string, Database["public"]["Enums"]["negotiation_status"]> = {
  pendentes: "PENDING",
  aceitas: "ACCEPTED",
  concluidas: "COMPLETED",
  recusadas: "REJECTED",
  canceladas: "CANCELLED",
};

const UPDATED_AT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function NegotiationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; status?: string; pagina?: string }>;
}) {
  const { tipo, status, pagina } = await searchParams;
  // VES-90: received and sent are tabs, each paged on its own.
  const direction = tipo === "enviadas" ? "sent" : "received";
  const tab = direction === "sent" ? "enviadas" : "";
  const current = status && STATUS_BY_PARAM[status] ? status : "";
  const [{ items: negotiations, page, hasNext }, pending] = await Promise.all([
    listNegotiations(direction, parsePage(pagina), STATUS_BY_PARAM[current]),
    countPendingNegotiations(direction),
  ]);

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Painel de negociações"
        description="Solicitações de transferência de estoque da sua rede."
      />

      <div className="flex flex-col gap-3">
        <FilterTabs
          basePath="/negociacoes"
          param="tipo"
          current={tab}
          extra={{ status: current }}
          tabs={[
            { value: "", label: "Recebidas" },
            { value: "enviadas", label: "Enviadas" },
          ]}
        />
        <div className="overflow-x-auto">
          <FilterTabs
            basePath="/negociacoes"
            param="status"
            current={current}
            extra={{ tipo: tab }}
            tabs={[
              { value: "", label: "Todas" },
              { value: "pendentes", label: "Pendentes", count: pending },
              { value: "aceitas", label: "Aceitas" },
              { value: "concluidas", label: "Concluídas" },
              { value: "recusadas", label: "Recusadas" },
              { value: "canceladas", label: "Canceladas" },
            ]}
          />
        </div>
      </div>

      {negotiations.length === 0 ? (
        <EmptyState
          icon="swap_horiz"
          title={
            page > 1
              ? "Não há mais negociações nesta página"
              : current
                ? "Nenhuma negociação com este status"
                : direction === "sent"
                  ? "Nenhuma negociação enviada"
                  : "Nenhuma negociação recebida"
          }
        />
      ) : (
        <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
          {negotiations.map((n) => (
            <li key={n.id}>
              <Link
                href={`/negociacoes/${n.id}`}
                className="flex items-center justify-between gap-3 p-4 hover:bg-surface-container-low"
              >
                <NegotiationProductSummary product={n.product}>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {n.counterparty} · {n.quantity} un.
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Atualizada em{" "}
                    <time dateTime={n.updatedAt}>{UPDATED_AT.format(new Date(n.updatedAt))}</time>
                  </p>
                </NegotiationProductSummary>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={NEGOTIATION_STATUS[n.status].tone}>
                    {NEGOTIATION_STATUS[n.status].label}
                  </Badge>
                  <span className="font-title-lg text-title-lg text-on-surface">
                    {formatBRL(n.amount)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pager
        basePath="/negociacoes"
        params={{ tipo: tab, status: current }}
        page={page}
        hasNext={hasNext}
      />
    </div>
  );
}
