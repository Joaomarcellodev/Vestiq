import type { Metadata } from "next";
import Link from "next/link";
import { listProducts } from "@/features/catalog/queries";
import { unarchiveProduct } from "@/features/catalog/actions";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { FilterTabs } from "@/components/molecules/filter-tabs";
import { Badge, Button, Icon } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Produtos" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>;
}) {
  const { q, scope } = await searchParams;
  const currentScope = scope === "archived" ? "archived" : "active";
  const products = await listProducts(q, currentScope);

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Inventário"
        description="Catálogo e estoque da sua loja."
        action={
          <Link href="/produtos/novo" className="block">
            <Button size="md" className="w-full sm:w-auto">
              <Icon name="add" size={18} />
              Novo produto
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          basePath="/produtos"
          param="scope"
          current={currentScope === "active" ? "" : "archived"}
          extra={{ q }}
          tabs={[
            { value: "", label: "Ativos" },
            { value: "archived", label: "Arquivados" },
          ]}
        />
        <form className="flex gap-2">
          {scope && <input type="hidden" name="scope" value={scope} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar produtos, SKUs..."
            className="field-focus-ring w-full min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md sm:w-64"
          />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon="inventory_2"
          title={
            currentScope === "archived"
              ? "Nenhum produto arquivado"
              : q
                ? "Nenhum produto encontrado"
                : "Nenhum produto cadastrado"
          }
          description={
            currentScope === "active" && !q
              ? "Cadastre seu primeiro produto para começar a vender."
              : undefined
          }
          action={
            currentScope === "active" && !q ? (
              <Link href="/produtos/novo">
                <Button size="sm">Cadastrar produto</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-md">
          {products.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface"
            >
              <Link href={`/produtos/${p.id}`} className="flex flex-col gap-3">
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
                  {p.archived && <Badge tone="warning">Arquivado</Badge>}
                  <Badge tone={p.totalStock > 0 ? "neutral" : "error"}>
                    {p.totalStock} em estoque
                  </Badge>
                  <Badge tone="neutral">
                    {p.variantCount} variaç{p.variantCount === 1 ? "ão" : "ões"}
                  </Badge>
                </div>
              </Link>
              {p.archived && (
                <form action={unarchiveProduct} className="mt-3">
                  <input type="hidden" name="id" value={p.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    <Icon name="archive" size={16} />
                    Desarquivar
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
