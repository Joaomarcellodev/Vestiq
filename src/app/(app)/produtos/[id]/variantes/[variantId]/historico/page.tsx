import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVariantHeader, listMovements } from "@/features/inventory/queries";
import {
  decodeMovementCursor,
  encodeMovementCursor,
  MOVEMENT_FILTER_TABS,
  parseMovementFilter,
} from "@/features/inventory/history";
import { MovementList } from "@/features/inventory/components/movement-list";
import { BackButton } from "@/components/molecules/back-button";
import { EmptyState } from "@/components/molecules/empty-state";
import { FilterTabs } from "@/components/molecules/filter-tabs";
import { PageHeader } from "@/components/molecules/page-header";
import { StockBadge } from "@/components/molecules/stock-badge";
import { Button, Icon } from "@/components/atoms";

export const metadata: Metadata = { title: "Histórico de estoque" };

export default async function MovementHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; variantId: string }>;
  searchParams: Promise<{ tipo?: string; antes?: string }>;
}) {
  const { id, variantId } = await params;
  const { tipo, antes } = await searchParams;

  const variant = await getVariantHeader(id, variantId).catch(() => null);
  if (!variant) notFound();

  const filter = parseMovementFilter(tipo);
  const before = decodeMovementCursor(antes);
  const { items, nextCursor } = await listMovements(variantId, { filter, before });

  const basePath = `/produtos/${id}/variantes/${variantId}/historico`;
  const tab = filter === "all" ? "" : filter;
  const pageHref = (cursor?: string) => {
    const qs = new URLSearchParams();
    if (tab) qs.set("tipo", tab);
    if (cursor) qs.set("antes", cursor);
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div className="space-y-lg">
      <BackButton fallback={`/produtos/${id}`} label={variant.productName} />
      <PageHeader
        title="Histórico de estoque"
        description={[variant.productName, variant.descriptor, variant.sku && `SKU ${variant.sku}`]
          .filter(Boolean)
          .join(" · ")}
        action={<StockBadge level={variant.level} stock={variant.stock} />}
      />

      <div className="-mx-4 overflow-x-auto px-4">
        <FilterTabs basePath={basePath} param="tipo" current={tab} tabs={MOVEMENT_FILTER_TABS} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="history"
          title={before ? "Não há movimentações mais antigas" : "Nenhuma movimentação"}
          description={
            filter === "all"
              ? "Entradas, ajustes, vendas e transferências desta variação aparecem aqui."
              : "Nenhuma movimentação deste tipo nesta variação."
          }
        />
      ) : (
        <MovementList items={items} />
      )}

      {(before || nextCursor) && (
        <div className="flex flex-wrap justify-center gap-2">
          {before && (
            <Link href={pageHref()}>
              <Button variant="ghost" size="sm">
                Mais recentes
              </Button>
            </Link>
          )}
          {nextCursor && (
            <Link href={pageHref(encodeMovementCursor(nextCursor))}>
              <Button variant="secondary" size="sm">
                Mais antigas
                <Icon name="chevron_right" size={16} />
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
