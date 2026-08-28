import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProduct } from "@/features/catalog/queries";
import { archiveProduct, unarchiveProduct } from "@/features/catalog/actions";
import { BackButton } from "@/components/molecules/back-button";
import { classifyStock, DEFAULT_LOW_STOCK_THRESHOLD } from "@/features/inventory/classify";
import { StockControls } from "@/features/inventory/components/stock-controls";
import { PageHeader } from "@/components/molecules/page-header";
import { StockBadge } from "@/components/molecules/stock-badge";
import { Button, Icon } from "@/components/atoms";
import { formatBRL, estimatedMargin, formatPercent } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Produto" };

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id).catch(() => null);
  if (!product) notFound();

  const variants = product.product_variants ?? [];
  const archived = product.archived_at !== null;

  return (
    <div className="space-y-lg">
      <BackButton fallback="/produtos" label="Inventário" />
      <PageHeader
        title={product.name}
        description={[product.brand, product.categories?.name].filter(Boolean).join(" · ")}
        action={
          <div className="flex flex-wrap gap-2">
            {!archived && (
              <Link href={`/produtos/${id}/editar`}>
                <Button variant="secondary" size="sm">
                  <Icon name="edit" size={16} />
                  Editar
                </Button>
              </Link>
            )}
            {archived ? (
              <form action={unarchiveProduct}>
                <input type="hidden" name="id" value={id} />
                <Button variant="secondary" size="sm" type="submit">
                  <Icon name="archive" size={16} />
                  Desarquivar
                </Button>
              </form>
            ) : (
              <form action={archiveProduct}>
                <input type="hidden" name="id" value={id} />
                <Button variant="ghost" size="sm" type="submit">
                  <Icon name="archive" size={16} />
                  Arquivar
                </Button>
              </form>
            )}
          </div>
        }
      />
      {archived && (
        <p className="rounded-lg bg-warning-container px-4 py-3 font-body-md text-body-md text-on-warning-container">
          Este produto está arquivado — não aparece nas vendas nem pode ser ofertado.
        </p>
      )}
      {product.description && (
        <p className="font-body-md text-body-md text-on-surface-variant">{product.description}</p>
      )}

      <section className="space-y-md">
        <h2 className="font-headline-md text-headline-md text-on-surface">Estoque por variante</h2>
        {variants.map((v) => {
          const level = classifyStock(v.stock_on_hand, DEFAULT_LOW_STOCK_THRESHOLD);
          const margin = estimatedMargin(Number(v.cost_price), Number(v.retail_price));
          return (
            <div
              key={v.id}
              className="space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-title-lg text-title-lg text-on-surface">
                    {[v.color, v.size].filter(Boolean).join(" / ") || "Único"}
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {v.sku ? `SKU ${v.sku} · ` : ""}
                    {formatBRL(Number(v.retail_price))} · margem {formatPercent(margin)}
                  </p>
                </div>
                <StockBadge level={level} stock={v.stock_on_hand} />
              </div>
              <StockControls variantId={v.id} />
            </div>
          );
        })}
      </section>
    </div>
  );
}
