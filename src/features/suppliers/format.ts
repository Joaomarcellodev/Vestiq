import { formatBRL } from "@/lib/utils/currency";

/** "R$ 79,90", "R$ 79,90 – R$ 89,90" or "Preço sob consulta" (BR-SUP-05). */
export function priceRangeLabel(min: number | null, max: number | null): string {
  if (min === null || max === null) return "Preço sob consulta";
  return min === max ? formatBRL(min) : `${formatBRL(min)} – ${formatBRL(max)}`;
}

/** "Preto / P", "Preto", "P" or "Único". */
export function variantLabel(color: string | null, size: string | null): string {
  return [color, size].filter(Boolean).join(" / ") || "Único";
}
