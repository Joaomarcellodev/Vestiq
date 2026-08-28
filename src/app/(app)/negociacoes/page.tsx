import type { Metadata } from "next";
import Link from "next/link";
import { listNegotiations } from "@/features/negotiations/queries";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { Badge } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Negociações" };

const STATUS_TONE = {
  PENDING: "warning",
  ACCEPTED: "info",
  COMPLETED: "success",
  REJECTED: "error",
  CANCELLED: "neutral",
} as const;

export default async function NegotiationsPage() {
  const negotiations = await listNegotiations();
  const received = negotiations.filter((n) => n.direction === "received");
  const sent = negotiations.filter((n) => n.direction === "sent");

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Painel de negociações"
        description="Solicitações de transferência de estoque da sua rede."
      />

      {negotiations.length === 0 ? (
        <EmptyState icon="swap_horiz" title="Nenhuma negociação" />
      ) : (
        <>
          {[
            { title: "Recebidas", list: received },
            { title: "Enviadas", list: sent },
          ].map((group) => (
            <section key={group.title}>
              <h2 className="mb-sm font-headline-md text-headline-md text-on-surface">
                {group.title}
              </h2>
              {group.list.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant">Nada por aqui.</p>
              ) : (
                <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
                  {group.list.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={`/negociacoes/${n.id}`}
                        className="flex items-center justify-between p-4 hover:bg-surface-container-low"
                      >
                        <div>
                          <p className="font-body-md text-body-md text-on-surface">
                            {n.productName}
                          </p>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            {n.counterparty} · {n.quantity} un.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={STATUS_TONE[n.status]}>{n.status}</Badge>
                          <span className="font-title-lg text-title-lg text-on-surface">
                            {formatBRL(n.amount)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
