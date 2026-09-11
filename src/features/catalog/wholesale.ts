import { z } from "zod";

/**
 * Wholesale conditions a factory sets per product — minimum order and size
 * grid (SPEC-004 RF-PROD-007, BR-CAT-11..14).
 */

export const MIN_ORDER_MAX = 10_000;
export const SIZE_GRID_MAX_SIZES = 20;
export const SIZE_MAX_LENGTH = 20;

export const SIZE_GRID_PRESETS: { label: string; sizes: string[] }[] = [
  { label: "P ao GG", sizes: ["P", "M", "G", "GG"] },
  { label: "PP ao GG", sizes: ["PP", "P", "M", "G", "GG"] },
  { label: "36 ao 46", sizes: ["36", "38", "40", "42", "44", "46"] },
];

/**
 * Parses the free-text grid ("P, M, G") into an ordered list of sizes: trims,
 * drops blanks and repeats (case-insensitive — the first spelling wins).
 */
export function parseSizeGrid(raw: string): string[] {
  const seen = new Set<string>();
  const sizes: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const size = part.trim();
    const key = size.toLowerCase();
    if (!size || seen.has(key)) continue;
    seen.add(key);
    sizes.push(size);
  }
  return sizes;
}

export function formatSizeGrid(sizes: string[]): string {
  return sizes.join(", ");
}

export function minOrderLabel(minOrderQuantity: number): string {
  return minOrderQuantity > 1 ? `Pedido mínimo: ${minOrderQuantity} peças` : "Sem pedido mínimo";
}

export const wholesaleSchema = z.object({
  minOrderQuantity: z.coerce
    .number({ invalid_type_error: "Informe o pedido mínimo" })
    .int("O pedido mínimo deve ser um número inteiro de peças")
    .min(1, "O pedido mínimo deve ser de pelo menos 1 peça")
    .max(MIN_ORDER_MAX, `O pedido mínimo pode ser de até ${MIN_ORDER_MAX} peças`),
  sizeGrid: z
    .array(
      z.string().max(SIZE_MAX_LENGTH, `Cada tamanho pode ter até ${SIZE_MAX_LENGTH} caracteres`),
    )
    .max(SIZE_GRID_MAX_SIZES, `A grade pode ter até ${SIZE_GRID_MAX_SIZES} tamanhos`),
});

export type WholesaleInput = z.infer<typeof wholesaleSchema>;

/** Reads the `minOrderQuantity` / `sizeGrid` fields posted by the product forms. */
export function parseWholesaleForm(formData: FormData) {
  return wholesaleSchema.safeParse({
    minOrderQuantity: formData.get("minOrderQuantity") || 1,
    sizeGrid: parseSizeGrid(String(formData.get("sizeGrid") ?? "")),
  });
}
