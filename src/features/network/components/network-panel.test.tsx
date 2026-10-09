import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createNetwork = vi.fn().mockResolvedValue({});
const inviteReseller = vi.fn().mockResolvedValue({});
const setMemberActive = vi.fn().mockResolvedValue(undefined);
const acceptInvite = vi.fn().mockResolvedValue({});
const toast = vi.fn();

vi.mock("../actions", () => ({
  createNetwork: (p: unknown, fd: FormData) => createNetwork(p, fd),
  inviteReseller: (p: unknown, fd: FormData) => inviteReseller(p, fd),
  setMemberActive: (fd: FormData) => setMemberActive(fd),
  acceptInvite: (p: unknown, fd: FormData) => acceptInvite(p, fd),
}));
vi.mock("@/components/organisms/toast/toast-provider", () => ({ useToast: () => ({ toast }) }));

const { CreateNetworkForm, InviteResellerForm } = await import("./factory-network-panel");
const { MemberActiveSwitch } = await import("./member-active-switch");
const { AcceptInviteForm } = await import("./accept-invite-form");

describe("CreateNetworkForm", () => {
  it("submits and toasts on success", async () => {
    createNetwork.mockResolvedValueOnce({ ok: true });
    render(<CreateNetworkForm />);
    await userEvent.type(screen.getByLabelText(/nome da nova rede/i), "Rede X");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));
    expect(createNetwork).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({ message: "Rede criada.", variant: "success" });
  });
});

describe("InviteResellerForm", () => {
  it("submits and toasts on success", async () => {
    inviteReseller.mockResolvedValueOnce({ ok: true });
    render(<InviteResellerForm networks={[{ id: "n1", name: "Rede A" }]} />);
    await userEvent.type(screen.getByLabelText(/email da revendedora/i), "nova@x.com");
    await userEvent.click(screen.getByRole("button", { name: /enviar convite/i }));
    expect(inviteReseller).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({ message: "Convite enviado.", variant: "success" });
  });
});

describe("MemberActiveSwitch", () => {
  it("toggles the member and toasts with the reseller name", async () => {
    render(<MemberActiveSwitch memberId="m1" active resellerName="Loja Ana" />);
    await userEvent.click(screen.getByRole("switch"));
    const fd = setMemberActive.mock.calls.at(-1)?.[0] as FormData;
    expect(fd.get("memberId")).toBe("m1");
    expect(fd.get("active")).toBe("false");
    expect(toast).toHaveBeenCalledWith({ message: "Loja Ana desativada.", variant: "info" });
  });

  it("re-activates a disabled member", async () => {
    render(<MemberActiveSwitch memberId="m2" active={false} resellerName="Loja B" />);
    await userEvent.click(screen.getByRole("switch"));
    expect(setMemberActive.mock.calls.at(-1)?.[0].get("active")).toBe("true");
    expect(toast).toHaveBeenCalledWith({ message: "Loja B reativada.", variant: "success" });
  });
});

describe("AcceptInviteForm (TC-NET-15)", () => {
  it("asks an invited account for its password and posts it", async () => {
    acceptInvite.mockResolvedValueOnce({ error: "As senhas não coincidem." });
    render(<AcceptInviteForm token="t1" needsPassword />);
    await userEvent.type(screen.getByLabelText("Crie sua senha"), "senha-forte-1");
    await userEvent.type(screen.getByLabelText("Confirme a senha"), "senha-forte-1");
    await userEvent.click(screen.getByRole("button", { name: "Aceitar convite" }));

    const fd = acceptInvite.mock.calls[0]![1] as FormData;
    expect([fd.get("token"), fd.get("password"), fd.get("confirm")]).toEqual([
      "t1",
      "senha-forte-1",
      "senha-forte-1",
    ]);
    expect(await screen.findByRole("alert")).toHaveTextContent("As senhas não coincidem.");
  });

  it("doesn't ask for a password from an account that already has one", () => {
    render(<AcceptInviteForm token="t1" />);
    expect(screen.queryByLabelText("Crie sua senha")).not.toBeInTheDocument();
  });
});
