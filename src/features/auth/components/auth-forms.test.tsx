import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signInWithPassword = vi.fn();
const signInWithOAuth = vi.fn();
const requestPasswordReset = vi.fn();
const updatePassword = vi.fn();

vi.mock("../actions", () => ({
  signInWithPassword: (p: unknown, fd: FormData) => signInWithPassword(p, fd),
  signInWithOAuth: (fd: FormData) => signInWithOAuth(fd),
  requestPasswordReset: (p: unknown, fd: FormData) => requestPasswordReset(p, fd),
  updatePassword: (p: unknown, fd: FormData) => updatePassword(p, fd),
}));

const { LoginForm } = await import("./login-form");
const { ForgotPasswordForm } = await import("./forgot-password-form");
const { ResetPasswordForm } = await import("./reset-password-form");
const { AuthScreen } = await import("./auth-screen");

describe("LoginForm", () => {
  it("renders email/password fields, the Google button and the forgot-password link", () => {
    render(<LoginForm next="/dashboard" />);
    expect(screen.getByLabelText(/email profissional/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Senha", { exact: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuar com google/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /esqueci minha senha/i })).toHaveAttribute(
      "href",
      "/recuperar-senha",
    );
    expect(screen.queryByRole("button", { name: /apple/i })).not.toBeInTheDocument();
  });

  it("shows the OAuth error banner", () => {
    render(<LoginForm next="/dashboard" oauthError />);
    expect(screen.getByRole("alert")).toHaveTextContent(/login social/i);
  });

  it("surfaces field errors returned by the action", async () => {
    signInWithPassword.mockResolvedValueOnce({ fieldErrors: { email: "Email inválido." } });
    render(<LoginForm next="/dashboard" />);
    await userEvent.type(screen.getByLabelText(/email profissional/i), "x");
    await userEvent.type(screen.getByLabelText("Senha", { exact: true }), "y");
    await userEvent.click(screen.getByRole("button", { name: /entrar na plataforma/i }));
    expect(await screen.findByText("Email inválido.")).toBeInTheDocument();
  });

  it("submits the OAuth form with the google provider + next", async () => {
    render(<LoginForm next="/vendas" />);
    await userEvent.click(screen.getByRole("button", { name: /continuar com google/i }));
    const fd = signInWithOAuth.mock.calls[0]?.[0] as FormData;
    expect(fd.get("provider")).toBe("google");
    expect(fd.get("next")).toBe("/vendas");
  });
});

describe("ForgotPasswordForm", () => {
  it("shows a generic success message once submitted", async () => {
    requestPasswordReset.mockResolvedValueOnce({ ok: true });
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText(/email profissional/i), "a@b.com");
    await userEvent.click(screen.getByRole("button", { name: /enviar link/i }));
    expect(await screen.findByText(/se existe uma conta com esse email/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voltar para o login/i })).toBeInTheDocument();
  });

  it("shows a field error", async () => {
    requestPasswordReset.mockResolvedValueOnce({ fieldErrors: { email: "Email inválido." } });
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText(/email profissional/i), "bad");
    await userEvent.click(screen.getByRole("button", { name: /enviar link/i }));
    expect(await screen.findByText("Email inválido.")).toBeInTheDocument();
  });
});

describe("ResetPasswordForm", () => {
  it("shows field errors from the action", async () => {
    updatePassword.mockResolvedValueOnce({ fieldErrors: { confirm: "As senhas não coincidem." } });
    render(<ResetPasswordForm />);
    await userEvent.type(screen.getByLabelText("Nova senha"), "longenough1");
    await userEvent.type(screen.getByLabelText("Confirmar nova senha"), "different1");
    await userEvent.click(screen.getByRole("button", { name: /redefinir senha/i }));
    expect(await screen.findByText("As senhas não coincidem.")).toBeInTheDocument();
  });

  it("shows a top-level error", async () => {
    updatePassword.mockResolvedValueOnce({ error: "Sessão expirada." });
    render(<ResetPasswordForm />);
    await userEvent.type(screen.getByLabelText("Nova senha"), "longenough1");
    await userEvent.type(screen.getByLabelText("Confirmar nova senha"), "longenough1");
    await userEvent.click(screen.getByRole("button", { name: /redefinir senha/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sessão expirada.");
  });
});

describe("AuthScreen", () => {
  it("renders the title, subtitle and children", () => {
    render(
      <AuthScreen title="Entrar" subtitle="Bem-vindo">
        <p>form</p>
      </AuthScreen>,
    );
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByText("Bem-vindo")).toBeInTheDocument();
    expect(screen.getByText("form")).toBeInTheDocument();
  });
});
