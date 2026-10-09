import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { routerSpy } from "@/test/next";
import { NotificationBell } from "./notification-bell";
import type { AppNotification } from "@/features/notifications/queries";
import type { NotificationRow } from "@/features/notifications/live";

vi.mock("@/features/notifications/actions", () => ({
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
}));

// --- fake Supabase Realtime channel -----------------------------------------
let insertHandler: (payload: { new: unknown }) => void = () => {};
let statusCallback: (status: string) => void = () => {};
const channelSpy = vi.fn();
const channel = {
  on: vi.fn((_type: string, _filter: unknown, cb: typeof insertHandler) => {
    insertHandler = cb;
    return channel;
  }),
  subscribe: vi.fn((cb: typeof statusCallback) => {
    statusCallback = cb;
    return channel;
  }),
};
const removeChannel = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: (name: string) => {
      channelSpy(name);
      return channel;
    },
    removeChannel,
    realtime: { setAuth: () => Promise.resolve() },
  }),
}));

const notif = (over: Partial<AppNotification> = {}): AppNotification => ({
  id: crypto.randomUUID(),
  type: "OFFER_PUBLISHED",
  title: "Nova oferta na rede",
  body: "Loja X ofertou algo",
  link: "/rede/ofertas/1",
  readAt: null,
  createdAt: new Date().toISOString(),
  ...over,
});

describe("NotificationBell", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the unread badge and opens the panel", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<NotificationBell initialNotifications={[notif(), notif()]} initialUnread={2} />);

    expect(screen.getByRole("button", { name: /2 não lidas/i })).toHaveTextContent("2");
    await userEvent.click(screen.getByRole("button", { name: /notificações/i }));
    expect(screen.getByText("Notificações")).toBeInTheDocument();
    expect(screen.getAllByText("Nova oferta na rede")).toHaveLength(2);
  });

  it("marks one as read and navigates on click", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const { markNotificationRead } = await import("@/features/notifications/actions");
    const n = notif({ link: "/rede/ofertas/42" });
    render(<NotificationBell initialNotifications={[n]} initialUnread={1} />);

    await userEvent.click(screen.getByRole("button", { name: /notificações/i }));
    await userEvent.click(screen.getByText("Nova oferta na rede"));

    expect(markNotificationRead).toHaveBeenCalledWith(n.id);
    expect(routerSpy.push).toHaveBeenCalledWith("/rede/ofertas/42");
  });

  it("marks all as read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const { markAllNotificationsRead } = await import("@/features/notifications/actions");
    render(<NotificationBell initialNotifications={[notif(), notif()]} initialUnread={2} />);

    await userEvent.click(screen.getByRole("button", { name: /notificações/i }));
    await userEvent.click(screen.getByRole("button", { name: /marcar todas como lidas/i }));

    expect(markAllNotificationsRead).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /marcar todas/i })).toBeNull();
  });

  it("keeps the badge at zero when a refresh from before 'marcar todas' lands late", async () => {
    const stale = [notif(), notif()];
    let answer: (value: unknown) => void = () => {};
    const fetchMock = vi
      .fn()
      // the refresh fired by opening the panel — still in flight when "marcar todas" is clicked
      .mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))
      // the reconcile after the action: everything is read now
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          notifications: stale.map((n) => ({ ...n, readAt: new Date().toISOString() })),
          unreadCount: 0,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationBell initialNotifications={stale} initialUnread={2} />);

    const bell = screen.getByRole("button", { name: /notificações/i });
    await userEvent.click(bell);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole("button", { name: /marcar todas como lidas/i }));

    await act(async () => {
      answer({ ok: true, json: async () => ({ notifications: stale, unreadCount: 2 }) });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(bell).not.toHaveTextContent(/[1-9]/);
    expect(bell).toHaveAccessibleName("Notificações");
  });

  it("refreshes from /api/notifications when opened", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: [notif({ title: "Fresca" })], unreadCount: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationBell initialNotifications={[]} initialUnread={0} />);

    await userEvent.click(screen.getByRole("button", { name: /notificações/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/notifications", { cache: "no-store" }),
    );
    expect(await screen.findByText("Fresca")).toBeInTheDocument();
  });

  it("shows an empty message with no notifications", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<NotificationBell initialNotifications={[]} initialUnread={0} />);
    await userEvent.click(screen.getByRole("button", { name: /notificações/i }));
    expect(screen.getByText(/nenhuma notificação ainda/i)).toBeInTheDocument();
  });
});

// --- fake browser Notification API -----------------------------------------
class FakeNotification {
  static permission: NotificationPermission = "default";
  static requestPermission = vi.fn(async () => {
    FakeNotification.permission = "granted";
    return FakeNotification.permission;
  });
  static shown: FakeNotification[] = [];
  onclick: (() => void) | null = null;
  close = vi.fn();
  constructor(
    public title: string,
    public options: NotificationOptions,
  ) {
    FakeNotification.shown.push(this);
  }
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
}

const liveRow = (over: Partial<NotificationRow> = {}): NotificationRow => ({
  id: crypto.randomUUID(),
  organization_id: "org-1",
  type: "NEGOTIATION_MESSAGE",
  title: "Nova mensagem na negociação",
  body: "Casaco · 300,00",
  link: "/negociacoes/7",
  read_at: null,
  created_at: new Date().toISOString(),
  ...over,
});

/** Renders a bell whose live channel has already subscribed. */
async function renderLive(props: Partial<React.ComponentProps<typeof NotificationBell>> = {}) {
  const view = render(
    <NotificationBell
      initialNotifications={[]}
      initialUnread={0}
      organizationId="org-1"
      {...props}
    />,
  );
  await waitFor(() => expect(channel.subscribe).toHaveBeenCalled());
  act(() => statusCallback("SUBSCRIBED"));
  return view;
}

describe("NotificationBell — live delivery (ADR-0011)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    vi.stubGlobal("Notification", FakeNotification);
    FakeNotification.permission = "default";
    FakeNotification.shown = [];
    setVisibility("visible");
    document.title = "Vestiq";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setVisibility("visible");
  });

  it("subscribes to the org's notifications only when given an organization", async () => {
    const { unmount: unmountStatic } = render(
      <NotificationBell initialNotifications={[]} initialUnread={0} />,
    );
    expect(channelSpy).not.toHaveBeenCalled();
    unmountStatic();

    const { unmount } = await renderLive();
    expect(channelSpy).toHaveBeenCalledWith("notifications:org-1");
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: "organization_id=eq.org-1",
      },
      expect.any(Function),
    );
    unmount();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });

  it("refetches once subscribed, covering what arrived before the socket (TC-NOTIF-01)", async () => {
    await renderLive();
    expect(fetch).toHaveBeenCalledWith("/api/notifications", { cache: "no-store" });
  });

  it("shows a new notification and bumps the badge without reloading (TC-NOTIF-01)", async () => {
    await renderLive();
    const row = liveRow({ title: "Nova proposta recebida" });
    act(() => insertHandler({ new: row }));

    expect(screen.getByRole("button", { name: /1 não lidas/i })).toHaveTextContent("1");
    await userEvent.click(screen.getByRole("button", { name: /notificações/i }));
    expect(screen.getByText("Nova proposta recebida")).toBeInTheDocument();

    // the same row again (e.g. after a reconnect) is not counted twice
    act(() => insertHandler({ new: row }));
    expect(screen.getByRole("button", { name: /1 não lidas/i })).toBeInTheDocument();
    expect(screen.getAllByText("Nova proposta recebida")).toHaveLength(1);
  });

  it("raises a system alert only when allowed and the tab is hidden (TC-NOTIF-02)", async () => {
    FakeNotification.permission = "granted";
    await renderLive();

    act(() => insertHandler({ new: liveRow() }));
    expect(FakeNotification.shown).toHaveLength(0); // tab in front: the bell is enough

    setVisibility("hidden");
    const row = liveRow({ link: "/negociacoes/9" });
    act(() => insertHandler({ new: row }));
    expect(FakeNotification.shown).toHaveLength(1);
    const alert = FakeNotification.shown[0]!;
    expect(alert.title).toBe("Nova mensagem na negociação");
    expect(alert.options).toMatchObject({ body: "Casaco · 300,00", tag: row.id });

    const { markNotificationRead } = await import("@/features/notifications/actions");
    vi.mocked(markNotificationRead).mockResolvedValue(undefined);
    vi.spyOn(window, "focus").mockImplementation(() => {});
    act(() => alert.onclick?.());
    expect(alert.close).toHaveBeenCalled();
    expect(markNotificationRead).toHaveBeenCalledWith(row.id);
    expect(routerSpy.push).toHaveBeenCalledWith("/negociacoes/9");
  });

  it("does not alert without permission", async () => {
    FakeNotification.permission = "denied";
    setVisibility("hidden");
    await renderLive();
    act(() => insertHandler({ new: liveRow() }));
    expect(FakeNotification.shown).toHaveLength(0);
  });

  it("offers to enable alerts and asks the browser on click (TC-NOTIF-04)", async () => {
    await renderLive();
    await userEvent.click(screen.getByRole("button", { name: /notificações/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /receber alertas neste dispositivo/i }),
    );

    expect(FakeNotification.requestPermission).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /receber alertas/i })).toBeNull(),
    );
  });

  it("explains how to unblock when alerts were denied", async () => {
    FakeNotification.permission = "denied";
    await renderLive();
    await userEvent.click(screen.getByRole("button", { name: /notificações/i }));
    expect(screen.getByText(/alertas bloqueados/i)).toBeInTheDocument();
  });

  it("shows the unread count in the tab title (TC-NOTIF-03)", async () => {
    const { unmount } = await renderLive({ initialUnread: 2 });
    expect(document.title).toBe("(2) Vestiq");

    act(() => insertHandler({ new: liveRow() }));
    expect(document.title).toBe("(3) Vestiq");

    // a page navigation replaces the title — the count comes back
    document.title = "Negociações";
    await waitFor(() => expect(document.title).toBe("(3) Negociações"));

    unmount();
    expect(document.title).toBe("Negociações");
  });
});
