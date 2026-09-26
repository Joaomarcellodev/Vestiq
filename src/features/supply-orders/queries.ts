import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { groupCatalog, type OrderCatalogProduct } from "./order-math";
import type { SupplyOrderParty, SupplyOrderStatus } from "./state";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Supplier catalog for the order form (public columns only — SPEC-011/012). */
export async function getOrderCatalog(supplierId: string): Promise<OrderCatalogProduct[]> {
  await requireActiveOrganization();
  if (!UUID.test(supplierId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_supplier_order_catalog", {
    p_supplier_id: supplierId,
  });
  if (error) throw error;
  return groupCatalog(data ?? []);
}

export interface SupplyOrderListItem {
  id: string;
  status: SupplyOrderStatus;
  party: SupplyOrderParty;
  counterparty: string;
  totalQuantity: number;
  totalAmount: number;
  createdAt: string;
}

const ORDER_COLUMNS =
  "id, status, reseller_id, supplier_id, total_quantity, total_amount, created_at, reseller:organizations!supply_orders_reseller_id_fkey(name), supplier:organizations!supply_orders_supplier_id_fkey(name)";

/** Orders the active organization sent (reseller) or received (supplier), newest first. */
export async function listSupplyOrders(status?: SupplyOrderStatus): Promise<SupplyOrderListItem[]> {
  const org = await requireActiveOrganization();
  const supabase = await createClient();
  let query = supabase
    .from("supply_orders")
    .select(ORDER_COLUMNS)
    .or(`reseller_id.eq.${org.id},supplier_id.eq.${org.id}`)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((o) => {
    const party: SupplyOrderParty = o.reseller_id === org.id ? "reseller" : "supplier";
    return {
      id: o.id,
      status: o.status,
      party,
      counterparty: (party === "reseller" ? o.supplier?.name : o.reseller?.name) ?? "—",
      totalQuantity: o.total_quantity,
      totalAmount: Number(o.total_amount),
      createdAt: o.created_at,
    };
  });
}

export interface SupplyOrderItem {
  id: string;
  productId: string | null;
  productName: string;
  color: string | null;
  size: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface SupplyOrderDetail {
  id: string;
  status: SupplyOrderStatus;
  party: SupplyOrderParty;
  /** Supplier admins answer; other supplier members only read. */
  canRespond: boolean;
  resellerName: string;
  supplierId: string;
  supplierName: string;
  note: string | null;
  responseNote: string | null;
  cancelReason: string | null;
  totalQuantity: number;
  totalAmount: number;
  createdAt: string;
  respondedAt: string | null;
  cancelledAt: string | null;
  items: SupplyOrderItem[];
}

/** One order with its items, or `null` when it doesn't exist or isn't visible. */
export async function getSupplyOrder(id: string): Promise<SupplyOrderDetail | null> {
  const org = await requireActiveOrganization();
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: o, error } = await supabase
    .from("supply_orders")
    .select(
      `${ORDER_COLUMNS}, note, response_note, cancel_reason, responded_at, cancelled_at, supply_order_items(id, product_id, product_name, color, size, sku, unit_price, quantity, line_total, position)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!o) return null;

  const party: SupplyOrderParty = o.reseller_id === org.id ? "reseller" : "supplier";
  return {
    id: o.id,
    status: o.status,
    party,
    canRespond:
      party === "supplier" && (org.role === "FACTORY_ADMIN" || org.role === "PLATFORM_ADMIN"),
    resellerName: o.reseller?.name ?? "—",
    supplierId: o.supplier_id,
    supplierName: o.supplier?.name ?? "—",
    note: o.note,
    responseNote: o.response_note,
    cancelReason: o.cancel_reason,
    totalQuantity: o.total_quantity,
    totalAmount: Number(o.total_amount),
    createdAt: o.created_at,
    respondedAt: o.responded_at,
    cancelledAt: o.cancelled_at,
    items: [...(o.supply_order_items ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        color: i.color,
        size: i.size,
        sku: i.sku,
        unitPrice: Number(i.unit_price),
        quantity: i.quantity,
        lineTotal: Number(i.line_total),
      })),
  };
}
