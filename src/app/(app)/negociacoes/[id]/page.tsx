import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/molecules/back-button";
import { getNegotiation } from "@/features/negotiations/queries";
import { requireUserId } from "@/features/auth/queries";
import { NegotiationChat } from "@/features/negotiations/components/negotiation-chat";
import { toChatEvent } from "@/features/negotiations/chat";
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
import { NEGOTIATION_STATUS } from "@/lib/i18n/labels";

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
  const [result, userId] = await Promise.all([
    getNegotiation(id).catch(() => null),
    requireUserId(),
  ]);
  if (!result?.negotiation) notFound();
  const { negotiation: n, events, party } = result;
  const variant = n.offers?.product_variants;

  const available = ACTIONS.filter(
    (a) => !(transition(n.status as NegotiationStatus, a.action, party as Party) instanceof Error),
  );

  return (
    <div className="space-y-lg">
      <BackButton fallback="/negociacoes" label="Negociações" />
      <PageHeader
        title={variant?.products?.name ?? "Negociação"}
        description={`${n.seller?.name} → ${n.buyer?.name}`}
        action={
          <Badge tone={NEGOTIATION_STATUS[n.status].tone}>
            {NEGOTIATION_STATUS[n.status].label}
          </Badge>
        }
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

      <NegotiationChat
        negotiationId={n.id}
        currentUserId={userId}
        counterpartyName={(party === "seller" ? n.buyer?.name : n.seller?.name) ?? "Outra parte"}
        initialEvents={events.map(toChatEvent)}
        open={!["REJECTED", "CANCELLED", "COMPLETED"].includes(n.status)}
      />
    </div>
  );
}
