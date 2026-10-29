import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/molecules/back-button";
import { getNegotiation } from "@/features/negotiations/queries";
import { requireUserId } from "@/features/auth/queries";
import { NegotiationChat } from "@/features/negotiations/components/negotiation-chat";
import { NegotiationProductSummary } from "@/features/negotiations/components/negotiation-product";
import { toChatEvent } from "@/features/negotiations/chat";
import { negotiationAction } from "@/features/negotiations/actions";
import { MESSAGE_MAX_LENGTH } from "@/features/negotiations/validation";
import { transition } from "@/features/negotiations/state-machine";
import type {
  NegotiationAction,
  NegotiationStatus,
  Party,
} from "@/features/negotiations/state-machine";
import { PageHeader } from "@/components/molecules/page-header";
import { ActionForm, SubmitButton } from "@/components/molecules/action-form";
import Link from "next/link";
import { Badge, Icon } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";
import { NEGOTIATION_STATUS } from "@/lib/i18n/labels";
import { getTransactionReviews } from "@/features/reviews/queries";
import { ReviewSection } from "@/features/reviews/components/review-section";

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
  const { negotiation: n, product, events, party } = result;

  const counterparty =
    party === "seller"
      ? { id: n.buyer_org_id, name: n.buyer?.name }
      : { id: n.seller_org_id, name: n.seller?.name };

  // VES-42: a completed transfer can be rated by both sides.
  const reviews =
    n.status === "COMPLETED" ? await getTransactionReviews("negotiation", n.id) : null;

  const available = ACTIONS.filter(
    (a) => !(transition(n.status as NegotiationStatus, a.action, party as Party) instanceof Error),
  );

  return (
    <div className="space-y-lg">
      <BackButton fallback="/negociacoes" label="Negociações" />
      <PageHeader
        title={product?.name ?? "Negociação"}
        description={`${n.seller?.name} → ${n.buyer?.name}`}
        action={
          <Badge tone={NEGOTIATION_STATUS[n.status].tone}>
            {NEGOTIATION_STATUS[n.status].label}
          </Badge>
        }
      />

      {/* VES-65 — who she is dealing with. */}
      <Link
        href={`/rede/revendedoras/${counterparty.id}`}
        className="inline-flex items-center gap-1 font-body-md text-body-md font-semibold text-primary-container hover:underline"
      >
        <Icon name="person" size={16} />
        Ver perfil de {counterparty.name ?? "outra parte"}
      </Link>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <NegotiationProductSummary product={product} size={64} />
        <div className="mt-3 flex items-center justify-between border-t border-outline-variant pt-3">
          <span className="font-body-md text-body-md text-on-surface-variant">Quantidade</span>
          <span className="font-body-md text-body-md text-on-surface">{n.quantity} un.</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-outline-variant pt-2 font-title-lg text-title-lg">
          <span className="text-on-surface">Valor proposto</span>
          <span className="text-primary-container">{formatBRL(Number(n.amount))}</span>
        </div>
      </div>

      {available.length > 0 && (
        <ActionForm action={negotiationAction} className="space-y-sm">
          <input type="hidden" name="negotiationId" value={n.id} />
          {/* VES-105: the seller can say why she turns the proposal down; it shows in the chat. */}
          {available.some((a) => a.action === "reject") && (
            <div>
              <label
                htmlFor="reject-reason"
                className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface"
              >
                Motivo da recusa (opcional)
              </label>
              <textarea
                id="reject-reason"
                name="message"
                rows={2}
                maxLength={MESSAGE_MAX_LENGTH}
                placeholder="Ex.: valor abaixo do mínimo, peça reservada..."
                aria-describedby="reject-reason-hint"
                className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md"
              />
              <p
                id="reject-reason-hint"
                className="mt-1 font-label-sm text-label-sm text-on-surface-variant"
              >
                Só é enviado se você recusar; a compradora vê o motivo na conversa.
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {available.map((a) => (
              <SubmitButton
                key={a.action}
                name="action"
                value={a.action}
                variant={a.variant}
                size="sm"
              >
                {a.label}
              </SubmitButton>
            ))}
          </div>
        </ActionForm>
      )}

      {reviews && (
        <ReviewSection
          kind="negotiation"
          transactionId={n.id}
          counterpartyName={counterparty.name ?? "a outra loja"}
          mine={reviews.mine}
          received={reviews.received}
        />
      )}

      <NegotiationChat
        negotiationId={n.id}
        currentUserId={userId}
        counterpartyName={counterparty.name ?? "Outra parte"}
        initialEvents={events.map(toChatEvent)}
        open={!["REJECTED", "CANCELLED", "COMPLETED"].includes(n.status)}
      />
    </div>
  );
}
