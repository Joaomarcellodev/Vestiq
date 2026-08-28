import type { Metadata } from "next";
import Link from "next/link";
import { listCustomers } from "@/features/customers/queries";
import { unarchiveCustomer } from "@/features/customers/actions";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { FilterTabs } from "@/components/molecules/filter-tabs";
import { Badge, Button, Icon } from "@/components/atoms";

export const metadata: Metadata = { title: "Clientes" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>;
}) {
  const { q, scope } = await searchParams;
  const currentScope = scope === "archived" ? "archived" : "active";
  const customers = await listCustomers(q, currentScope);

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Gestão de clientes"
        description="Sua base de clientes."
        action={
          <Link href="/clientes/novo" className="block">
            <Button size="md" className="w-full sm:w-auto">
              <Icon name="add" size={18} />
              Novo cliente
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          basePath="/clientes"
          param="scope"
          current={currentScope === "active" ? "" : "archived"}
          extra={{ q }}
          tabs={[
            { value: "", label: "Ativos" },
            { value: "archived", label: "Arquivados" },
          ]}
        />
        <form className="flex gap-2">
          {scope && <input type="hidden" name="scope" value={scope} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome, email..."
            className="field-focus-ring w-full min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md sm:w-64"
          />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon="group"
          title={currentScope === "archived" ? "Nenhum cliente arquivado" : "Nenhum cliente"}
          description={
            currentScope === "active" && !q ? "Cadastre seu primeiro cliente." : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
          {customers.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <Link href={`/clientes/${c.id}`} className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate font-body-md text-body-md text-on-surface">{c.name}</p>
                  <p className="truncate font-body-md text-body-md text-on-surface-variant">
                    {c.email ?? c.phone ?? "Sem contato"}
                  </p>
                </div>
              </Link>
              {currentScope === "archived" ? (
                <form action={unarchiveCustomer} className="shrink-0">
                  <input type="hidden" name="id" value={c.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    <Icon name="archive" size={16} />
                    Desarquivar
                  </Button>
                </form>
              ) : (
                <Icon
                  name="chevron_right"
                  size={20}
                  className="hidden shrink-0 text-outline sm:block"
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {currentScope === "archived" && customers.length > 0 && (
        <p className="font-body-md text-body-md text-on-surface-variant">
          <Badge tone="warning">Arquivado</Badge> Clientes arquivados não aparecem ao registrar uma
          venda.
        </p>
      )}
    </div>
  );
}
