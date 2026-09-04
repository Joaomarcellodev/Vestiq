import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

  it("offers the remove control only when there is a photo", () => {
    const { unmount } = render(<ProfileForm profile={profile} />);
    expect(screen.queryByRole("button", { name: /remover foto/i })).toBeNull();
    expect(screen.getByRole("button", { name: /escolher imagem/i })).toBeInTheDocument();
    unmount();

    render(<ProfileForm profile={{ ...profile, avatarUrl: "/avatar.png" }} />);
    expect(screen.getByRole("button", { name: /remover foto/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /trocar imagem/i })).toBeInTheDocument();
  });

  it("clears the preview and flags the removal on submit", async () => {
    render(<ProfileForm profile={{ ...profile, avatarUrl: "/avatar.png" }} />);
    await userEvent.click(screen.getByRole("button", { name: /remover foto/i }));

    expect(document.querySelector("section img")).toBeNull();
    expect(screen.queryByRole("button", { name: /remover foto/i })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));
    const fd = updateProfile.mock.calls.at(-1)?.[1] as FormData;
    expect(fd.get("removeAvatar")).toBe("1");
    expect((fd.get("avatar") as File).size).toBe(0);
  });

  it("sends the chosen file and drops the removal flag", async () => {
    render(<ProfileForm profile={{ ...profile, avatarUrl: "/avatar.png" }} />);
    await userEvent.click(screen.getByRole("button", { name: /remover foto/i }));

    const file = new File([Uint8Array.from([1, 2, 3])], "me.png", { type: "image/png" });
    await userEvent.upload(document.querySelector("input[name=avatar]") as HTMLInputElement, file);
    await waitFor(() => expect(document.querySelector("section img")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));
    const fd = updateProfile.mock.calls.at(-1)?.[1] as FormData;
    expect(fd.get("removeAvatar")).toBeNull();
    expect(fd.get("avatar")).toBeInstanceOf(File);
  });
});
