import { describe, expect, it } from "vitest";
import {
  prependNotification,
  shouldShowSystemAlert,
  titleWithUnread,
  toAppNotification,
  type NotificationRow,
} from "./live";
import type { AppNotification } from "./queries";

const row = (over: Partial<NotificationRow> = {}): NotificationRow => ({
  id: "n1",
  organization_id: "org",
  type: "NEGOTIATION_MESSAGE",
  title: "Nova mensagem na negociação",
  body: "Casaco · 300,00",
  link: "/negociacoes/1",
  read_at: null,
  created_at: "2026-09-28T12:00:00.000Z",
  ...over,
});

const notif = (id: string): AppNotification => toAppNotification(row({ id }));

describe("toAppNotification", () => {
  it("maps a realtime row to the bell's shape (TC-NOTIF-01)", () => {
    expect(toAppNotification(row())).toEqual({
      id: "n1",
      type: "NEGOTIATION_MESSAGE",
      title: "Nova mensagem na negociação",
      body: "Casaco · 300,00",
      link: "/negociacoes/1",
      readAt: null,
      createdAt: "2026-09-28T12:00:00.000Z",
    });
  });
});

describe("prependNotification", () => {
  it("puts the new one on top", () => {
    expect(prependNotification([notif("a")], notif("b")).map((n) => n.id)).toEqual(["b", "a"]);
  });

  it("ignores one already listed", () => {
    const list = [notif("a"), notif("b")];
    expect(prependNotification(list, notif("b"))).toBe(list);
  });

  it("keeps at most the limit", () => {
    const list = [notif("a"), notif("b"), notif("c")];
    expect(prependNotification(list, notif("d"), 3).map((n) => n.id)).toEqual(["d", "a", "b"]);
  });
});

describe("titleWithUnread", () => {
  it("prefixes the unread count (TC-NOTIF-03)", () => {
    expect(titleWithUnread("Vestiq", 2)).toBe("(2) Vestiq");
  });

  it("replaces an existing prefix instead of stacking", () => {
    expect(titleWithUnread("(2) Vestiq", 5)).toBe("(5) Vestiq");
    expect(titleWithUnread("(99+) Vestiq", 3)).toBe("(3) Vestiq");
  });

  it("caps at 99+", () => {
    expect(titleWithUnread("Vestiq", 150)).toBe("(99+) Vestiq");
  });

  it("drops the prefix at zero", () => {
    expect(titleWithUnread("(4) Vestiq", 0)).toBe("Vestiq");
    expect(titleWithUnread("Vestiq", 0)).toBe("Vestiq");
  });

  it("leaves titles that merely start with parentheses", () => {
    expect(titleWithUnread("(Rascunho) Pedido", 0)).toBe("(Rascunho) Pedido");
  });
});

describe("shouldShowSystemAlert", () => {
  it("alerts only when granted and the tab is hidden (TC-NOTIF-02)", () => {
    expect(shouldShowSystemAlert("granted", true)).toBe(true);
    expect(shouldShowSystemAlert("granted", false)).toBe(false);
    expect(shouldShowSystemAlert("default", true)).toBe(false);
    expect(shouldShowSystemAlert("denied", true)).toBe(false);
    expect(shouldShowSystemAlert("unsupported", true)).toBe(false);
  });
});
