"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/atoms";
import { cn } from "@/lib/utils/cn";
import { NEGOTIATION_EVENT } from "@/lib/i18n/labels";
import { refreshNegotiationEvents, sendNegotiationMessage } from "../actions";
import {
  dayLabel,
  isStatusEvent,
  mergeEvents,
  timeLabel,
  toChatEvent,
  type ChatEvent,
} from "../chat";
import { MESSAGE_MAX_LENGTH } from "../validation";

type Connection = "connecting" | "live" | "reconnecting";

const CONNECTION_LABEL: Record<Connection, string> = {
  connecting: "Conectando…",
  live: "Ao vivo",
  reconnecting: "Reconectando…",
};

/**
 * Negotiation chat in real time (RF-NEG-010/011, ADR-0010).
 * Server-rendered events + everything that arrives over Supabase Realtime or
 * from this tab's own sends, merged and deduped by id.
 */
export function NegotiationChat({
  negotiationId,
  currentUserId,
  counterpartyName,
  initialEvents,
  open,
}: {
  negotiationId: string;
  currentUserId: string;
  counterpartyName: string;
  initialEvents: ChatEvent[];
  /** False once the negotiation is closed — no new messages (BR-NEG-09). */
  open: boolean;
}) {
  const router = useRouter();
  const [local, setLocal] = useState<ChatEvent[]>([]);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);

  // Server props win on refresh; local holds realtime/sent events not yet in them.
  const events = useMemo(() => mergeEvents(initialEvents, local), [initialEvents, local]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let connectedOnce = false;

    const receive = (incoming: ChatEvent[]) => {
      if (!active || incoming.length === 0) return;
      setLocal((prev) => mergeEvents(prev, incoming));
      if (incoming.some((e) => isStatusEvent(e.type))) router.refresh();
    };

    const channel = supabase
      .channel(`negotiation:${negotiationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "negotiation_events",
          filter: `negotiation_id=eq.${negotiationId}`,
        },
        (payload) => receive([toChatEvent(payload.new as Parameters<typeof toChatEvent>[0])]),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "negotiations",
          filter: `id=eq.${negotiationId}`,
        },
        () => router.refresh(),
      );

    // The socket must carry the user's JWT, or RLS filters every change out.
    void supabase.realtime.setAuth().then(() => {
      if (!active) return;
      channel.subscribe((status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          setConnection("live");
          // Fill the gap between the server render (or a dropped connection) and now.
          void refreshNegotiationEvents(negotiationId).then(receive, () => undefined);
          if (connectedOnce) router.refresh();
          connectedOnce = true;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnection("reconnecting");
        }
      });
    });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [negotiationId, router]);

  // Keep the newest message in view.
  const lastId = events.at(-1)?.id;
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [lastId]);

  function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;

    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setLocal((prev) => [
      ...prev,
      {
        id: tempId,
        type: "MESSAGE",
        body,
        createdAt: new Date().toISOString(),
        actorId: currentUserId,
        pending: true,
      },
    ]);
    setDraft("");
    setError(null);

    startTransition(async () => {
      const result = await sendNegotiationMessage(negotiationId, body);
      setLocal((prev) => {
        const withoutTemp = prev.filter((ev) => ev.id !== tempId);
        return "event" in result ? mergeEvents(withoutTemp, [result.event]) : withoutTemp;
      });
      if ("error" in result) {
        setError(result.error);
        setDraft((current) => current || body);
      }
    });
  }

  const rows = events.map((ev, i) => ({
    ev,
    day: dayLabel(ev.createdAt),
    separator: i === 0 || dayLabel(events[i - 1]!.createdAt) !== dayLabel(ev.createdAt),
  }));

  return (
    <section
      aria-label="Chat da negociação"
      className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-surface"
    >
      <header className="flex items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-lowest px-4 py-3">
        <h2 className="font-title-lg text-title-lg text-on-surface">Conversa</h2>
        <span
          role="status"
          className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant"
        >
          <span
            aria-hidden
            className={cn(
              "h-2 w-2 rounded-full",
              connection === "live"
                ? "bg-on-success-container"
                : "animate-pulse bg-on-warning-container",
            )}
          />
          {CONNECTION_LABEL[connection]}
        </span>
      </header>

      <ol
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Mensagens"
        className="flex max-h-[60vh] min-h-64 flex-col gap-3 overflow-y-auto px-3 py-4 sm:px-4"
      >
        {rows.map(({ ev, day, separator }) => {
          const mine = ev.actorId === currentUserId;
          const author = mine ? "Você" : counterpartyName;

          return (
            <li key={ev.id} className="flex flex-col gap-3">
              {separator && (
                <span className="self-center rounded-full bg-surface-container-high px-3 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                  {day}
                </span>
              )}

              {ev.type !== "MESSAGE" && (
                <p className="self-center rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-center font-label-sm text-label-sm text-on-surface-variant">
                  {NEGOTIATION_EVENT[ev.type]} · {author} · {timeLabel(ev.createdAt)}
                </p>
              )}

              {ev.body && (
                <div
                  className={cn(
                    "flex max-w-[85%] flex-col gap-1 md:max-w-[70%]",
                    mine ? "items-end self-end" : "items-start self-start",
                  )}
                >
                  <p
                    className={cn(
                      "whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 font-body-md text-body-md shadow-surface",
                      mine
                        ? "rounded-br-sm bg-primary-container text-on-primary"
                        : "rounded-bl-sm border border-outline-variant bg-surface-container-lowest text-on-surface",
                      ev.pending && "opacity-70",
                    )}
                  >
                    <span className="sr-only">{author}: </span>
                    {ev.body}
                  </p>
                  <span className="px-1 font-label-sm text-label-sm text-on-surface-variant">
                    {ev.pending ? "Enviando…" : timeLabel(ev.createdAt)}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {open ? (
        <form
          onSubmit={send}
          className="space-y-2 border-t border-outline-variant bg-surface-container-lowest p-3"
        >
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-error-container px-3 py-2 font-body-md text-body-md text-on-error-container"
            >
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Mensagem</span>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={MESSAGE_MAX_LENGTH}
                placeholder="Digite sua mensagem..."
                autoComplete="off"
                className="field-focus-ring w-full rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md"
              />
            </label>
            <button
              type="submit"
              aria-label="Enviar mensagem"
              disabled={!draft.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary shadow-primary transition-opacity hover:opacity-90 disabled:bg-surface-container-high disabled:text-outline disabled:shadow-none"
            >
              <Icon name="send" size={20} />
            </button>
          </div>
          {draft.length > MESSAGE_MAX_LENGTH - 100 && (
            <p className="text-right font-label-sm text-label-sm text-on-surface-variant">
              {draft.length}/{MESSAGE_MAX_LENGTH}
            </p>
          )}
        </form>
      ) : (
        <p className="border-t border-outline-variant bg-surface-container-lowest px-4 py-3 text-center font-body-md text-body-md text-on-surface-variant">
          Negociação encerrada. O chat está fechado.
        </p>
      )}
    </section>
  );
}
