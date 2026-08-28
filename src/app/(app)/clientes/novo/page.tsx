import type { Metadata } from "next";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { CustomerForm } from "@/features/customers/components/customer-form";
import { PageHeader } from "@/components/molecules/page-header";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NewCustomerPage() {
  await requireActiveOrganization();
  return (
    <div className="space-y-lg">
      <PageHeader title="Novo cliente" />
      <CustomerForm />
    </div>
  );
}
