import type { Metadata } from "next";
import Link from "next/link";
import { listNegotiations } from "@/features/negotiations/queries";
import { NegotiationProductSummary } from "@/features/negotiations/components/negotiation-product";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { FilterTabs } from "@/components/molecules/filter-tabs";
import { Pager } from "@/components/molecules/pager";
import { Badge } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";
import { parsePage } from "@/lib/pagination";
import { NEGOTIATION_STATUS } from "@/lib/i18n/labels";

export const metadata: Metadata = { title: "Negociações" };

export default async function NegotiationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; pagina?: string }>;
}) {
  const { tipo, pagina } = await searchParams;
  // VES-90: received and sent are tabs, each paged on its own.
  const direction = tipo === "enviadas" ? "sent" : "received";
  const {
    items: negotiations,
    page,
    hasNext,
  } = await listNegotiations(direction, parsePage(pagina));
  const tab = direction === "sent" ? "enviadas" : "";

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Painel de negociações"
        description="Solicitações de transferência de estoque da sua rede."
      />

      <FilterTabs
        basePath="/negociacoes"
        param="tipo"
        current={tab}
        tabs={[
          { value: "", label: "Recebidas" },
          { value: "enviadas", label: "Enviadas" },
        ]}
      />

      {negotiations.length === 0 ? (
        <EmptyState
          icon="swap_horiz"
          title={
            page > 1
              ? "Não há mais negociações nesta página"
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

      <Pager basePath="/negociacoes" params={{ tipo: tab }} page={page} hasNext={hasNext} />
    </div>
  );
}
