import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const customerActions = {
  createCustomer: vi.fn().mockResolvedValue({}),
  updateCustomer: vi.fn().mockResolvedValue({}),
};
const offerActions = { publishOffer: vi.fn().mockResolvedValue({}) };
const negActions = { openNegotiation: vi.fn().mockResolvedValue({}) };
const invActions = {
  recordEntry: vi.fn().mockResolvedValue({}),
  adjustStock: vi.fn().mockResolvedValue({}),
};
const netActions = { acceptInvite: vi.fn().mockResolvedValue({}) };

vi.mock("@/features/customers/actions", () => ({
  createCustomer: (p: unknown, fd: FormData) => customerActions.createCustomer(p, fd),
  updateCustomer: (p: unknown, fd: FormData) => customerActions.updateCustomer(p, fd),
}));
vi.mock("@/features/offers/actions", () => ({
  publishOffer: (p: unknown, fd: FormData) => offerActions.publishOffer(p, fd),
}));
vi.mock("@/features/negotiations/actions", () => ({
  openNegotiation: (p: unknown, fd: FormData) => negActions.openNegotiation(p, fd),
}));
vi.mock("@/features/inventory/actions", () => ({
  recordEntry: (p: unknown, fd: FormData) => invActions.recordEntry(p, fd),
  adjustStock: (p: unknown, fd: FormData) => invActions.adjustStock(p, fd),
}));
vi.mock("@/features/network/actions", () => ({
  acceptInvite: (p: unknown, fd: FormData) => netActions.acceptInvite(p, fd),
}));

const { CustomerForm } = await import("./customers/components/customer-form");
const { PublishOfferForm } = await import("./offers/components/publish-offer-form");
const { ProposeForm } = await import("./negotiations/components/propose-form");
const { StockControls } = await import("./inventory/components/stock-controls");
const { AcceptInviteForm } = await import("./network/components/accept-invite-form");

describe("CustomerForm", () => {
  it("creates when no customer is given", async () => {
    render(<CustomerForm />);
    await userEvent.type(screen.getByLabelText("Nome"), "Ana");
    await userEvent.click(screen.getByRole("button", { name: /salvar cliente/i }));
    expect(customerActions.createCustomer).toHaveBeenCalled();
  });

  it("edits and prefills when a customer is given", async () => {
    render(
      <CustomerForm
        customer={{
          id: "c1",
          name: "Ana",
          email: "a@x.com",
          phone: null,
          document: null,
          notes: null,
        }}
      />,
    );
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana");
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));
    expect(customerActions.updateCustomer).toHaveBeenCalled();
  });

  it("shows an action error", async () => {
    customerActions.createCustomer.mockResolvedValueOnce({ error: "CPF já existe" });
    render(<CustomerForm />);
    await userEvent.type(screen.getByLabelText("Nome"), "X");
    await userEvent.click(screen.getByRole("button", { name: /salvar cliente/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("CPF já existe");
  });
});

describe("PublishOfferForm", () => {
  const variants = [{ id: "v1", label: "Bolsa · M" }];
  const networks = [{ id: "n1", name: "Rede A" }];

  it("shows an empty message when there is nothing to offer", () => {
    render(<PublishOfferForm variants={[]} networks={networks} />);
    expect(screen.getByText(/não tem variações com estoque/i)).toBeInTheDocument();
  });

  it("shows an empty message when the seller is in no network", () => {
    render(<PublishOfferForm variants={variants} networks={[]} />);
    expect(screen.getByText(/não pertence a nenhuma rede/i)).toBeInTheDocument();
  });

  it("submits the offer", async () => {
    render(<PublishOfferForm variants={variants} networks={networks} />);
    await userEvent.type(screen.getByLabelText(/quantidade ofertada/i), "3");
    await userEvent.type(screen.getByLabelText(/preço de transferência/i), "250");
    await userEvent.click(screen.getByRole("button", { name: /publicar na rede/i }));
    expect(offerActions.publishOffer).toHaveBeenCalled();
  });
});

describe("ProposeForm", () => {
  it("caps the quantity at the remaining amount and submits", async () => {
    render(<ProposeForm offerId="o1" remaining={4} />);
    const qty = screen.getByLabelText(/quantidade \(até 4\)/i);
    expect(qty).toHaveAttribute("max", "4");
    await userEvent.type(qty, "2");
    await userEvent.type(screen.getByLabelText(/valor proposto/i), "500");
    await userEvent.click(screen.getByRole("button", { name: /enviar proposta/i }));
    expect(negActions.openNegotiation).toHaveBeenCalled();
  });

  it("shows an action error", async () => {
    negActions.openNegotiation.mockResolvedValueOnce({ error: "Oferta indisponível" });
    render(<ProposeForm offerId="o1" remaining={4} />);
    await userEvent.type(screen.getByLabelText(/quantidade \(até 4\)/i), "1");
    await userEvent.type(screen.getByLabelText(/valor proposto/i), "1");
    await userEvent.click(screen.getByRole("button", { name: /enviar proposta/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Oferta indisponível");
  });
});

describe("StockControls", () => {
  it("switches between entry and adjust modes and submits each", async () => {
    render(<StockControls variantId="v1" />);
    await userEvent.click(screen.getByRole("button", { name: "Entrada" }));
    await userEvent.type(screen.getByLabelText("Quantidade"), "5");
    await userEvent.click(screen.getByRole("button", { name: /registrar entrada/i }));
    expect(invActions.recordEntry).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await userEvent.click(screen.getByRole("button", { name: "Ajuste" }));
    await userEvent.type(screen.getByLabelText(/ajuste/i), "-2");
    await userEvent.type(screen.getByLabelText("Motivo"), "perda");
    await userEvent.click(screen.getByRole("button", { name: /aplicar ajuste/i }));
    expect(invActions.adjustStock).toHaveBeenCalled();
  });

  it("shows the success line after an entry", async () => {
    invActions.recordEntry.mockResolvedValueOnce({ ok: true });
    render(<StockControls variantId="v1" />);
    await userEvent.click(screen.getByRole("button", { name: "Entrada" }));
    await userEvent.type(screen.getByLabelText("Quantidade"), "1");
    await userEvent.click(screen.getByRole("button", { name: /registrar entrada/i }));
    expect(await screen.findByText(/entrada registrada/i)).toBeInTheDocument();
  });
});

describe("AcceptInviteForm", () => {
  it("submits the token + optional reseller name", async () => {
    render(<AcceptInviteForm token="tok-123" />);
    await userEvent.type(screen.getByLabelText(/nome da sua loja/i), "Minha Loja");
    await userEvent.click(screen.getByRole("button", { name: /aceitar convite/i }));
    const fd = netActions.acceptInvite.mock.calls.at(-1)?.[1] as FormData;
    expect(fd.get("token")).toBe("tok-123");
    expect(fd.get("resellerName")).toBe("Minha Loja");
  });

  it("shows an action error", async () => {
    netActions.acceptInvite.mockResolvedValueOnce({ error: "Convite inválido" });
    render(<AcceptInviteForm token="tok" />);
    await userEvent.click(screen.getByRole("button", { name: /aceitar convite/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Convite inválido");
  });
});
