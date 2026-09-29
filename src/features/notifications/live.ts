import type { Database } from "@/types/database";
import type { AppNotification } from "./queries";

// ADR-0011 — client-side helpers for notifications delivered over Realtime.

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

/** What the bell keeps in memory — same size the layout loads. */
export const NOTIFICATION_LIST_LIMIT = 20;

export function toAppNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/** Puts `incoming` on top, ignoring one already listed (e.g. a refetch raced it). */
export function prependNotification(
  list: AppNotification[],
  incoming: AppNotification,
  limit = NOTIFICATION_LIST_LIMIT,
): AppNotification[] {
  if (list.some((n) => n.id === incoming.id)) return list;
  return [incoming, ...list].slice(0, limit);
}

const UNREAD_PREFIX = /^\(\d+\+?\) /;

/** "(3) Vestiq" — the unread count in the tab title; the bare title at zero. */
export function titleWithUnread(title: string, unread: number): string {
  const bare = title.replace(UNREAD_PREFIX, "");
  if (unread <= 0) return bare;
  return `(${unread > 99 ? "99+" : unread}) ${bare}`;
}

export type AlertPermission = NotificationPermission | "unsupported";

/** A system notification only when allowed and the tab isn't in front of her. */
export function shouldShowSystemAlert(permission: AlertPermission, hidden: boolean): boolean {
  return permission === "granted" && hidden;
}
