import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { routerSpy } from "@/test/next";
import { NotificationBell } from "./notification-bell";
import type { AppNotification } from "@/features/notifications/queries";

vi.mock("@/features/notifications/actions", () => ({
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
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
