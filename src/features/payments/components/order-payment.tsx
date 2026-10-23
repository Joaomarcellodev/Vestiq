import { ActionForm, SubmitButton } from "@/components/molecules/action-form";
import { Badge } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";
import { PAYMENT_STATUS } from "@/lib/i18n/labels";
import type { SupplyOrderParty } from "@/features/supply-orders/state";
import { payOrderWithCard } from "../actions";
import type { SupplyOrderPayment } from "../queries";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const LAST_ATTEMPT: Partial<Record<SupplyOrderPayment["status"], string>> = {
  PENDING: "Há um checkout aberto para este pedido. Você pode continuar de onde parou.",
  FAILED: "O último pagamento foi recusado. Tente novamente, se preferir com outro cartão.",
  EXPIRED: "O último checkout expirou sem pagamento.",
};

/**
 * Payment block of a confirmed supply order (SPEC-014). The reseller pays by
 * card on the Stripe checkout; the supplier follows the status.
 */
export function OrderPayment({
  orderId,
  party,
  total,
  payment,
}: {
  orderId: string;
  party: SupplyOrderParty;
  total: number;
  payment: SupplyOrderPayment | null;
}) {
  const paid = payment?.status === "PAID";
  const status = PAYMENT_STATUS[payment?.status === "PAID" ? "PAID" : "PENDING"];

  return (
    <section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-title-lg text-title-lg text-on-surface">Pagamento</h2>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {paid ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          {formatBRL(payment.amount)} pagos com cartão de crédito
          {payment.paidAt && ` em ${dateTime(payment.paidAt)}`}.
        </p>
      ) : party === "supplier" ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          Aguardando o pagamento da revendedora. Você será notificado quando ele for aprovado.
        </p>
      ) : (
        <ActionForm action={payOrderWithCard} className="space-y-md">
          <input type="hidden" name="orderId" value={orderId} />
          <p className="font-body-md text-body-md text-on-surface-variant">
            Pague à vista com cartão de crédito. Você será levado ao checkout seguro do Stripe: os
            dados do cartão não passam pelo Vestiq.
          </p>
          {payment && LAST_ATTEMPT[payment.status] && (
            <p className="font-body-md text-body-md text-on-surface-variant">
              {LAST_ATTEMPT[payment.status]}
            </p>
          )}
          <div className="flex justify-end">
            <SubmitButton>Pagar {formatBRL(total)} com cartão</SubmitButton>
          </div>
        </ActionForm>
      )}
    </section>
  );
}
