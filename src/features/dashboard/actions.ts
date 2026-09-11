"use server";

import { getTopProducts, type TopProductsPeriod } from "./queries";
import { topProductsPeriodSchema } from "./validation";

export async function fetchTopProducts(days: TopProductsPeriod) {
  // Server actions take whatever the client sends — the type is not enforced at runtime.
  const period = topProductsPeriodSchema.safeParse(days);
  if (!period.success) throw new Error("Período inválido");
  return getTopProducts(period.data);
}
