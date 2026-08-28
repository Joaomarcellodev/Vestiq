import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";

export async function listCustomers(search?: string, scope: "active" | "archived" = "active") {
  await requireActiveOrganization();
  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id, name, email, phone, document, archived_at")
    .order("name");
  query =
    scope === "archived" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (search?.trim()) {
    query = query.or(`name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCustomerWithHistory(id: string) {
  await requireActiveOrganization();
  const supabase = await createClient();

  const [{ data: customer, error }, { data: sales }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase
      .from("sales")
      .select("id, total, status, payment_method, created_at, sale_items(quantity)")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw error;

  const confirmed = (sales ?? []).filter((s) => s.status === "CONFIRMED");
  const totalSpent = Math.round(confirmed.reduce((a, s) => a + Number(s.total), 0) * 100) / 100;

  return {
    customer,
    sales: sales ?? [],
    stats: {
      totalSpent,
      orderCount: confirmed.length,
      lastPurchase: confirmed[0]?.created_at ?? null,
    },
  };
}
