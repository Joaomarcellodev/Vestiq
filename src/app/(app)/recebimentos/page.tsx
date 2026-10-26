import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { getFactoryPayoutAccount } from "@/features/payments/queries";
import { syncPayoutAccount } from "@/features/payments/sync";
import { BackButton } from "@/components/molecules/back-button";
import { PageHeader } from "@/components/molecules/page-header";
import { Badge, Button, Icon } from "@/components/atoms";
import { PAYOUT_ACCOUNT_STATUS } from "@/lib/i18n/labels";

export const metadata: Metadata = { title: "Recebimentos" };

const percent = (value: number) =>
  `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

/**
 * VES-27 — where a factory receives the payments of its supply orders: its
 * Stripe Connect account and the platform's commission.
 */
export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ cadastro?: string }>;
}) {
  const org = await requireActiveOrganization();
  if (org.type !== "FACTORY") notFound();
  const isAdmin = org.role === "FACTORY_ADMIN" || org.role === "PLATFORM_ADMIN";
  const { cadastro } = await searchParams;

  let account = await getFactoryPayoutAccount(org.id);
  // Back from the Stripe onboarding: read the account's status now. A failure
  // only keeps the previous status until the next payment re-checks it.
  if (cadastro === "retorno" && account.stripeAccountId) {
    await syncPayoutAccount(account.stripeAccountId).catch((err) =>
      console.error("[payments] syncPayoutAccount failed", err),
    );
    account = await getFactoryPayoutAccount(org.id);
  }

  const state = account.stripeAccountId
    ? (PAYOUT_ACCOUNT_STATUS[account.transfersStatus as keyof typeof PAYOUT_ACCOUNT_STATUS] ??
      PAYOUT_ACCOUNT_STATUS.pending)
    : PAYOUT_ACCOUNT_STATUS.none;
  const ready = account.stripeAccountId !== null && account.transfersStatus === "active";

  return (
    <div className="space-y-lg">
      <BackButton fallback="/mais" label="Voltar" />
      <PageHeader
        title="Recebimentos"
        description="Onde a fábrica recebe os pagamentos dos pedidos de abastecimento"
      />

      <section className="space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-title-lg text-title-lg text-on-surface">Conta de recebimento</h2>
          <Badge tone={state.tone}>{state.label}</Badge>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">{state.description}</p>

        {isAdmin ? (
          <form action="/api/payments/onboarding" method="get" className="flex justify-end">
            <Button type="submit" variant={ready ? "secondary" : "primary"}>
              <Icon name="open_in_new" size={18} />
              {account.stripeAccountId
                ? ready
                  ? "Revisar dados no Stripe"
                  : "Continuar cadastro no Stripe"
                : "Cadastrar conta de recebimento"}
            </Button>
          </form>
        ) : (
          <p className="font-body-md text-body-md text-on-surface-variant">
            Só o administrador da fábrica pode cadastrar a conta.
          </p>
        )}
      </section>

      <section className="space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <h2 className="font-title-lg text-title-lg text-on-surface">Comissão do Vestiq</h2>
        <p className="font-headline-md text-headline-md text-primary-container">
          {percent(account.platformFeePercent)}
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Em cada pedido pago, o valor vai para a sua conta de recebimento, menos a comissão. O
          Stripe repassa o saldo para a sua conta bancária. A comissão é definida pelo Vestiq.
        </p>
      </section>
    </div>
  );
}
