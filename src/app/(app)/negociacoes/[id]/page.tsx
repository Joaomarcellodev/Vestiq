import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getNegotiation } from "@/features/negotiations/queries";
import { negotiationAction } from "@/features/negotiations/actions";
import { transition } from "@/features/negotiations/state-machine";
import type {
  NegotiationAction,
  NegotiationStatus,
  Party,
} from "@/features/negotiations/state-machine";
import { PageHeader } from "@/components/molecules/page-header";
import { Badge, Button } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Negociação" };

const ACTIONS: {
  action: NegotiationAction;
  label: string;
  variant: "primary" | "secondary" | "danger";
}[] = [
  { action: "accept", label: "Aceitar", variant: "primary" },
  { action: "complete", label: "Concluir transferência", variant: "primary" },
  { action: "reject", label: "Recusar", variant: "danger" },
  { action: "cancel", label: "Cancelar", variant: "secondary" },
];

export default async function NegotiationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getNegotiation(id).catch(() => null);
  if (!result?.negotiation) notFound();
  const { negotiation: n, events, party } = result;
  const variant = n.offers?.product_variants;

  const available = ACTIONS.filter(
    (a) => !(transition(n.status as NegotiationStatus, a.action, party as Party) instanceof Error),
  );

  return (
    <div className="space-y-lg">
      <Link
        href="/negociacoes"
        className="font-label-md text-label-md uppercase tracking-wider text-primary-container"
      >
        ← Negociações
      </Link>
      <PageHeader
        title={variant?.products?.name ?? "Negociação"}
        description={`${n.seller?.name} → ${n.buyer?.name}`}
        action={<Badge>{n.status}</Badge>}
      />

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <div className="flex items-center justify-between">
          <span className="font-body-md text-body-md text-on-surface-variant">Quantidade</span>
          <span className="font-body-md text-body-md text-on-surface">{n.quantity} un.</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-outline-variant pt-2 font-title-lg text-title-lg">
          <span className="text-on-surface">Valor proposto</span>
          <span className="text-primary-container">{formatBRL(Number(n.amount))}</span>
        </div>
      </div>

      <section className="space-y-sm">
        <h2 className="font-headline-md text-headline-md text-on-surface">Histórico</h2>
        <ul className="space-y-sm">
          {events.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3"
            >
              <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                {e.type} · {new Date(e.created_at).toLocaleString("pt-BR")}
              </p>
              {e.body && <p className="mt-1 font-body-md text-body-md text-on-surface">{e.body}</p>}
            </li>
          ))}
        </ul>
      </section>

      {available.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {available.map((a) => (
            <form key={a.action} action={negotiationAction}>
              <input type="hidden" name="negotiationId" value={n.id} />
              <input type="hidden" name="action" value={a.action} />
              <Button type="submit" variant={a.variant} size="sm">
                {a.label}
              </Button>
            </form>
          ))}
        </div>
      )}

      {!["REJECTED", "CANCELLED", "COMPLETED"].includes(n.status) && (
        <form action={negotiationAction} className="flex gap-2">
          <input type="hidden" name="negotiationId" value={n.id} />
          <input type="hidden" name="action" value="message" />
          <input
            name="message"
            required
            placeholder="Enviar mensagem..."
            className="field-focus-ring w-full rounded-lg border border-outline-variant px-4 py-3 font-body-md text-body-md"
          />
          <Button type="submit" variant="secondary">
            Enviar
          </Button>
        </form>
      )}
    </div>
  );
}
