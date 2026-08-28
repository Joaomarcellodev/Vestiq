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
}

function startOfMonthISO(): string {
  // Avoids Date.now-in-render concerns: this runs server-side per request.
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function getResellerDashboard(): Promise<ResellerDashboard> {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  const monthStart = startOfMonthISO();

  const [salesRes, variantsRes, offersRes, negRes] = await Promise.all([
    supabase.from("sales").select("total").eq("status", "CONFIRMED").gte("created_at", monthStart),
    supabase
      .from("product_variants")
      .select("id, stock_on_hand, size, color, products(name)")
      .is("archived_at", null),
    supabase.from("offers").select("id").in("status", ["ACTIVE", "PARTIALLY_NEGOTIATED"]),
    supabase.from("negotiations").select("id, status"),
  ]);

  const sales = salesRes.data ?? [];
  const monthRevenue = Math.round(sales.reduce((a, s) => a + Number(s.total), 0) * 100) / 100;

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
    monthSales: sales.length,
    averageTicket: averageTicket(monthRevenue, sales.length),
    stockUnits,
    variantCount: variants.length,
    lowStock,
    activeOffers: (offersRes.data ?? []).length,
    pendingNegotiations: negotiations.filter((n) => n.status === "PENDING").length,
  };
}
