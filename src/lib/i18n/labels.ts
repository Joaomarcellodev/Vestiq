/** pt-BR labels for domain enums. Keeps DB values (EN) out of the UI. */

import type { Database } from "@/types/database";

type Tone = "neutral" | "primary" | "success" | "warning" | "error" | "info";

type LabelMap<T extends string> = Record<T, { label: string; tone: Tone }>;

export const MEMBER_STATUS: LabelMap<Database["public"]["Enums"]["network_member_status"]> = {
  ACTIVE: { label: "Ativa", tone: "success" },
  INVITED: { label: "Convite enviado", tone: "warning" },
  DISABLED: { label: "Desativada", tone: "neutral" },
};

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

export const SALE_STATUS: Record<Database["public"]["Enums"]["sale_status"], string> = {
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
};

export const PAYMENT_METHOD: Record<Database["public"]["Enums"]["payment_method"], string> = {
  PIX: "Pix",
  CARTAO: "Cartão",
  DINHEIRO: "Dinheiro",
};

export const MEMBER_ROLE: Record<Database["public"]["Enums"]["member_role"], string> = {
  PLATFORM_ADMIN: "Administrador da plataforma",
  FACTORY_ADMIN: "Administrador da fábrica",
  RESELLER: "Revendedora",
};
