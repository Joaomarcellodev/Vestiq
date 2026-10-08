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

// --- keyset pagination ------------------------------------------------------
// Movements of one transaction share `created_at` (now()), so the cursor is
// the (created_at, id) pair of the last row shown, newest first.

export interface MovementCursor {
  createdAt: string;
  id: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeMovementCursor(cursor: MovementCursor): string {
  return `${cursor.createdAt}_${cursor.id}`;
}

/** Parses a cursor from the URL; anything malformed means "start from the newest". */
export function decodeMovementCursor(raw: string | undefined): MovementCursor | null {
  if (!raw) return null;
  const sep = raw.lastIndexOf("_");
  if (sep <= 0) return null;
  const createdAt = raw.slice(0, sep);
  const id = raw.slice(sep + 1);
  if (!UUID.test(id) || Number.isNaN(Date.parse(createdAt))) return null;
  return { createdAt, id };
}
