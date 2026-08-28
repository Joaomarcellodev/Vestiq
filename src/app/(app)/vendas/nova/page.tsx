import type { Metadata } from "next";
import { listCustomerOptions, listSellableVariants } from "@/features/sales/queries";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { NewSaleForm } from "@/features/sales/components/new-sale-form";
import { PageHeader } from "@/components/molecules/page-header";
import { BackButton } from "@/components/molecules/back-button";

export const metadata: Metadata = { title: "Registrar venda" };

export default async function NewSalePage() {
  await requireActiveOrganization();
  const [variants, customers] = await Promise.all([listSellableVariants(), listCustomerOptions()]);

  return (
    <div className="space-y-lg">
      <BackButton fallback="/vendas" label="Vendas" />
      <PageHeader title="Registrar venda" description="Adicione itens e confirme o pagamento." />
      <NewSaleForm variants={variants} customers={customers} />
    </div>
  );
}
