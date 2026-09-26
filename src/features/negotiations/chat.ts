import type { Database } from "@/types/database";

/**
 * Chat timeline helpers (RF-NEG-010, ADR-0010) — shared by the server actions
 * and the realtime client, which receives raw `negotiation_events` rows.
 */

export type NegotiationEventType = Database["public"]["Enums"]["negotiation_event_type"];

export interface ChatEvent {
  id: string;
  type: NegotiationEventType;
  body: string | null;
  createdAt: string;
  actorId: string | null;
  /** Optimistic bubble not yet confirmed by the server. */
  pending?: boolean;
}

export function toChatEvent(row: {
  id: string;
  type: NegotiationEventType;
  body: string | null;
  created_at: string;
  actor_id: string | null;
}): ChatEvent {
  return {
    id: row.id,
    type: row.type,
    body: row.body,
    createdAt: row.created_at,
    actorId: row.actor_id,
  };
}

/** Status events change the negotiation — the page must refresh its header and actions. */
export function isStatusEvent(type: NegotiationEventType): boolean {
  return type !== "MESSAGE" && type !== "CREATED";
}

/**
 * Merges incoming events into the timeline: dedupes by id (realtime + refetch +
 * the send response can all deliver the same event) and keeps chronological order.
 */
export function mergeEvents(current: ChatEvent[], incoming: ChatEvent[]): ChatEvent[] {
  const byId = new Map(current.map((e) => [e.id, e]));
  // the incoming copy wins — a server event replaces an optimistic one with the same id
  for (const e of incoming) byId.set(e.id, e);
  // Compare instants, not strings: REST and Realtime may format timestamps differently.
  return [...byId.values()].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id),
  );
}

/**
 * The chat renders on the server (UTC on Netlify) and in the browser; a fixed
 * zone keeps both outputs identical, avoiding hydration mismatches. Vestiq is
 * Brazil-only (BRL — ADR-0008).
 */
export const CHAT_TIME_ZONE = "America/Sao_Paulo";

const ymd = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHAT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dayNumber(date: Date): number {
  const [y, m, d] = ymd.format(date).split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
}

/** "Hoje", "Ontem" or "12/09/2026" — day separators in the chat. */
export function dayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const diff = dayNumber(now) - dayNumber(date);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { timeZone: CHAT_TIME_ZONE });
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CHAT_TIME_ZONE,
  });
}
