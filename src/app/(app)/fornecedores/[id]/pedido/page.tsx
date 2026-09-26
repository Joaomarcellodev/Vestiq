import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupplier } from "@/features/suppliers/queries";
import { getOrderCatalog } from "@/features/supply-orders/queries";
import { OrderBuilder } from "@/features/supply-orders/components/order-builder";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { BackButton } from "@/components/molecules/back-button";
import { PageHeader } from "@/components/molecules/page-header";

export const metadata: Metadata = { title: "Novo pedido" };

export default async function NewSupplyOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ produto?: string }>;
}) {
  const [{ id }, { produto }] = await Promise.all([params, searchParams]);
  const org = await requireActiveOrganization();
  if (org.type !== "RESELLER") notFound();

  const [supplier, catalog] = await Promise.all([getSupplier(id), getOrderCatalog(id)]);
  if (!supplier) notFound();

  return (
    <div className="space-y-lg">
      <BackButton fallback={`/fornecedores/${id}`} label={supplier.name} />
      <PageHeader
        title="Pedido de abastecimento"
        description={`Informe as quantidades por cor e tamanho. O pedido vai para ${supplier.name}, que confirma ou recusa.`}
      />
      <OrderBuilder supplierId={id} catalog={catalog} focusProductId={produto} />
    </div>
  );
}
