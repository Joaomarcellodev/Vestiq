import { describe, expect, it } from "vitest";
import {
  dayLabel,
  isStatusEvent,
  mergeEvents,
  timeLabel,
  toChatEvent,
  type ChatEvent,
} from "./chat";

const ev = (id: string, createdAt: string, over: Partial<ChatEvent> = {}): ChatEvent => ({
  id,
  type: "MESSAGE",
  body: id,
  createdAt,
  actorId: "u1",
  ...over,
});

describe("mergeEvents", () => {
  it("dedupes by id and keeps chronological order", () => {
    const current = [ev("a", "2026-09-25T10:00:00Z"), ev("c", "2026-09-25T10:02:00Z")];
    const merged = mergeEvents(current, [
      ev("b", "2026-09-25T10:01:00Z"),
      ev("c", "2026-09-25T10:02:00Z"),
    ]);
    expect(merged.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("orders by instant even when timestamps are formatted differently", () => {
    const merged = mergeEvents(
      [ev("rest", "2026-09-25T10:00:01.5+00:00")],
      [ev("realtime", "2026-09-25T09:59:59Z")],
    );
    expect(merged.map((e) => e.id)).toEqual(["realtime", "rest"]);
  });

  it("keeps an optimistic event pending until the server version replaces it", () => {
    const pending = ev("tmp", "2026-09-25T10:00:00Z", { pending: true });
    expect(mergeEvents([ev("a", "2026-09-25T09:00:00Z")], [pending])[1]!.pending).toBe(true);
  });

  it("clears the pending flag once the server version arrives", () => {
    const merged = mergeEvents(
      [ev("a", "2026-09-25T10:00:00Z", { pending: true })],
      [ev("a", "2026-09-25T10:00:00Z")],
    );
    expect(merged[0]!.pending).toBeFalsy();
  });
});

describe("isStatusEvent", () => {
  it("flags only the events that change the negotiation", () => {
    expect(isStatusEvent("MESSAGE")).toBe(false);
    expect(isStatusEvent("CREATED")).toBe(false);
    for (const t of ["ACCEPTED", "REJECTED", "CANCELLED", "COMPLETED"] as const) {
      expect(isStatusEvent(t)).toBe(true);
    }
  });
});

describe("dayLabel / timeLabel (São Paulo time on server and browser)", () => {
  const now = new Date("2026-09-25T18:00:00Z"); // 15:00 in São Paulo

  it("names today and yesterday, dates otherwise", () => {
    expect(dayLabel("2026-09-25T11:00:00Z", now)).toBe("Hoje");
    expect(dayLabel("2026-09-24T12:00:00Z", now)).toBe("Ontem");
    expect(dayLabel("2026-09-12T12:00:00Z", now)).toBe("12/09/2026");
  });

  it("uses the São Paulo calendar day, not UTC", () => {
    // 01:30 UTC on the 26th is still 22:30 on the 25th in São Paulo
    expect(dayLabel("2026-09-26T01:30:00Z", new Date("2026-09-26T02:00:00Z"))).toBe("Hoje");
    expect(dayLabel("2026-09-26T01:30:00Z", new Date("2026-09-26T12:00:00Z"))).toBe("Ontem");
    expect(timeLabel("2026-09-26T01:30:00Z")).toBe("22:30");
  });
});

describe("toChatEvent", () => {
  it("maps a database row", () => {
    expect(
      toChatEvent({ id: "1", type: "MESSAGE", body: "oi", created_at: "t", actor_id: null }),
    ).toEqual({ id: "1", type: "MESSAGE", body: "oi", createdAt: "t", actorId: null });
  });
});
