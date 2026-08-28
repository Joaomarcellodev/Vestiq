import type { Metadata } from "next";
import { listCategories } from "@/features/catalog/queries";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { ProductForm } from "@/features/catalog/components/product-form";
import { PageHeader } from "@/components/molecules/page-header";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  await requireActiveOrganization();
  const categories = await listCategories();

  return (
    <div className="space-y-lg">
      <PageHeader title="Novo produto" description="Cadastre uma peça e suas variações." />
      <ProductForm categories={categories} />
    </div>
  );
}
