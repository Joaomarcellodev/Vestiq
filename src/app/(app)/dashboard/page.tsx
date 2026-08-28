import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/features/auth/queries";
import { getResellerDashboard } from "@/features/dashboard/queries";
import {
  SalesTrendChart,
  TopProductsChart,
} from "@/features/dashboard/components/dashboard-charts";
import { StatCard } from "@/components/molecules/stat-card";
import { Button, Icon } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [user, data] = await Promise.all([getCurrentUser(), getResellerDashboard()]);
  const name =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "";

  return (
    <div className="space-y-lg">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Bom dia{name ? `, ${name}` : ""}.
          </h1>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            Resumo de {data.orgName} — {new Date().toLocaleDateString("pt-BR", { month: "long" })}.
          </p>
        </div>
        <Link href="/vendas/nova" className="shrink-0">
          <Button size="md">
            <Icon name="add_circle" size={18} />
            Registrar venda
          </Button>
        </Link>
      </header>

      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Vendas no mês"
          value={formatBRL(data.monthRevenue)}
          hint={`${data.monthSales} venda(s)`}
        />
        <StatCard label="Ticket médio" value={formatBRL(data.averageTicket)} />
        <StatCard
          label="Itens em estoque"
          value={String(data.stockUnits)}
          hint={`${data.variantCount} variações`}
        />
        <StatCard
          label="Negociações pendentes"
          value={String(data.pendingNegotiations)}
          accent={data.pendingNegotiations > 0 ? "ação necessária" : undefined}
        />
      </div>

      <div className="grid gap-md lg:grid-cols-2">
        <SalesTrendChart data={data.salesTrend} />
        <TopProductsChart data={data.topProducts} />
      </div>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <div className="flex items-center gap-2">
          <Icon name="warning" size={20} className="text-error" />
          <h2 className="font-title-lg text-title-lg text-on-surface">Alerta de inventário</h2>
        </div>
        {data.lowStock.length === 0 ? (
          <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
            Nenhum produto com estoque baixo.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-outline-variant">
            {data.lowStock.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 truncate font-body-md text-body-md text-on-surface">
                  {item.label}
                </span>
                <span className="shrink-0 font-body-md text-body-md font-semibold text-error">
                  {item.stock} restante{item.stock > 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
