import type { Metadata } from "next";
import Link from "next/link";
import { getSalesSummary, listSales } from "@/features/sales/queries";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { StatCard } from "@/components/molecules/stat-card";
import { Badge, Button, Icon } from "@/components/atoms";
import { Reveal } from "@/components/motion";
import { formatBRL } from "@/lib/utils/currency";
import { PAYMENT_METHOD } from "@/lib/i18n/labels";

export const metadata: Metadata = { title: "Vendas" };

export default async function SalesPage() {
  const [summary, sales] = await Promise.all([getSalesSummary(), listSales()]);

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Vendas"
        description="Resumo e transações recentes."
        action={
          <Link href="/vendas/nova" className="block">
            <Button size="md" className="w-full sm:w-auto">
              <Icon name="add" size={18} />
              Nova venda
            </Button>
          </Link>
        }
      />

      <div className="grid gap-md sm:grid-cols-3">
        <StatCard label="Faturamento" value={summary.revenue} format="brl" />
        <StatCard label="Vendas confirmadas" value={summary.count} />
        <StatCard label="Ticket médio" value={summary.averageTicket} format="brl" />
      </div>

      {sales.length === 0 ? (
        <EmptyState icon="receipt_long" title="Nenhuma venda registrada" />
      ) : (
        <Reveal
          as="ul"
          className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest"
        >
          {sales.map((s) => (
            <li key={s.id}>
              <Link
                href={`/vendas/${s.id}`}
                className="flex items-center justify-between p-4 hover:bg-surface-container-low"
              >
                <div>
                  <p className="font-body-md text-body-md text-on-surface">{s.customerName}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {new Date(s.createdAt).toLocaleDateString("pt-BR")} · {s.itemCount} item(ns) ·{" "}
                    {PAYMENT_METHOD[s.paymentMethod]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.status === "CANCELLED" && <Badge tone="error">Cancelada</Badge>}
                  <span className="font-title-lg text-title-lg text-on-surface">
                    {formatBRL(s.total)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </Reveal>
      )}
    </div>
  );
}
