import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, listCategories } from "@/features/catalog/queries";
import { EditProductForm } from "@/features/catalog/components/edit-product-form";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { PageHeader } from "@/components/molecules/page-header";
import { BackButton } from "@/components/molecules/back-button";

export const metadata: Metadata = { title: "Editar produto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [org, product, categories] = await Promise.all([
    requireActiveOrganization(),
    getProduct(id).catch(() => null),
    listCategories(),
  ]);
  if (!product) notFound();

  // An archived category is out of the picker (BR-CAT-10) but the product keeps
  // it: list it anyway so saving the form doesn't drop it.
  const current = product.category_id;
  const options =
    current && product.categories && !categories.some((c) => c.id === current)
      ? [...categories, { id: current, name: `${product.categories.name} (arquivada)` }]
      : categories;

  return (
    <div className="space-y-lg">
      <BackButton fallback={`/produtos/${id}`} label="Produto" />
      <PageHeader title="Editar produto" description={product.name} />
      <EditProductForm product={product} categories={options} isFactory={org.type === "FACTORY"} />
    </div>
  );
}
