/** pt-BR labels for domain enums. Keeps DB values (EN) out of the UI. */

import type { Database } from "@/types/database";

type Tone = "neutral" | "primary" | "success" | "warning" | "error" | "info";

type LabelMap<T extends string> = Record<T, { label: string; tone: Tone }>;

export const MEMBER_STATUS: LabelMap<Database["public"]["Enums"]["network_member_status"]> = {
  ACTIVE: { label: "Ativa", tone: "success" },
  INVITED: { label: "Convite enviado", tone: "warning" },
  DISABLED: { label: "Desativada", tone: "neutral" },
};

/** An `INVITED` row past `invite_expires_at` — it can only be resent (VES-88). */
export const EXPIRED_INVITE = { label: "Convite expirado", tone: "error" } as const;

export const OFFER_STATUS: LabelMap<Database["public"]["Enums"]["offer_status"]> = {
  ACTIVE: { label: "Ativa", tone: "success" },
  PARTIALLY_NEGOTIATED: { label: "Parcialmente negociada", tone: "info" },
  FULFILLED: { label: "Concluída", tone: "neutral" },
  CANCELLED: { label: "Cancelada", tone: "error" },
};

export const NEGOTIATION_STATUS: LabelMap<Database["public"]["Enums"]["negotiation_status"]> = {
  PENDING: { label: "Pendente", tone: "warning" },
  ACCEPTED: { label: "Aceita", tone: "info" },
  REJECTED: { label: "Recusada", tone: "error" },
  CANCELLED: { label: "Cancelada", tone: "neutral" },
  COMPLETED: { label: "Concluída", tone: "success" },
};

export const NEGOTIATION_EVENT: Record<
  Database["public"]["Enums"]["negotiation_event_type"],
  string
> = {
  CREATED: "Proposta enviada",
  MESSAGE: "Mensagem",
  ACCEPTED: "Proposta aceita",
  REJECTED: "Proposta recusada",
  CANCELLED: "Negociação cancelada",
  COMPLETED: "Transferência concluída",
};

export const SUPPLY_ORDER_STATUS: LabelMap<Database["public"]["Enums"]["supply_order_status"]> = {
  PENDING: { label: "Pendente", tone: "warning" },
  CONFIRMED: { label: "Confirmado", tone: "success" },
  REJECTED: { label: "Recusado", tone: "error" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
};

/** VES-27 — the factory's Stripe Connect account (`stripe_transfers` capability). */
export const PAYOUT_ACCOUNT_STATUS: Record<
  "none" | "active" | "pending" | "restricted" | "rejected" | "unsupported",
  { label: string; tone: Tone; description: string }
> = {
  none: {
    label: "Não cadastrada",
    tone: "warning",
    description:
      "Cadastre a conta onde a fábrica recebe. Sem ela, as revendedoras não conseguem pagar os pedidos pelo Vestiq.",
  },
  pending: {
    label: "Cadastro pendente",
    tone: "warning",
    description:
      "O cadastro no Stripe ainda não foi concluído ou está em análise. Continue o cadastro para começar a receber.",
  },
  active: {
    label: "Pronta para receber",
    tone: "success",
    description: "As revendedoras já podem pagar os pedidos confirmados pela fábrica.",
  },
  restricted: {
    label: "Precisa de atenção",
    tone: "error",
    description:
      "O Stripe pediu mais informações. Até completar, os pedidos não podem ser pagos pelo Vestiq.",
  },
  rejected: {
    label: "Recusada",
    tone: "error",
    description: "O Stripe recusou esta conta. Fale com o Vestiq para resolver.",
  },
  unsupported: {
    label: "Indisponível",
    tone: "error",
    description: "O Stripe não oferece recebimento para esta conta. Fale com o Vestiq.",
  },
};

export const PAYMENT_STATUS: LabelMap<Database["public"]["Enums"]["payment_status"]> = {
  PENDING: { label: "Aguardando pagamento", tone: "warning" },
  PAID: { label: "Pago", tone: "success" },
  FAILED: { label: "Pagamento recusado", tone: "error" },
  EXPIRED: { label: "Pagamento expirado", tone: "neutral" },
  REFUNDED: { label: "Reembolsado", tone: "neutral" },
};

export const SALE_STATUS: Record<Database["public"]["Enums"]["sale_status"], string> = {
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
};

export const PAYMENT_METHOD: Record<Database["public"]["Enums"]["payment_method"], string> = {
  PIX: "Pix",
  CARTAO: "Cartão",
  DINHEIRO: "Dinheiro",
};

export const INVENTORY_MOVEMENT: Record<
  Database["public"]["Enums"]["inventory_movement_type"],
  string
> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste",
  VENDA: "Venda",
  CANCELAMENTO: "Venda cancelada",
  TRANSFERENCIA_ENTRADA: "Transferência recebida",
  TRANSFERENCIA_SAIDA: "Transferência enviada",
};

export const MEMBER_ROLE: Record<Database["public"]["Enums"]["member_role"], string> = {
  PLATFORM_ADMIN: "Administrador da plataforma",
  FACTORY_ADMIN: "Administrador da fábrica",
  RESELLER: "Revendedora",
};
