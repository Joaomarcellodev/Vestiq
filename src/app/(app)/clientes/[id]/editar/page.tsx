import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCustomerWithHistory } from "@/features/customers/queries";
import { CustomerForm } from "@/features/customers/components/customer-form";
import { PageHeader } from "@/components/molecules/page-header";
import { BackButton } from "@/components/molecules/back-button";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCustomerWithHistory(id).catch(() => null);
  if (!result?.customer) notFound();
  const c = result.customer;

  return (
    <div className="space-y-lg">
      <BackButton fallback={`/clientes/${id}`} label="Cliente" />
      <PageHeader title="Editar cliente" description={c.name} />
      <CustomerForm
        customer={{
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          document: c.document,
          notes: c.notes,
        }}
      />
    </div>
  );
}
