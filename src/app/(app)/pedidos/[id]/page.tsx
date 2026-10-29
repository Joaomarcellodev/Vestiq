import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupplyOrder } from "@/features/supply-orders/queries";
import {
  advanceSupplyOrder,
  cancelSupplyOrder,
  receiveSupplyOrder,
  respondSupplyOrder,
} from "@/features/supply-orders/actions";
import { availableActions, isAccepted, orderCode } from "@/features/supply-orders/state";
import { variantLabel } from "@/features/suppliers/format";
import { BackButton } from "@/components/molecules/back-button";
import { PageHeader } from "@/components/molecules/page-header";
import { ActionForm, SubmitButton } from "@/components/molecules/action-form";
import { ConfirmButton } from "@/components/molecules/confirm-button";
import { Badge } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";
import { SUPPLY_ORDER_STATUS } from "@/lib/i18n/labels";
import { OrderPayment } from "@/features/payments/components/order-payment";
import { getFactoryPayoutAccount, getSupplyOrderPayment } from "@/features/payments/queries";
import { getTransactionReviews } from "@/features/reviews/queries";
import { ReviewSection } from "@/features/reviews/components/review-section";
import { syncCheckout } from "@/features/payments/sync";

export const metadata: Metadata = { title: "Pedido" };

// Rendered on the server (UTC on Netlify) — pin the Brazilian timezone.
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

const textareaClass =
  "field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md";

export default async function SupplyOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const [{ id }, { checkout }] = await Promise.all([params, searchParams]);
  const order = await getSupplyOrder(id);
  if (!order) notFound();

  // Back from the Stripe checkout: record its outcome now rather than wait for
  // the webhook. A failure here only delays the status — the webhook settles it.
  const accepted = isAccepted(order.status);
  if (accepted && checkout) {
    await syncCheckout(order.id, checkout).catch((err) =>
      console.error("[payments] syncCheckout failed", err),
    );
  }
  const [payment, reviews] = await Promise.all([
    accepted ? getSupplyOrderPayment(order.id) : null,
    // VES-42: a delivered order can be rated by both sides.
    order.status === "DELIVERED" ? getTransactionReviews("supply_order", order.id) : null,
  ]);
  // VES-27: the supplier sees whether its payout account can receive this payment.
  const payout =
    accepted && order.party === "supplier" && !payment
      ? await getFactoryPayoutAccount(order.supplierId)
      : null;

  const actions = availableActions(order.status, order.party, { canRespond: order.canRespond });
  const status = SUPPLY_ORDER_STATUS[order.status];

  const history = [
    { label: "Pedido enviado", at: order.createdAt, note: order.note, noteLabel: "Observação" },
    ...(order.respondedAt
      ? [
          {
            label:
              order.status === "REJECTED"
                ? "Recusado pelo fornecedor"
                : "Confirmado pelo fornecedor",
            at: order.respondedAt,
            note: order.responseNote,
            noteLabel: "Mensagem do fornecedor",
          },
        ]
      : []),
    ...(payment?.paidAt && (payment.status === "PAID" || payment.status === "REFUNDED")
      ? [{ label: "Pagamento aprovado", at: payment.paidAt, note: null, noteLabel: "" }]
      : []),
    ...(payment?.refundedAt
      ? [
          {
            label: payment.status === "REFUNDED" ? "Pagamento reembolsado" : "Reembolso parcial",
            at: payment.refundedAt,
            note: payment.refundReason,
            noteLabel: "Motivo",
          },
        ]
      : []),
    ...(order.cancelledAt
      ? [
          {
            label: "Cancelado pela revendedora",
            at: order.cancelledAt,
            note: order.cancelReason,
            noteLabel: "Motivo",
          },
        ]
      : []),
    // VES-32 — fulfillment stages
    ...(order.productionStartedAt
      ? [{ label: "Em produção", at: order.productionStartedAt, note: null, noteLabel: "" }]
      : []),
    ...(order.shippedAt
      ? [
          {
            label: "Enviado pelo fornecedor",
            at: order.shippedAt,
            note: order.trackingCode,
            noteLabel: "Código de rastreio",
          },
        ]
      : []),
    ...(order.deliveredAt
      ? [
          {
            label: "Recebido pela revendedora",
            at: order.deliveredAt,
            note: "As peças entraram no estoque da revendedora.",
            noteLabel: "Estoque",
          },
        ]
      : []),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="space-y-lg">
      <BackButton fallback="/pedidos" label="Pedidos" />
      <PageHeader
        title={`Pedido ${orderCode(order.id)}`}
        description={
          order.party === "reseller" ? `Para ${order.supplierName}` : `De ${order.resellerName}`
        }
        action={<Badge tone={status.tone}>{status.label}</Badge>}
      />

      <section className="grid gap-md sm:grid-cols-3">
        {[
          { label: "Fornecedor", value: order.supplierName },
          { label: "Revendedora", value: order.resellerName },
          { label: "Enviado em", value: dateTime(order.createdAt) },
        ].map((f) => (
          <div
            key={f.label}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface"
          >
            <p className="font-label-sm text-label-sm text-on-surface-variant">{f.label}</p>
            <p className="font-body-md text-body-md font-semibold text-on-surface">{f.value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-sm">
        <h2 className="font-headline-md text-headline-md text-on-surface">Itens</h2>
        <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-surface">
          <table className="w-full text-left font-body-md text-body-md">
            <thead className="text-on-surface-variant">
              <tr className="border-b border-outline-variant">
                <th scope="col" className="p-3 font-semibold">
                  Produto
                </th>
                <th scope="col" className="p-3 font-semibold">
                  Variação
                </th>
                <th scope="col" className="p-3 text-right font-semibold">
                  Qtd.
                </th>
                <th scope="col" className="p-3 text-right font-semibold">
                  Unitário
                </th>
                <th scope="col" className="p-3 text-right font-semibold">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-on-surface">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="p-3">
                    {item.productId && order.party === "reseller" ? (
                      <Link
                        href={`/fornecedores/produtos/${item.productId}`}
                        className="font-semibold text-primary-container hover:underline"
                      >
                        {item.productName}
                      </Link>
                    ) : (
                      <span className="font-semibold">{item.productName}</span>
                    )}
                  </td>
                  <td className="p-3 text-on-surface-variant">
                    {variantLabel(item.color, item.size)}
                    {item.sku && <span className="block text-label-sm">SKU {item.sku}</span>}
                  </td>
                  <td className="p-3 text-right">{item.quantity}</td>
                  <td className="whitespace-nowrap p-3 text-right">{formatBRL(item.unitPrice)}</td>
                  <td className="whitespace-nowrap p-3 text-right">{formatBRL(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-outline-variant font-title-lg text-title-lg">
                <td className="p-3" colSpan={2}>
                  Total
                </td>
                <td className="p-3 text-right">{order.totalQuantity}</td>
                <td className="p-3" />
                <td className="whitespace-nowrap p-3 text-right text-primary-container">
                  {formatBRL(order.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {accepted && (
        <OrderPayment
          orderId={order.id}
          party={order.party}
          total={order.totalAmount}
          payment={payment}
          canRefund={order.canRespond}
          supplierReady={!payout || payout.transfersStatus === "active"}
        />
      )}

      <section className="space-y-sm">
        <h2 className="font-headline-md text-headline-md text-on-surface">Histórico</h2>
        <ul className="space-y-sm">
          {history.map((h) => (
            <li
              key={h.label}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3"
            >
              <p className="font-body-md text-body-md font-semibold text-on-surface-variant">
                {h.label}
                <span className="ml-2 font-normal">{dateTime(h.at)}</span>
              </p>
              {h.note && (
                <p className="mt-1 whitespace-pre-line font-body-md text-body-md text-on-surface">
                  <span className="text-on-surface-variant">{h.noteLabel}: </span>
                  {h.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {actions.includes("confirm") && (
        <ActionForm
          action={respondSupplyOrder}
          className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface"
        >
          <input type="hidden" name="orderId" value={order.id} />
          <h2 className="font-title-lg text-title-lg text-on-surface">Responder pedido</h2>
          <div>
            <label
              htmlFor="response-note"
              className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface"
            >
              Mensagem para a revendedora (opcional)
            </label>
            <textarea
              id="response-note"
              name="note"
              rows={3}
              maxLength={1000}
              placeholder="Prazo de entrega, motivo da recusa..."
              className={textareaClass}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <ConfirmButton
              name="decision"
              value="reject"
              title="Recusar este pedido?"
              description="A revendedora é avisada, com a mensagem acima se você escreveu uma. Não dá para desfazer: para atender, ela precisa fazer um novo pedido."
              confirmLabel="Recusar pedido"
              cancelLabel="Voltar ao pedido"
            >
              Recusar pedido
            </ConfirmButton>
            <SubmitButton name="decision" value="confirm">
              Confirmar pedido
            </SubmitButton>
          </div>
        </ActionForm>
      )}

      {actions.includes("cancel") && (
        <ActionForm
          action={cancelSupplyOrder}
          className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface"
        >
          <input type="hidden" name="orderId" value={order.id} />
          <p className="font-body-md text-body-md text-on-surface-variant">
            Aguardando resposta do fornecedor. Você pode cancelar enquanto ele não responder.
          </p>
          <div>
            <label
              htmlFor="cancel-reason"
              className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface"
            >
              Motivo do cancelamento (opcional)
            </label>
            <textarea
              id="cancel-reason"
              name="reason"
              rows={2}
              maxLength={1000}
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end">
            <SubmitButton variant="secondary">Cancelar pedido</SubmitButton>
          </div>
        </ActionForm>
      )}

      {(actions.includes("start_production") || actions.includes("ship")) && (
        <section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface">
          <h2 className="font-title-lg text-title-lg text-on-surface">Atualizar pedido</h2>
          {actions.includes("start_production") && (
            <ActionForm
              action={advanceSupplyOrder}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="stage" value="IN_PRODUCTION" />
              <p className="font-body-md text-body-md text-on-surface-variant">
                Avise a revendedora que as peças estão sendo produzidas.
              </p>
              <SubmitButton variant="secondary">Marcar em produção</SubmitButton>
            </ActionForm>
          )}
          {actions.includes("ship") && (
            <ActionForm action={advanceSupplyOrder} className="space-y-sm">
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="stage" value="SHIPPED" />
              <div>
                <label
                  htmlFor="tracking-code"
                  className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface"
                >
                  Código de rastreio (opcional)
                </label>
                <input
                  id="tracking-code"
                  name="trackingCode"
                  maxLength={100}
                  placeholder="Ex.: BR123456789BR"
                  className={textareaClass}
                />
              </div>
              <div className="flex justify-end">
                <SubmitButton>Marcar como enviado</SubmitButton>
              </div>
            </ActionForm>
          )}
        </section>
      )}

      {actions.includes("receive") && (
        <ActionForm
          action={receiveSupplyOrder}
          className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface"
        >
          <input type="hidden" name="orderId" value={order.id} />
          <h2 className="font-title-lg text-title-lg text-on-surface">Recebeu o pedido?</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Ao confirmar o recebimento, as {order.totalQuantity} peças entram no seu estoque.
          </p>
          <div className="flex justify-end">
            <SubmitButton>Confirmar recebimento</SubmitButton>
          </div>
        </ActionForm>
      )}

      {reviews && (
        <ReviewSection
          kind="supply_order"
          transactionId={order.id}
          counterpartyName={order.party === "reseller" ? order.supplierName : order.resellerName}
          mine={reviews.mine}
          received={reviews.received}
        />
      )}
    </div>
  );
}
