import { formatBRL } from "@/lib/utils/currency";

/**
 * Subtotal, discount and total of a recorded sale (VES-82, BR-SALE-02), so the
 * detail explains the gap between the items and the amount charged.
 */
export function SaleTotals({
  subtotal,
  discount,
  total,
  paymentLabel,
}: {
  subtotal: number;
  discount: number;
  total: number;
  paymentLabel: string;
}) {
  return (
    <div className="space-y-xs p-4">
      <div className="flex items-center justify-between font-body-md text-body-md">
        <span className="text-on-surface-variant">Subtotal</span>
        <span className="text-on-surface">{formatBRL(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between font-body-md text-body-md">
        <span className="text-on-surface-variant">Desconto</span>
        <span className="text-on-surface">
          {discount > 0 ? `− ${formatBRL(discount)}` : formatBRL(0)}
        </span>
      </div>
      <div className="flex items-center justify-between font-title-lg text-title-lg">
        <span>Total · {paymentLabel}</span>
        <span className="text-primary-container">{formatBRL(total)}</span>
      </div>
    </div>
  );
}
