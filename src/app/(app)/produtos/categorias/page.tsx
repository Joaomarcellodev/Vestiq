import type { Metadata } from "next";
import { listCategoriesForManagement } from "@/features/catalog/queries";
import { CategoryManager } from "@/features/catalog/components/category-manager";
import { PageHeader } from "@/components/molecules/page-header";
import { BackButton } from "@/components/molecules/back-button";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const categories = await listCategoriesForManagement();

  return (
    <div className="space-y-lg">
      <BackButton fallback="/produtos" label="Inventário" />
      <PageHeader title="Categorias" description="Organize o catálogo e filtre os produtos." />
      <CategoryManager categories={categories} />
    </div>
  );
}
