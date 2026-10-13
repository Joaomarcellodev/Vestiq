import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const toast = vi.fn();
vi.mock("@/components/organisms/toast/toast-provider", () => ({ useToast: () => ({ toast }) }));

const { CopyInviteLink } = await import("./copy-invite-link");

describe("CopyInviteLink (VES-95)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("copies the invite URL on this site and confirms", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<CopyInviteLink token="tok-1" email="nova@loja.com" />);

    await user.click(
      screen.getByRole("button", { name: "Copiar link do convite de nova@loja.com" }),
    );

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/convite/tok-1`);
    expect(toast).toHaveBeenCalledWith({ message: "Link do convite copiado.", variant: "success" });
  });

  it("shows the link when the clipboard is unavailable", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<CopyInviteLink token="tok-2" email="x@y.com" />);

    await user.click(screen.getByRole("button", { name: /copiar link/i }));

    expect(toast).toHaveBeenCalledWith({
      message: `Não foi possível copiar. Link: ${window.location.origin}/convite/tok-2`,
      variant: "error",
    });
  });
});
