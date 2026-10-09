import { describe, expect, it } from "vitest";
import { needsPassword } from "./invite-password";

describe("needsPassword (AC-NET-004-04)", () => {
  it("asks for a password only from accounts created by the invite", () => {
    expect(needsPassword({ invited_at: "2026-10-08T00:00:00Z", user_metadata: {} })).toBe(true);
    expect(
      needsPassword({ invited_at: "2026-10-08T00:00:00Z", user_metadata: { password_set: true } }),
    ).toBe(false);
    expect(needsPassword({ invited_at: undefined, user_metadata: {} })).toBe(false);
  });
});
