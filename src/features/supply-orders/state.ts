import type { Database } from "@/types/database";

/** Supply order lifecycle (SPEC-012 BR-ORD-06). Mirrors the database functions. */

export type SupplyOrderStatus = Database["public"]["Enums"]["supply_order_status"];
export type SupplyOrderParty = "reseller" | "supplier";
export type SupplyOrderAction =
  "confirm" | "reject" | "cancel" | "start_production" | "ship" | "receive";

/**
 * VES-32: after confirming, the factory admin starts production and ships
 * (shipping straight from stock skips production); the reseller marks a
 * shipped order received.
 */
export function availableActions(
  status: SupplyOrderStatus,
  party: SupplyOrderParty,
  { canRespond = true }: { canRespond?: boolean } = {},
): SupplyOrderAction[] {
  if (party === "reseller") {
    if (status === "PENDING") return ["cancel"];
    if (status === "SHIPPED") return ["receive"];
    return [];
  }
  if (!canRespond) return [];
  if (status === "PENDING") return ["confirm", "reject"];
  if (status === "CONFIRMED") return ["start_production", "ship"];
  if (status === "IN_PRODUCTION") return ["ship"];
  return [];
}

/** Stages where the supplier has accepted the order — it can be paid (BR-PAY-01). */
export const ACCEPTED_STATUSES: readonly SupplyOrderStatus[] = [
  "CONFIRMED",
  "IN_PRODUCTION",
  "SHIPPED",
  "DELIVERED",
];

export function isAccepted(status: SupplyOrderStatus): boolean {
  return ACCEPTED_STATUSES.includes(status);
}

/** Short, human-friendly reference: "#1A2B3C4D". */
export function orderCode(id: string): string {
  return `#${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
