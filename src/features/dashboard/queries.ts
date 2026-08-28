import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { averageTicket } from "@/features/sales/totals";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/features/inventory/classify";

export interface ResellerDashboard {
  orgName: string;
  monthRevenue: number;
  monthSales: number;
  averageTicket: number;
  stockUnits: number;
  variantCount: number;
  lowStock: { id: string; label: string; stock: number }[];
  activeOffers: number;
  pendingNegotiations: number;
  /** Revenue per day for the last 14 days. */
  salesTrend: { date: string; label: string; total: number }[];
  /** Top 5 products by units sold (confirmed sales). */
  topProducts: { name: string; units: number }[];
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getResellerDashboard(): Promise<ResellerDashboard> {
  const org = await requireActiveOrganization();
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const trendStart = new Date(now);
  trendStart.setDate(trendStart.getDate() - 13);
  trendStart.setHours(0, 0, 0, 0);

  const [salesRes, variantsRes, offersRes, negRes, itemsRes] = await Promise.all([
    supabase
      .from("sales")
      .select("total, created_at")
      .eq("status", "CONFIRMED")
      .gte("created_at", trendStart.toISOString()),
    supabase
      .from("product_variants")
      .select("id, stock_on_hand, size, color, products(name)")
      .is("archived_at", null),
    supabase.from("offers").select("id").in("status", ["ACTIVE", "PARTIALLY_NEGOTIATED"]),
    supabase.from("negotiations").select("id, status"),
    supabase
      .from("sale_items")
      .select("quantity, product_variants(products(name)), sales!inner(status)")
      .eq("sales.status", "CONFIRMED"),
  ]);

  const allSales = salesRes.data ?? [];
  const monthSales = allSales.filter((s) => new Date(s.created_at) >= monthStart);
  const monthRevenue = Math.round(monthSales.reduce((a, s) => a + Number(s.total), 0) * 100) / 100;

  // 14-day trend
  const byDay = new Map<string, number>();
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(trendStart);
    d.setDate(d.getDate() + i);
    byDay.set(isoDate(d), 0);
  }
  for (const s of allSales) {
    const key = isoDate(new Date(s.created_at));
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + Number(s.total));
  }
  const salesTrend = [...byDay.entries()].map(([date, total]) => ({
    date,
    label: new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    total: Math.round(total * 100) / 100,
  }));

  // top products
  const unitsByProduct = new Map<string, number>();
  for (const it of itemsRes.data ?? []) {
    const name = it.product_variants?.products?.name;
    if (!name) continue;
    unitsByProduct.set(name, (unitsByProduct.get(name) ?? 0) + it.quantity);
  }
  const topProducts = [...unitsByProduct.entries()]
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units || a.name.localeCompare(b.name))
    .slice(0, 5);

  const variants = variantsRes.data ?? [];
  const stockUnits = variants.reduce((a, v) => a + v.stock_on_hand, 0);
  const lowStock = variants
    .filter((v) => v.stock_on_hand > 0 && v.stock_on_hand <= DEFAULT_LOW_STOCK_THRESHOLD)
    .slice(0, 5)
    .map((v) => ({
      id: v.id,
      label: [v.products?.name, [v.color, v.size].filter(Boolean).join(" / ")]
        .filter(Boolean)
        .join(" · "),
      stock: v.stock_on_hand,
    }));

  const negotiations = negRes.data ?? [];

  return {
    orgName: org.name,
    monthRevenue,
    monthSales: monthSales.length,
    averageTicket: averageTicket(monthRevenue, monthSales.length),
    stockUnits,
    variantCount: variants.length,
    lowStock,
    activeOffers: (offersRes.data ?? []).length,
    pendingNegotiations: negotiations.filter((n) => n.status === "PENDING").length,
    salesTrend,
    topProducts,
  };
}
