import type { Database } from "@/types/database";

/** Supply order lifecycle (SPEC-012 BR-ORD-06). Mirrors the database functions. */

export type SupplyOrderStatus = Database["public"]["Enums"]["supply_order_status"];
export type SupplyOrderParty = "reseller" | "supplier";
export type SupplyOrderAction = "confirm" | "reject" | "cancel";

export function availableActions(
  status: SupplyOrderStatus,
  party: SupplyOrderParty,
  { canRespond = true }: { canRespond?: boolean } = {},
): SupplyOrderAction[] {
  if (status !== "PENDING") return [];
  if (party === "reseller") return ["cancel"];
  return canRespond ? ["confirm", "reject"] : [];
}

/** Short, human-friendly reference: "#1A2B3C4D". */
export function orderCode(id: string): string {
  return `#${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
