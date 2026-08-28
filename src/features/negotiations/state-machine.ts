/**
 * Negotiation state machine — SPEC-009 §Estados, BR-NEG-04/05.
 * Pure logic, mirrored by the SQL function `negotiation_transition`.
 */

export type NegotiationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED";

export type NegotiationAction = "accept" | "reject" | "cancel" | "complete";
export type Party = "seller" | "buyer";

const TERMINAL: NegotiationStatus[] = ["REJECTED", "CANCELLED", "COMPLETED"];

export function isTerminal(status: NegotiationStatus): boolean {
  return TERMINAL.includes(status);
}

/**
 * Returns the resulting status for a legal transition, or an Error describing
 * why the transition is illegal.
 */
export function transition(
  status: NegotiationStatus,
  action: NegotiationAction,
  party: Party,
): NegotiationStatus | Error {
  switch (action) {
    case "accept":
      if (status !== "PENDING") return new Error("A negociação precisa estar pendente");
      if (party !== "seller") return new Error("Apenas a vendedora pode aceitar");
      return "ACCEPTED";
    case "reject":
      if (status !== "PENDING") return new Error("A negociação precisa estar pendente");
      if (party !== "seller") return new Error("Apenas a vendedora pode recusar");
      return "REJECTED";
    case "cancel":
      if (status === "PENDING" && party !== "buyer") {
        return new Error("Apenas a interessada pode cancelar uma proposta pendente");
      }
      if (status !== "PENDING" && status !== "ACCEPTED") {
        return new Error("Só é possível cancelar propostas pendentes ou aceitas");
      }
      return "CANCELLED";
    case "complete":
      if (status !== "ACCEPTED") return new Error("A negociação precisa estar aceita");
      if (party !== "seller") return new Error("Apenas a vendedora conclui a negociação");
      return "COMPLETED";
    default:
      return new Error(`Ação desconhecida: ${String(action)}`);
  }
}

export function canTransition(
  status: NegotiationStatus,
  action: NegotiationAction,
  party: Party,
): boolean {
  return !(transition(status, action, party) instanceof Error);
}
