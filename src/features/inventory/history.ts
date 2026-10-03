/** Movement history helpers — SPEC-005 US-INV-03 / RF-INV-004. Pure, no I/O. */

import type { Database } from "@/types/database";

export type MovementType = Database["public"]["Enums"]["inventory_movement_type"];

export type MovementFilter = "all" | "manual" | "adjust" | "sales" | "transfers";

/** Which movement types each history tab shows (`all` = no type filter). */
export const MOVEMENT_FILTER_TYPES: Record<Exclude<MovementFilter, "all">, MovementType[]> = {
  manual: ["ENTRADA", "SAIDA"],
  adjust: ["AJUSTE"],
  sales: ["VENDA", "CANCELAMENTO"],
  transfers: ["TRANSFERENCIA_ENTRADA", "TRANSFERENCIA_SAIDA"],
};

export const MOVEMENT_FILTER_TABS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "manual", label: "Entradas" },
  { value: "adjust", label: "Ajustes" },
  { value: "sales", label: "Vendas" },
  { value: "transfers", label: "Transferências" },
];

export function parseMovementFilter(raw: string | undefined): MovementFilter {
  return raw && raw in MOVEMENT_FILTER_TYPES ? (raw as MovementFilter) : "all";
}

/** Movement types for a filter, or `null` when every type is shown. */
export function movementTypesFor(filter: MovementFilter): MovementType[] | null {
  return filter === "all" ? null : MOVEMENT_FILTER_TYPES[filter];
}

/** Where the movement came from, when the reseller can open it (BR-INV-06). */
export function movementReferenceLink(
  referenceType: string | null,
  referenceId: string | null,
): { href: string; label: string } | null {
  if (!referenceId) return null;
  if (referenceType === "sale") return { href: `/vendas/${referenceId}`, label: "Ver venda" };
  if (referenceType === "negotiation") {
    return { href: `/negociacoes/${referenceId}`, label: "Ver negociação" };
  }
  return null;
}

/** Signed quantity as shown in the history: "+20", "-3". */
export function formatMovementQuantity(quantity: number): string {
  return quantity > 0 ? `+${quantity}` : String(quantity);
}
