import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const updateProfile = vi.fn().mockResolvedValue({});
const toast = vi.fn();
vi.mock("../actions", () => ({
  updateProfile: (p: unknown, fd: FormData) => updateProfile(p, fd),
}));
vi.mock("@/components/organisms/toast/toast-provider", () => ({ useToast: () => ({ toast }) }));

const { ProfileForm } = await import("./profile-form");

const profile = {
  id: "u1",
  email: "ana@x.com",
  fullName: "Ana Souza",
  avatarUrl: null,
  birthDate: "1990-01-01",
};

describe("ProfileForm", () => {
  it("prefills the fields", () => {
    render(<ProfileForm profile={profile} />);
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Ana Souza");
    expect(screen.getByLabelText("Email")).toHaveValue("ana@x.com");
    expect(screen.getByLabelText("Data de nascimento")).toHaveValue("1990-01-01");
  });

  it("previews a chosen avatar", async () => {
    render(<ProfileForm profile={profile} />);
    const file = new File([Uint8Array.from([1, 2, 3])], "me.png", { type: "image/png" });
    await userEvent.upload(document.querySelector("input[name=avatar]") as HTMLInputElement, file);
    expect(document.querySelector("section img")).toBeInTheDocument();
  });

  it("fires a toast on the ok state and an alert on error", async () => {
    updateProfile.mockResolvedValueOnce({ ok: "Perfil atualizado." });
    render(<ProfileForm profile={profile} />);
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));
    expect(toast).toHaveBeenCalledWith({ message: "Perfil atualizado.", variant: "success" });

    updateProfile.mockResolvedValueOnce({ error: "Falha" });
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha");
  });
});
