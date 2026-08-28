/** BRL helpers — ADR-0008 (moeda única: Real). */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number): string {
  return brl.format(Number.isFinite(value) ? value : 0);
}

/** "R$ 1.234,56" | "1.234,56" | "1234.56" → 1234.56 (number, 2 decimals). */
export function parseBRL(input: string): number {
  const cleaned = input
    .replace(/[R$\s]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** Estimated margin as a 0..1 ratio, or null when retail price is 0. BR-CAT-06. */
export function estimatedMargin(cost: number, retail: number): number | null {
  if (!retail || retail <= 0) return null;
  return (retail - cost) / retail;
}

export function formatPercent(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return "--";
  return `${(ratio * 100).toFixed(1)}%`;
}
