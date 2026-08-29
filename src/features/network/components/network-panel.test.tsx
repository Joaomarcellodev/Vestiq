import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createNetwork = vi.fn().mockResolvedValue({});
const inviteReseller = vi.fn().mockResolvedValue({});
const setMemberActive = vi.fn().mockResolvedValue(undefined);
const toast = vi.fn();

vi.mock("../actions", () => ({
  createNetwork: (p: unknown, fd: FormData) => createNetwork(p, fd),
  inviteReseller: (p: unknown, fd: FormData) => inviteReseller(p, fd),
  setMemberActive: (fd: FormData) => setMemberActive(fd),
}));
vi.mock("@/components/organisms/toast/toast-provider", () => ({ useToast: () => ({ toast }) }));

const { CreateNetworkForm, InviteResellerForm } = await import("./factory-network-panel");
const { MemberActiveSwitch } = await import("./member-active-switch");

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
