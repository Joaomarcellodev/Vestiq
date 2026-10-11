import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const cancelInvite = vi.fn();
const resendInvite = vi.fn();
const toast = vi.fn();

vi.mock("../actions", () => ({
  cancelInvite: (fd: FormData) => cancelInvite(fd),
  resendInvite: (fd: FormData) => resendInvite(fd),
}));
vi.mock("@/components/organisms/toast/toast-provider", () => ({ useToast: () => ({ toast }) }));

const { PendingInviteActions } = await import("./pending-invite-actions");

describe("PendingInviteActions (VES-88)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resends the invite and confirms with the email", async () => {
    resendInvite.mockResolvedValue({ ok: true });
    render(<PendingInviteActions memberId="m1" email="nova@loja.com" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Reenviar convite para nova@loja.com" }),
    );

    expect((resendInvite.mock.calls[0]![0] as FormData).get("memberId")).toBe("m1");
    expect(toast).toHaveBeenCalledWith({
      message: "Convite reenviado para nova@loja.com.",
      variant: "success",
    });
  });

  it("asks before cancelling, and 'Não' backs out", async () => {
    render(<PendingInviteActions memberId="m1" email="nova@loja.com" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Cancelar convite de nova@loja.com" }),
    );
    expect(screen.getByText("Cancelar convite?")).toBeVisible();
    expect(cancelInvite).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Não" }));
    expect(screen.getByRole("button", { name: /reenviar/i })).toBeVisible();
    expect(cancelInvite).not.toHaveBeenCalled();
  });

  it("cancels on the second click", async () => {
    cancelInvite.mockResolvedValue({});
    render(<PendingInviteActions memberId="m1" email="nova@loja.com" />);

    await userEvent.click(screen.getByRole("button", { name: /cancelar convite de/i }));
    await userEvent.click(screen.getByRole("button", { name: "Sim, cancelar" }));

    expect((cancelInvite.mock.calls[0]![0] as FormData).get("memberId")).toBe("m1");
    expect(toast).toHaveBeenCalledWith({ message: "Convite cancelado.", variant: "success" });
  });

  it("shows the action's error", async () => {
    resendInvite.mockResolvedValue({ error: "Muitos emails enviados em pouco tempo." });
    render(<PendingInviteActions memberId="m1" email="nova@loja.com" />);

    await userEvent.click(screen.getByRole("button", { name: /reenviar/i }));

    expect(toast).toHaveBeenCalledWith({
      message: "Muitos emails enviados em pouco tempo.",
      variant: "error",
    });
  });
});
