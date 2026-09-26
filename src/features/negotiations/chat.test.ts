import { describe, expect, it } from "vitest";
import { dayLabel, isStatusEvent, mergeEvents, toChatEvent, type ChatEvent } from "./chat";

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

  it("clears the pending flag once the server version arrives", () => {
    const merged = mergeEvents(
      [ev("a", "2026-09-25T10:00:00Z", { pending: true })],
      [ev("a", "2026-09-25T10:00:00Z")],
    );
    expect(merged[0]!.pending).toBe(false);
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

describe("dayLabel", () => {
  const now = new Date(2026, 8, 25, 15, 0);
  it("names today and yesterday, dates otherwise", () => {
    expect(dayLabel(new Date(2026, 8, 25, 8, 0).toISOString(), now)).toBe("Hoje");
    expect(dayLabel(new Date(2026, 8, 24, 23, 0).toISOString(), now)).toBe("Ontem");
    expect(dayLabel(new Date(2026, 8, 12, 9, 0).toISOString(), now)).toBe("12/09/2026");
  });
});

describe("toChatEvent", () => {
  it("maps a database row", () => {
    expect(
      toChatEvent({ id: "1", type: "MESSAGE", body: "oi", created_at: "t", actor_id: null }),
    ).toEqual({ id: "1", type: "MESSAGE", body: "oi", createdAt: "t", actorId: null });
  });
});
