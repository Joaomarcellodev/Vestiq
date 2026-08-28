/** Sale total calculations — SPEC-007 BR-SALE-02. */

export interface SaleLineInput {
  quantity: number;
  unitPrice: number;
}

export interface SaleTotals {
  subtotal: number;
  discount: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function lineTotal(line: SaleLineInput): number {
  return round2(line.quantity * line.unitPrice);
}

export function computeTotals(lines: SaleLineInput[], discount: number): SaleTotals {
  const subtotal = round2(lines.reduce((acc, l) => acc + lineTotal(l), 0));
  const safeDiscount = round2(Math.max(0, discount));
  return {
    subtotal,
    discount: safeDiscount,
    total: round2(subtotal - safeDiscount),
  };
}

/** Returns an error message when the discount is invalid, else null. */
export function validateDiscount(subtotal: number, discount: number): string | null {
  if (discount < 0) return "Desconto não pode ser negativo";
  if (discount > subtotal) return "Desconto maior que o subtotal";
  return null;
}

export function averageTicket(revenue: number, saleCount: number): number {
  if (saleCount <= 0) return 0;
  return Math.round((revenue / saleCount) * 100) / 100;
}
