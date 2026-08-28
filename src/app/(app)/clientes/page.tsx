import type { Metadata } from "next";
import Link from "next/link";
import { listCustomers } from "@/features/customers/queries";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { Button, Icon } from "@/components/atoms";

export const metadata: Metadata = { title: "Clientes" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const customers = await listCustomers(q);

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Gestão de clientes"
        description="Sua base de clientes."
        action={
          <Link href="/clientes/novo">
            <Button size="sm">
              <Icon name="add" size={18} />
              Novo cliente
            </Button>
          </Link>
        }
      />

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome, email..."
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md"
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {customers.length === 0 ? (
        <EmptyState
          icon="group"
          title="Nenhum cliente"
          description="Cadastre seu primeiro cliente."
        />
      ) : (
        <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clientes/${c.id}`}
                className="flex items-center justify-between p-4 hover:bg-surface-container-low"
              >
                <div>
                  <p className="font-body-md text-body-md text-on-surface">{c.name}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {c.email ?? c.phone ?? "Sem contato"}
                  </p>
                </div>
                <Icon name="chevron_right" size={20} className="text-outline" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
