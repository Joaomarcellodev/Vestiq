import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { listCategories, listProducts } from "@/features/catalog/queries";
import { unarchiveProduct } from "@/features/catalog/actions";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { FilterTabs } from "@/components/molecules/filter-tabs";
import { Badge, Button, Icon } from "@/components/atoms";
import { RevealList, RevealItem } from "@/components/motion";
import { formatBRL } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Produtos" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string; categoria?: string }>;
}) {
  const { q, scope, categoria } = await searchParams;
  const currentScope = scope === "archived" ? "archived" : "active";
  const categories = await listCategories();
  // Ignore a stale or foreign id instead of showing an empty list.
  const category = categories.find((c) => c.id === categoria);
  const products = await listProducts(q, currentScope, category?.id);

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Inventário"
        description="Catálogo e estoque da sua loja."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/produtos/categorias" className="block">
              <Button variant="secondary" size="md" className="w-full sm:w-auto">
                Categorias
              </Button>
            </Link>
            <Link href="/produtos/novo" className="block">
              <Button size="md" className="w-full sm:w-auto">
                <Icon name="add" size={18} />
                Novo produto
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          basePath="/produtos"
          param="scope"
          current={currentScope === "active" ? "" : "archived"}
          extra={{ q, categoria: category?.id }}
          tabs={[
            { value: "", label: "Ativos" },
            { value: "archived", label: "Arquivados" },
          ]}
        />
        <form className="flex flex-wrap gap-2 sm:flex-nowrap">
          {scope && <input type="hidden" name="scope" value={scope} />}
          {categories.length > 0 && (
            <select
              name="categoria"
              aria-label="Filtrar por categoria"
              defaultValue={category?.id ?? ""}
              className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md sm:w-48"
            >
              <option value="">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <input
            name="q"
            defaultValue={q}
            aria-label="Buscar produtos"
            placeholder="Buscar produtos, SKUs..."
            className="field-focus-ring min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md sm:w-64 sm:flex-none"
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
              : q || category
                ? "Nenhum produto encontrado"
                : "Nenhum produto cadastrado"
          }
          description={
            currentScope === "active" && !q && !category
              ? "Cadastre seu primeiro produto para começar a vender."
              : undefined
          }
          action={
            currentScope === "active" && !q && !category ? (
              <Link href="/produtos/novo">
                <Button size="sm">Cadastrar produto</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <RevealList className="space-y-md">
          {products.map((p) => (
            <RevealItem
              key={p.id}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface"
            >
              <Link href={`/produtos/${p.id}`} className="flex gap-4">
                <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-container text-outline">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt=""
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Icon name="inventory_2" size={24} />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-title-lg text-title-lg text-on-surface">
                        {p.name}
                      </p>
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
            </RevealItem>
          ))}
        </RevealList>
      )}
    </div>
  );
}
