import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, listCategories } from "@/features/catalog/queries";
import { EditProductForm } from "@/features/catalog/components/edit-product-form";
import { PageHeader } from "@/components/molecules/page-header";
import { BackButton } from "@/components/molecules/back-button";

export const metadata: Metadata = { title: "Editar produto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProduct(id).catch(() => null),
    listCategories(),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-lg">
      <BackButton fallback={`/produtos/${id}`} label="Produto" />
      <PageHeader title="Editar produto" description={product.name} />
      <EditProductForm product={product} categories={categories} />
    </div>
  );
}
