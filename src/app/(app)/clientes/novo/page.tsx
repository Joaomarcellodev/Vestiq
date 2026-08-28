import type { Metadata } from "next";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { CustomerForm } from "@/features/customers/components/customer-form";
import { PageHeader } from "@/components/molecules/page-header";
import { BackButton } from "@/components/molecules/back-button";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NewCustomerPage() {
  await requireActiveOrganization();
  return (
    <div className="space-y-lg">
      <BackButton fallback="/clientes" label="Clientes" />
      <PageHeader title="Novo cliente" />
      <CustomerForm />
    </div>
  );
}
