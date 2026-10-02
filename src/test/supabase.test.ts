import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withAuthRetry } from "./supabase";

describe("withAuthRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const ok = { data: "user", error: null };
  const dbError = {
    data: null,
    error: new AuthRetryableFetchError("Database error creating new user", 500),
  };

  it("retries a transient GoTrue failure until it succeeds", async () => {
    const call = vi.fn().mockResolvedValueOnce(dbError).mockResolvedValueOnce(ok);

    const pending = withAuthRetry(call);
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBe(ok);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("retries a 5xx API error", async () => {
    const serverError = { data: null, error: new AuthApiError("boom", 500, "unexpected_failure") };
    const call = vi.fn().mockResolvedValueOnce(serverError).mockResolvedValueOnce(ok);

    const pending = withAuthRetry(call);
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBe(ok);
  });

  it("gives up after three attempts and returns the last failure", async () => {
    const call = vi.fn().mockResolvedValue(dbError);

    const pending = withAuthRetry(call);
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBe(dbError);
    expect(call).toHaveBeenCalledTimes(3);
  });

  it("does not retry a client error", async () => {
    const taken = {
      data: null,
      error: new AuthApiError("already registered", 422, "email_exists"),
    };
    const call = vi.fn().mockResolvedValue(taken);

    await expect(withAuthRetry(call)).resolves.toBe(taken);
    expect(call).toHaveBeenCalledTimes(1);
  });
});
