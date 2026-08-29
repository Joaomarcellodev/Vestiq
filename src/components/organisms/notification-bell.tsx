"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/atoms";
import { cn } from "@/lib/utils/cn";
import { markAllNotificationsRead, markNotificationRead } from "@/features/notifications/actions";
import type { AppNotification, NotificationType } from "@/features/notifications/queries";

const ICON: Record<NotificationType, string> = {
  OFFER_PUBLISHED: "hub",
  NEGOTIATION_OPENED: "swap_horiz",
  NEGOTIATION_MESSAGE: "mail",
  NEGOTIATION_ACCEPTED: "check_circle",
  NEGOTIATION_REJECTED: "warning",
  NEGOTIATION_CANCELLED: "warning",
  NEGOTIATION_COMPLETED: "check_circle",
};

const POLL_MS = 60_000;

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
}: {
  initialNotifications: AppNotification[];
  initialUnread: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialNotifications);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: AppNotification[]; unreadCount: number };
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      // offline / transient — keep showing what we have
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

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
        </div>
      )}
    </div>
  );
}
