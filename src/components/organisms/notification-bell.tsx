"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/atoms";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { markAllNotificationsRead, markNotificationRead } from "@/features/notifications/actions";
import {
  prependNotification,
  shouldShowSystemAlert,
  titleWithUnread,
  toAppNotification,
  type AlertPermission,
  type NotificationRow,
} from "@/features/notifications/live";
import type { AppNotification, NotificationType } from "@/features/notifications/queries";

const ICON: Record<NotificationType, string> = {
  OFFER_PUBLISHED: "hub",
  NEGOTIATION_OPENED: "swap_horiz",
  NEGOTIATION_MESSAGE: "mail",
  NEGOTIATION_ACCEPTED: "check_circle",
  NEGOTIATION_REJECTED: "warning",
  NEGOTIATION_CANCELLED: "warning",
  NEGOTIATION_COMPLETED: "check_circle",
  SUPPLY_ORDER_PLACED: "receipt_long",
  SUPPLY_ORDER_CONFIRMED: "check_circle",
  SUPPLY_ORDER_REJECTED: "warning",
  SUPPLY_ORDER_CANCELLED: "warning",
};

/** Fallback only — while the Realtime channel is live, polling is skipped. */
const POLL_MS = 60_000;

// Browser notification permission as an external store, so the panel re-renders
// after the user answers the prompt.
const PERMISSION_EVENT = "vestiq:notification-permission";

function readPermission(): AlertPermission {
  return "Notification" in window ? Notification.permission : "unsupported";
}
function subscribePermission(onChange: () => void) {
  window.addEventListener(PERMISSION_EVENT, onChange);
  return () => window.removeEventListener(PERMISSION_EVENT, onChange);
}
const serverPermission = (): AlertPermission => "unsupported";

async function requestAlertPermission() {
  await Notification.requestPermission();
  window.dispatchEvent(new Event(PERMISSION_EVENT));
}

function showSystemAlert(n: AppNotification, onClick: () => void) {
  try {
    const alert = new Notification(n.title, {
      body: n.body ?? undefined,
      tag: n.id,
      icon: "/icon.svg",
    });
    alert.onclick = () => {
      window.focus();
      alert.close();
      onClick();
    };
  } catch {
    // Some mobile browsers only show notifications through a service worker
    // (Web Push, a separate task). The bell still updates.
  }
}

function timeAgo(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "agora";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

export function NotificationBell({
  initialNotifications,
  initialUnread,
  organizationId,
}: {
  initialNotifications: AppNotification[];
  initialUnread: number;
  /** Recipient org — enables live delivery over Realtime (ADR-0011). */
  organizationId?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialNotifications);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef(false);
  const knownIds = useRef(new Set(initialNotifications.map((n) => n.id)));
  const permission = useSyncExternalStore(subscribePermission, readPermission, serverPermission);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: AppNotification[]; unreadCount: number };
      knownIds.current = new Set(data.notifications.map((n) => n.id));
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      // offline / transient — keep showing what we have
    }
  }, []);

  const receive = useCallback(
    (row: NotificationRow) => {
      const n = toAppNotification(row);
      if (knownIds.current.has(n.id)) return;
      knownIds.current.add(n.id);
      setItems((list) => prependNotification(list, n));
      if (!n.readAt) setUnread((u) => u + 1);

      if (shouldShowSystemAlert(readPermission(), document.visibilityState === "hidden")) {
        showSystemAlert(n, () => {
          void markNotificationRead(n.id).then(refresh, () => undefined);
          if (n.link) router.push(n.link);
        });
      }
    },
    [refresh, router],
  );

  // RF-NOTIF-001 — new notifications arrive over Realtime; RLS limits them to the org.
  useEffect(() => {
    if (!organizationId) return;
    const supabase = createClient();
    let active = true;

    const channel = supabase.channel(`notifications:${organizationId}`).on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `organization_id=eq.${organizationId}`,
      },
      (payload) => {
        if (active) receive(payload.new as NotificationRow);
      },
    );

    // The socket must carry the user's JWT, or RLS filters every row out.
    void supabase.realtime.setAuth().then(() => {
      if (!active) return;
      channel.subscribe((status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          liveRef.current = true;
          // Fill the gap between the server render (or a dropped connection) and now.
          void refresh();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          liveRef.current = false;
        }
      });
    });

    return () => {
      active = false;
      liveRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [organizationId, receive, refresh]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!liveRef.current) void refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // RF-NOTIF-003 — "(2) Vestiq" in the tab. Pages set their own <title> on
  // navigation, so re-apply whenever the head changes.
  useEffect(() => {
    const apply = () => {
      const next = titleWithUnread(document.title, unread);
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      document.title = titleWithUnread(document.title, 0);
    };
  }, [unread]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(refresh, 0);
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open, refresh]);

  const openItem = (n: AppNotification) => {
    if (!n.readAt) {
      setItems((list) =>
        list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
      );
      setUnread((u) => Math.max(0, u - 1));
      startTransition(() => markNotificationRead(n.id));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const markAll = () => {
    setItems((list) => list.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    setUnread(0);
    startTransition(() => markAllNotificationsRead());
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container"
      >
        <Icon name="notifications" size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-error px-1 font-label-sm text-label-sm leading-none text-on-error">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-overlay">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <p className="font-title-lg text-title-lg text-on-surface">Notificações</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="font-label-md text-label-md text-primary-container hover:text-primary"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center font-body-md text-body-md text-on-surface-variant">
              Nenhuma notificação ainda.
            </p>
          ) : (
            <ul className="max-h-[min(28rem,60vh)] divide-y divide-outline-variant overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low",
                      !n.readAt && "bg-primary-fixed/40",
                    )}
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-container-high text-on-surface-variant">
                      <Icon name={ICON[n.type] ?? "notifications"} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-body-md text-body-md font-semibold text-on-surface">
                          {n.title}
                        </span>
                        <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant">
                          {timeAgo(n.createdAt)}
                        </span>
                      </span>
                      {n.body && (
                        <span className="mt-0.5 block truncate font-body-md text-body-md text-on-surface-variant">
                          {n.body}
                        </span>
                      )}
                    </span>
                    {!n.readAt && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-container" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* RF-NOTIF-002 — opt-in to system alerts; browsers need a click to ask. */}
          {permission === "default" && (
            <button
              type="button"
              onClick={() => void requestAlertPermission()}
              className="flex w-full items-center gap-2 border-t border-outline-variant px-4 py-3 text-left font-label-md text-label-md text-primary-container transition-colors hover:bg-surface-container-low hover:text-primary"
            >
              <Icon name="notifications" size={16} />
              Receber alertas neste dispositivo
            </button>
          )}
          {permission === "denied" && (
            <p className="border-t border-outline-variant px-4 py-3 font-label-sm text-label-sm text-on-surface-variant">
              Alertas bloqueados. Libere as notificações do Vestiq nas configurações do navegador.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
