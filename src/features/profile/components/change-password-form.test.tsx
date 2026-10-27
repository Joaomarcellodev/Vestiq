import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const changePassword = vi.fn();
const toast = vi.fn();
vi.mock("../actions", () => ({
  changePassword: (p: unknown, fd: FormData) => changePassword(p, fd),
}));
vi.mock("@/components/organisms/toast/toast-provider", () => ({ useToast: () => ({ toast }) }));

const { ChangePasswordForm } = await import("./change-password-form");

async function fill(current: string, password: string, confirm = password) {
  await userEvent.type(screen.getByLabelText("Senha atual"), current);
  await userEvent.type(screen.getByLabelText("Nova senha"), password);
  await userEvent.type(screen.getByLabelText("Confirmar nova senha"), confirm);
  await userEvent.click(screen.getByRole("button", { name: /alterar senha/i }));
}

describe("ChangePasswordForm (VES-92)", () => {
  it("sends the three fields and toasts on success", async () => {
    changePassword.mockResolvedValueOnce({ ok: true });
    render(<ChangePasswordForm />);
    await fill("antiga-123", "nova-senha-1");

    const fd = changePassword.mock.calls.at(-1)![1] as FormData;
    expect(Object.fromEntries(fd)).toEqual({
      current: "antiga-123",
      password: "nova-senha-1",
      confirm: "nova-senha-1",
    });
    await vi.waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ message: "Senha alterada.", variant: "success" }),
    );
  });

  it("shows a wrong current password next to its field", async () => {
    changePassword.mockResolvedValueOnce({ fieldErrors: { current: "Senha atual incorreta." } });
    render(<ChangePasswordForm />);
    await fill("errada", "nova-senha-1");

    expect(await screen.findByText("Senha atual incorreta.")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha atual")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a top-level error", async () => {
    changePassword.mockResolvedValueOnce({ error: "Não foi possível alterar a senha." });
    render(<ChangePasswordForm />);
    await fill("antiga-123", "nova-senha-1");
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível alterar a senha.");
  });
});
