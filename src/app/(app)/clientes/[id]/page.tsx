import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/molecules/back-button";
import Link from "next/link";
import { getCustomerWithHistory } from "@/features/customers/queries";
import { PageHeader } from "@/components/molecules/page-header";
import { StatCard } from "@/components/molecules/stat-card";
import { EmptyState } from "@/components/molecules/empty-state";
import { Badge } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Cliente" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCustomerWithHistory(id).catch(() => null);
  if (!result?.customer) notFound();
  const { customer, sales, stats } = result;

  return (
    <div className="space-y-lg">
      <BackButton fallback="/clientes" label="Clientes" />
      <PageHeader
        title={customer.name}
        description={[customer.email, customer.phone].filter(Boolean).join(" · ")}
      />

      <div className="grid gap-md sm:grid-cols-3">
        <StatCard label="Total gasto" value={formatBRL(stats.totalSpent)} />
        <StatCard label="Pedidos" value={String(stats.orderCount)} />
        <StatCard
          label="Última compra"
          value={
            stats.lastPurchase ? new Date(stats.lastPurchase).toLocaleDateString("pt-BR") : "—"
          }
        />
      </div>

      {customer.notes && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
          <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
            Notas internas
          </p>
          <p className="mt-sm font-body-md text-body-md text-on-surface">{customer.notes}</p>
        </div>
      )}

      <section>
        <h2 className="mb-sm font-headline-md text-headline-md text-on-surface">
          Histórico de compras
        </h2>
        {sales.length === 0 ? (
          <EmptyState icon="receipt_long" title="Nenhuma compra registrada" />
        ) : (
          <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
            {sales.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/vendas/${s.id}`}
                  className="flex items-center justify-between p-4 hover:bg-surface-container-low"
                >
                  <span className="font-body-md text-body-md text-on-surface">
                    {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    {s.status === "CANCELLED" && (
                      <Badge tone="error" className="ml-2">
                        Cancelada
                      </Badge>
                    )}
                  </span>
                  <span className="font-body-md text-body-md text-on-surface">
                    {formatBRL(Number(s.total))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
