import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/molecules/action-form";
import { Badge } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";
import { PAYMENT_STATUS } from "@/lib/i18n/labels";
import type { SupplyOrderParty } from "@/features/supply-orders/state";
import { payOrderWithCard, refundSupplyOrderPayment } from "../actions";
import type { SupplyOrderPayment } from "../queries";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const LAST_ATTEMPT: Partial<Record<SupplyOrderPayment["status"], string>> = {
  PENDING: "Há um checkout aberto para este pedido. Você pode continuar de onde parou.",
  FAILED: "O último pagamento foi recusado. Tente novamente, se preferir com outro cartão.",
  EXPIRED: "O último checkout expirou sem pagamento.",
};

const textClass = "font-body-md text-body-md text-on-surface-variant";

/**
 * Payment block of a confirmed supply order (SPEC-014). The reseller pays by
 * card on the Stripe checkout; the supplier follows the status and, as an
 * admin, can refund it (RF-PAY-004).
 */
export function OrderPayment({
  orderId,
  party,
  total,
  payment,
  canRefund,
  supplierReady = true,
}: {
  orderId: string;
  party: SupplyOrderParty;
  total: number;
  payment: SupplyOrderPayment | null;
  /** Supplier admins refund; other supplier members only read. */
  canRefund: boolean;
  /** Supplier side: whether its payout account can receive (VES-27). */
  supplierReady?: boolean;
}) {
  const settled = payment?.status === "PAID" || payment?.status === "REFUNDED";
  const status = PAYMENT_STATUS[settled ? payment.status : "PENDING"];

  return (
    <section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-title-lg text-title-lg text-on-surface">Pagamento</h2>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {settled ? (
        <PaidDetails payment={payment} party={party} />
      ) : party === "supplier" ? (
        supplierReady ? (
          <p className={textClass}>
            Aguardando o pagamento da revendedora. Você será notificado quando ele for aprovado.
          </p>
        ) : (
          <p className={textClass}>
            A revendedora só consegue pagar depois que a fábrica cadastrar a conta de recebimento.{" "}
            <Link
              href="/recebimentos"
              className="font-semibold text-primary-container hover:underline"
            >
              Ir para Recebimentos
            </Link>
          </p>
        )
      ) : (
        <ActionForm action={payOrderWithCard} className="space-y-md">
          <input type="hidden" name="orderId" value={orderId} />
          <p className={textClass}>
            Pague à vista com cartão de crédito. Você será levado ao checkout seguro do Stripe: os
            dados do cartão não passam pelo Vestiq.
          </p>
          {payment && LAST_ATTEMPT[payment.status] && (
            <p className={textClass}>{LAST_ATTEMPT[payment.status]}</p>
          )}
          <div className="flex justify-end">
            <SubmitButton>Pagar {formatBRL(total)} com cartão</SubmitButton>
          </div>
        </ActionForm>
      )}

      {payment?.status === "PAID" && canRefund && (
        <RefundForm
          orderId={orderId}
          remaining={Math.round((payment.amount - payment.refundedAmount) * 100) / 100}
        />
      )}
    </section>
  );
}

function PaidDetails({ payment, party }: { payment: SupplyOrderPayment; party: SupplyOrderParty }) {
  const refunded = payment.status === "REFUNDED";
  return (
    <div className="space-y-1">
      <p className={textClass}>
        {formatBRL(payment.amount)} pagos com cartão de crédito
        {payment.paidAt && ` em ${dateTime(payment.paidAt)}`}.
      </p>
      {party === "supplier" && payment.platformFeePercent !== null && (
        <dl className="grid grid-cols-3 gap-2 rounded-lg bg-surface-container-low p-3 font-body-md text-body-md">
          {[
            { label: "Valor pago", value: formatBRL(payment.amount) },
            {
              label: `Comissão do Vestiq (${payment.platformFeePercent.toLocaleString("pt-BR")}%)`,
              value: formatBRL(payment.platformFeeAmount),
            },
            { label: "Você recebe", value: formatBRL(payment.netAmount) },
          ].map((f) => (
            <div key={f.label}>
              <dt className="text-label-sm text-on-surface-variant">{f.label}</dt>
              <dd className="font-semibold text-on-surface">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {payment.refundedAmount > 0 && (
        <p className={textClass}>
          {refunded
            ? "Valor total reembolsado"
            : `${formatBRL(payment.refundedAmount)} reembolsados`}
          {payment.refundedAt && ` em ${dateTime(payment.refundedAt)}`}
          {party === "reseller" && " no seu cartão"}.
        </p>
      )}
      {payment.refundReason && (
        <p className="font-body-md text-body-md text-on-surface">
          <span className="text-on-surface-variant">Motivo do reembolso: </span>
          {payment.refundReason}
        </p>
      )}
      {refunded && party === "reseller" && (
        <p className={textClass}>Para comprar estes itens de novo, faça um novo pedido.</p>
      )}
    </div>
  );
}

function RefundForm({ orderId, remaining }: { orderId: string; remaining: number }) {
  return (
    <ActionForm
      action={refundSupplyOrderPayment}
      className="space-y-md border-t border-outline-variant pt-md"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <h3 className="font-body-md text-body-md font-semibold text-on-surface">
        Reembolsar pagamento
      </h3>
      <p className={textClass}>
        {formatBRL(remaining)} voltam para o cartão da revendedora. O reembolso não pode ser
        desfeito, e o pedido não poderá ser pago de novo.
      </p>
      <div>
        <label
          htmlFor="refund-reason"
          className="mb-1.5 block font-body-md text-body-md font-semibold text-on-surface"
        >
          Motivo (opcional)
        </label>
        <textarea
          id="refund-reason"
          name="reason"
          rows={2}
          maxLength={500}
          placeholder="Sem estoque para produzir, pedido duplicado..."
          className="field-focus-ring w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md"
        />
      </div>
      <label className="flex items-start gap-2 font-body-md text-body-md text-on-surface">
        <input type="checkbox" name="confirm" required className="mt-1 h-4 w-4" />
        Confirmo o reembolso de {formatBRL(remaining)} à revendedora
      </label>
      <div className="flex justify-end">
        <SubmitButton variant="danger">Reembolsar {formatBRL(remaining)}</SubmitButton>
      </div>
    </ActionForm>
  );
}
