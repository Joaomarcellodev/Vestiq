import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signUpFromInvite = vi.fn().mockResolvedValue({});

vi.mock("../actions", () => ({
  signUpFromInvite: (p: unknown, fd: FormData) => signUpFromInvite(p, fd),
}));

const { InviteSignupForm } = await import("./invite-signup-form");

describe("InviteSignupForm (VES-95)", () => {
  it("shows the invited email locked and posts the signup", async () => {
    render(<InviteSignupForm token="t1" email="nova@loja.com" />);
    const email = screen.getByLabelText("Email");
    expect(email).toHaveValue("nova@loja.com");
    expect(email).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Nome da sua loja"), "Atelier Sarah");
    await userEvent.type(screen.getByLabelText("Crie sua senha"), "senha-forte-1");
    await userEvent.type(screen.getByLabelText("Confirme a senha"), "senha-forte-1");
    await userEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    const fd = signUpFromInvite.mock.calls[0]![1] as FormData;
    expect(Object.fromEntries(fd)).toEqual({
      token: "t1",
      resellerName: "Atelier Sarah",
      password: "senha-forte-1",
      confirm: "senha-forte-1",
    });
  });

  it("shows field errors and keeps what was typed", async () => {
    signUpFromInvite.mockResolvedValueOnce({
      fieldErrors: { confirm: "As senhas não coincidem." },
    });
    render(<InviteSignupForm token="t1" email="nova@loja.com" />);
    await userEvent.type(screen.getByLabelText("Nome da sua loja"), "Atelier Sarah");
    await userEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(await screen.findByText("As senhas não coincidem.")).toBeVisible();
    expect(screen.getByLabelText("Nome da sua loja")).toHaveValue("Atelier Sarah");
  });

  it("sends whoever already has an account to log in and come back", () => {
    render(<InviteSignupForm token="t1" email="nova@loja.com" />);
    expect(screen.getByRole("link", { name: /entrar para aceitar/i })).toHaveAttribute(
      "href",
      "/login?next=%2Fconvite%2Ft1",
    );
  });
});
