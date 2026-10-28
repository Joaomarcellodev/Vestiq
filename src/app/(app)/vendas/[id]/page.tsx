import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/molecules/back-button";
import { getSale } from "@/features/sales/queries";
import { cancelSale } from "@/features/sales/actions";
import { SaleCancellation } from "@/features/sales/components/sale-cancellation";
import { SaleTotals } from "@/features/sales/components/sale-totals";
import { PageHeader } from "@/components/molecules/page-header";
import { ActionForm, SubmitButton } from "@/components/molecules/action-form";
import { Badge } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";
import { PAYMENT_METHOD } from "@/lib/i18n/labels";

export const metadata: Metadata = { title: "Venda" };

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sale = await getSale(id).catch(() => null);
  if (!sale) notFound();

  const items = sale.sale_items ?? [];

  return (
    <div className="space-y-lg">
      <BackButton fallback="/vendas" label="Vendas" />
      <PageHeader
        title={formatBRL(Number(sale.total))}
        description={
          <>
            {/* VES-104: the customer's name leads back to the customer. */}
            {sale.customer_id && sale.customers ? (
              <Link
                href={`/clientes/${sale.customer_id}`}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {sale.customers.name}
              </Link>
            ) : (
              "Venda avulsa"
            )}
            {` · ${new Date(sale.created_at).toLocaleString("pt-BR")}`}
          </>
        }
        action={sale.status === "CANCELLED" ? <Badge tone="error">Cancelada</Badge> : undefined}
      />

      <section className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-body-md text-body-md text-on-surface">
                {it.product_variants?.products?.name ?? "Item"}
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {[it.product_variants?.color, it.product_variants?.size]
                  .filter(Boolean)
                  .join(" / ") || "Único"}{" "}
                · {it.quantity} × {formatBRL(Number(it.unit_price))}
              </p>
            </div>
            <span className="font-body-md text-body-md text-on-surface">
              {formatBRL(Number(it.line_total))}
            </span>
          </div>
        ))}
        <SaleTotals
          subtotal={Number(sale.subtotal)}
          discount={Number(sale.discount)}
          total={Number(sale.total)}
          paymentLabel={PAYMENT_METHOD[sale.payment_method]}
        />
      </section>

      {sale.status === "CANCELLED" && (
        <SaleCancellation
          reason={sale.cancel_reason}
          cancelledAt={sale.cancelled_at}
          cancelledBy={sale.cancelledByName}
        />
      )}

      {sale.status === "CONFIRMED" && (
        <ActionForm
          action={cancelSale}
          className="space-y-sm rounded-xl border border-outline-variant p-lg"
        >
          <input type="hidden" name="saleId" value={sale.id} />
          <label
            htmlFor="sale-cancel-reason"
            className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant"
          >
            Cancelar venda
          </label>
          <input
            id="sale-cancel-reason"
            name="reason"
            required
            placeholder="Motivo do cancelamento"
            className="field-focus-ring w-full rounded-lg border border-outline-variant px-3 py-3 font-body-md text-body-md"
          />
          <SubmitButton variant="danger" size="sm">
            Cancelar e estornar estoque
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
