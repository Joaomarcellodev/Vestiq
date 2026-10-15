import { beforeEach, describe, expect, it, vi } from "vitest";

const inviteUserByEmail = vi.fn();
const signInWithOtp = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ auth: { admin: { inviteUserByEmail }, signInWithOtp } }),
}));

const { sendInviteEmail } = await import("./invite-email");

const RATE_LIMITED =
  "Muitos emails enviados em pouco tempo. Aguarde alguns minutos e tente de novo — enquanto isso, você pode copiar o link do convite.";

describe("sendInviteEmail when Auth rate-limits emails (VES-88)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("says to wait instead of a generic failure", async () => {
    inviteUserByEmail.mockResolvedValue({
      error: { status: 429, code: "over_email_send_rate_limit" },
    });
    expect(await sendInviteEmail("a@b.com", "tok")).toEqual({ error: RATE_LIMITED });
  });

  it("also for the access link sent to an existing account", async () => {
    inviteUserByEmail.mockResolvedValue({ error: { status: 422, code: "email_exists" } });
    signInWithOtp.mockResolvedValue({ error: { status: 429 } });
    expect(await sendInviteEmail("a@b.com", "tok")).toEqual({ error: RATE_LIMITED });
  });

  it("keeps the generic message for other failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    inviteUserByEmail.mockResolvedValue({ error: { status: 500, code: "unexpected_failure" } });
    expect(await sendInviteEmail("a@b.com", "tok")).toEqual({
      error: "Não foi possível enviar o email de convite. Tente novamente em instantes.",
    });
  });
});
