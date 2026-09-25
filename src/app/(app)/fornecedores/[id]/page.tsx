import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupplier, searchSupplierProducts } from "@/features/suppliers/queries";
import { SupplierProductCard } from "@/features/suppliers/components/supplier-product-card";
import { SupplierSearchForm } from "@/features/suppliers/components/supplier-search-form";
import { BackButton } from "@/components/molecules/back-button";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { RevealList, RevealItem } from "@/components/motion";

export const metadata: Metadata = { title: "Fornecedor" };

export default async function SupplierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ id }, { q }] = await Promise.all([params, searchParams]);
  const query = q?.trim() || undefined;
  const [supplier, products] = await Promise.all([
    getSupplier(id),
    searchSupplierProducts(query, id),
  ]);
  if (!supplier) notFound();

  return (
    <div className="space-y-lg">
      <BackButton fallback="/fornecedores?view=fornecedores" label="Fornecedores" />
      <PageHeader
        title={supplier.name}
        description={[
          `${supplier.productCount} produto${supplier.productCount === 1 ? "" : "s"}`,
          ...supplier.networkNames,
        ].join(" · ")}
      />

      <SupplierSearchForm query={query} placeholder={`Buscar no catálogo de ${supplier.name}...`} />

      {products.length === 0 ? (
        <EmptyState
          icon="search"
          title={query ? "Nenhum produto encontrado" : "Catálogo vazio"}
          description={
            query ? undefined : "Este fornecedor ainda não cadastrou produtos no Vestiq."
          }
        />
      ) : (
        <RevealList className="grid gap-md md:grid-cols-2">
          {products.map((p) => (
            <RevealItem key={p.id}>
              <SupplierProductCard product={p} showSupplier={false} />
            </RevealItem>
          ))}
        </RevealList>
      )}
    </div>
  );
}
