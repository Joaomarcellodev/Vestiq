import { describe, expect, it } from "vitest";
import { canTransition, isTerminal, transition } from "./state-machine";
import type { NegotiationAction, NegotiationStatus, Party } from "./state-machine";

describe("negotiation state machine", () => {
  const legal: Array<[NegotiationStatus, NegotiationAction, Party, NegotiationStatus]> = [
    ["PENDING", "accept", "seller", "ACCEPTED"],
    ["PENDING", "reject", "seller", "REJECTED"],
    ["PENDING", "cancel", "buyer", "CANCELLED"],
    ["ACCEPTED", "cancel", "seller", "CANCELLED"],
    ["ACCEPTED", "cancel", "buyer", "CANCELLED"],
    ["ACCEPTED", "complete", "seller", "COMPLETED"],
  ];

  it.each(legal)("%s + %s by %s -> %s", (status, action, party, expected) => {
    expect(transition(status, action, party)).toBe(expected);
  });

  const illegal: Array<[NegotiationStatus, NegotiationAction, Party]> = [
    ["PENDING", "complete", "seller"], // must be accepted first
    ["PENDING", "accept", "buyer"], // only seller accepts
    ["PENDING", "reject", "buyer"], // only seller rejects
    ["PENDING", "cancel", "seller"], // only buyer cancels pending
    ["REJECTED", "accept", "seller"], // terminal
    ["CANCELLED", "cancel", "buyer"], // terminal
    ["COMPLETED", "complete", "seller"], // terminal
    ["ACCEPTED", "accept", "seller"], // already accepted
    ["COMPLETED", "cancel", "seller"], // terminal
  ];

  it.each(illegal)("rejects %s + %s by %s", (status, action, party) => {
    expect(transition(status, action, party)).toBeInstanceOf(Error);
    expect(canTransition(status, action, party)).toBe(false);
  });

  it("marks terminal states", () => {
    expect(isTerminal("COMPLETED")).toBe(true);
    expect(isTerminal("REJECTED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("PENDING")).toBe(false);
    expect(isTerminal("ACCEPTED")).toBe(false);
  });
});
