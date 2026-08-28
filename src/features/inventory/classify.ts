/** Stock classification — SPEC-005 BR-INV-08. */

export type StockLevel = "out" | "low" | "ok";

export function classifyStock(stockOnHand: number, lowThreshold: number): StockLevel {
  if (stockOnHand <= 0) return "out";
  if (stockOnHand <= lowThreshold) return "low";
  return "ok";
}

export const DEFAULT_LOW_STOCK_THRESHOLD = 3;
