import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/molecules/back-button";
import { getSale } from "@/features/sales/queries";
import { cancelSale } from "@/features/sales/actions";
import { PageHeader } from "@/components/molecules/page-header";
import { Badge, Button } from "@/components/atoms";
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
        description={`${sale.customers?.name ?? "Venda avulsa"} · ${new Date(sale.created_at).toLocaleString("pt-BR")}`}
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
        <div className="flex items-center justify-between p-4 font-title-lg text-title-lg">
          <span>Total · {PAYMENT_METHOD[sale.payment_method]}</span>
          <span className="text-primary-container">{formatBRL(Number(sale.total))}</span>
        </div>
      </section>

      {sale.status === "CONFIRMED" && (
        <form
          action={cancelSale}
          className="space-y-sm rounded-xl border border-outline-variant p-lg"
        >
          <input type="hidden" name="saleId" value={sale.id} />
          <label className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
            Cancelar venda
          </label>
          <input
            name="reason"
            required
            placeholder="Motivo do cancelamento"
            className="field-focus-ring w-full rounded-lg border border-outline-variant px-3 py-3 font-body-md text-body-md"
          />
          <Button type="submit" variant="danger" size="sm">
            Cancelar e estornar estoque
          </Button>
        </form>
      )}
    </div>
  );
}
