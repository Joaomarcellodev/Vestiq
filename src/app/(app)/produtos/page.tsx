import type { Metadata } from "next";
import Link from "next/link";
import { listProducts } from "@/features/catalog/queries";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { Badge, Button, Icon } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Produtos" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await listProducts(q);

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Inventário"
        description="Catálogo e estoque da sua loja."
        action={
          <Link href="/produtos/novo">
            <Button size="sm">
              <Icon name="add" size={18} />
              Novo produto
            </Button>
          </Link>
        }
      />

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar produtos, SKUs..."
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md"
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {products.length === 0 ? (
        <EmptyState
          icon="inventory_2"
          title={q ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
          description={q ? undefined : "Cadastre seu primeiro produto para começar a vender."}
          action={
            !q && (
              <Link href="/produtos/novo">
                <Button size="sm">Cadastrar produto</Button>
              </Link>
            )
          }
        />
      ) : (
        <ul className="space-y-md">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/produtos/${p.id}`}
                className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface transition-colors hover:bg-surface-container-low"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-title-lg text-title-lg text-on-surface">{p.name}</p>
                    <p className="mt-0.5 truncate font-body-md text-body-md text-on-surface-variant">
                      {[p.brand, p.internalSku && `SKU ${p.internalSku}`]
                        .filter(Boolean)
                        .join(" · ") || "Sem SKU"}
                    </p>
                  </div>
                  <span className="shrink-0 font-title-lg text-title-lg text-primary-container">
                    {p.minPrice !== null ? formatBRL(p.minPrice) : "—"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={p.totalStock > 0 ? "neutral" : "error"}>
                    {p.totalStock} em estoque
                  </Badge>
                  <Badge tone="neutral">
                    {p.variantCount} variaç{p.variantCount === 1 ? "ão" : "ões"}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
