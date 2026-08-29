import type { Metadata } from "next";
import {
  listCustomerOptions,
  listSellableCatalog,
  listSellableVariants,
} from "@/features/sales/queries";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { NewSaleForm } from "@/features/sales/components/new-sale-form";
import { PageHeader } from "@/components/molecules/page-header";
import { BackButton } from "@/components/molecules/back-button";

export const metadata: Metadata = { title: "Registrar venda" };

export default async function NewSalePage() {
  await requireActiveOrganization();
  const [variants, catalog, customers] = await Promise.all([
    listSellableVariants(),
    listSellableCatalog(),
    listCustomerOptions(),
  ]);

  return (
    <div className="space-y-lg">
      <BackButton fallback="/vendas" label="Vendas" />
      <PageHeader title="Registrar venda" description="Adicione itens e confirme o pagamento." />
      <NewSaleForm variants={variants} catalog={catalog} customers={customers} />
    </div>
  );
}
