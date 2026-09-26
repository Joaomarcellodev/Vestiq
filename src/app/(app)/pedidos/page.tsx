import type { Metadata } from "next";
import Link from "next/link";
import { listSupplyOrders } from "@/features/supply-orders/queries";
import { orderCode, type SupplyOrderStatus } from "@/features/supply-orders/state";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { FilterTabs } from "@/components/molecules/filter-tabs";
import { Badge, Button, Icon } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";
import { SUPPLY_ORDER_STATUS } from "@/lib/i18n/labels";

export const metadata: Metadata = { title: "Pedidos" };

const STATUS_BY_PARAM: Record<string, SupplyOrderStatus> = {
  pendentes: "PENDING",
  confirmados: "CONFIRMED",
  recusados: "REJECTED",
  cancelados: "CANCELLED",
};

export default async function SupplyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const current = status && STATUS_BY_PARAM[status] ? status : "";
  const [org, orders] = await Promise.all([
    requireActiveOrganization(),
    listSupplyOrders(STATUS_BY_PARAM[current]),
  ]);
  const isReseller = org.type === "RESELLER";

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Pedidos de abastecimento"
        description={
          isReseller
            ? "Pedidos que você fez aos seus fornecedores."
            : "Pedidos que as revendedoras da sua rede enviaram."
        }
        action={
          isReseller ? (
            <Link href="/fornecedores?view=fornecedores" className="block">
              <Button size="md" className="w-full sm:w-auto">
                <Icon name="add" size={18} />
                Novo pedido
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="overflow-x-auto">
        <FilterTabs
          basePath="/pedidos"
          param="status"
          current={current}
          tabs={[
            { value: "", label: "Todos" },
            { value: "pendentes", label: "Pendentes" },
            { value: "confirmados", label: "Confirmados" },
            { value: "recusados", label: "Recusados" },
            { value: "cancelados", label: "Cancelados" },
          ]}
        />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon="receipt_long"
          title={current ? "Nenhum pedido com este status" : "Nenhum pedido ainda"}
          description={
            current
              ? undefined
              : isReseller
                ? "Abra um fornecedor e toque em Fazer pedido para repor seu estoque."
                : "Quando uma revendedora fizer um pedido, ele aparece aqui."
          }
        />
      ) : (
        <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/pedidos/${o.id}`}
                className="flex items-center justify-between gap-3 p-4 hover:bg-surface-container-low"
              >
                <div className="min-w-0">
                  <p className="truncate font-body-md text-body-md font-semibold text-on-surface">
                    {o.counterparty}
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {orderCode(o.id)} · {new Date(o.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                    {o.totalQuantity} peça{o.totalQuantity === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <Badge tone={SUPPLY_ORDER_STATUS[o.status].tone}>
                    {SUPPLY_ORDER_STATUS[o.status].label}
                  </Badge>
                  <span className="font-title-lg text-title-lg text-on-surface">
                    {formatBRL(o.totalAmount)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
