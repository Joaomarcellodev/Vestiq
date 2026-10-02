import type { Metadata } from "next";
import { listSuppliers, searchSupplierProducts } from "@/features/suppliers/queries";
import { SupplierProductCard } from "@/features/suppliers/components/supplier-product-card";
import { SupplierCard } from "@/features/suppliers/components/supplier-card";
import { SearchForm } from "@/components/molecules/search-form";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { FilterTabs } from "@/components/molecules/filter-tabs";
import { RevealList, RevealItem } from "@/components/motion";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const { q, view } = await searchParams;
  const showSuppliers = view === "fornecedores";
  const query = q?.trim() || undefined;

  // The supplier list also drives the "no network yet" empty state.
  const [suppliers, products] = await Promise.all([
    listSuppliers(showSuppliers ? query : undefined),
    showSuppliers ? Promise.resolve([]) : searchSupplierProducts(query),
  ]);
  const hasSuppliers = showSuppliers ? suppliers.length > 0 || !!query : suppliers.length > 0;

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Fornecedores"
        description="Pesquise os fornecedores das suas redes e encontre mercadorias para repor o estoque."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          basePath="/fornecedores"
          param="view"
          current={showSuppliers ? "fornecedores" : ""}
          extra={{ q: query }}
          tabs={[
            { value: "", label: "Produtos" },
            { value: "fornecedores", label: "Fornecedores" },
          ]}
        />
        <SearchForm
          query={query}
          placeholder={showSuppliers ? "Buscar fornecedores..." : "Buscar produtos, cores, SKUs..."}
          hidden={{ view: showSuppliers ? "fornecedores" : undefined }}
        />
      </div>

      {!hasSuppliers ? (
        <EmptyState
          icon="factory"
          title="Nenhum fornecedor disponível"
          description="Os fornecedores aparecem aqui quando você participa da rede de uma fábrica. Aceite o convite enviado por ela para ver o catálogo."
        />
      ) : showSuppliers ? (
        suppliers.length === 0 ? (
          <EmptyState icon="search" title="Nenhum fornecedor encontrado" />
        ) : (
          <RevealList className="space-y-md">
            {suppliers.map((s) => (
              <RevealItem key={s.id}>
                <SupplierCard supplier={s} />
              </RevealItem>
            ))}
          </RevealList>
        )
      ) : products.length === 0 ? (
        <EmptyState
          icon="search"
          title={query ? "Nenhum produto encontrado" : "Nenhum produto disponível"}
          description={
            query
              ? "Tente outras palavras, como o nome da peça, a cor ou o SKU."
              : "Seus fornecedores ainda não cadastraram produtos."
          }
        />
      ) : (
        <>
          <p className="font-body-md text-body-md text-on-surface-variant" aria-live="polite">
            {products.length === 100
              ? "Mostrando os 100 primeiros produtos — refine a busca para ver outros."
              : `${products.length} produto${products.length === 1 ? "" : "s"}${query ? ` para “${query}”` : ""}`}
          </p>
          <RevealList className="grid gap-md md:grid-cols-2">
            {products.map((p) => (
              <RevealItem key={p.id}>
                <SupplierProductCard product={p} />
              </RevealItem>
            ))}
          </RevealList>
        </>
      )}
    </div>
  );
}
