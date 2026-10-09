import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getArchiveOptions } from "@/features/catalog/queries";
import { ArchiveToOffersForm } from "@/features/catalog/components/archive-to-offers-form";
import { PageHeader } from "@/components/molecules/page-header";
import { BackButton } from "@/components/molecules/back-button";

export const metadata: Metadata = { title: "Arquivar produto" };

export default async function ArchiveProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const options = await getArchiveOptions(id).catch(() => null);
  if (!options) notFound();
  if (options.product.archived) redirect(`/produtos/${id}`);

  return (
    <div className="space-y-lg">
      <BackButton fallback={`/produtos/${id}`} label="Produto" />
      <PageHeader title="Arquivar produto" description={options.product.name} />
      <ArchiveToOffersForm productId={id} variants={options.variants} networks={options.networks} />
    </div>
  );
}
