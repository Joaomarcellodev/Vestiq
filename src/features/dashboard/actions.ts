"use server";

import { getTopProducts, type TopProductsPeriod } from "./queries";

export async function fetchTopProducts(days: TopProductsPeriod) {
  return getTopProducts(days);
}
