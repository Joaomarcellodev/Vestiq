import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const updateOffer = vi.fn().mockResolvedValue({});
vi.mock("../actions", () => ({
  updateOffer: (p: unknown, fd: FormData) => updateOffer(p, fd),
}));

const { EditOfferForm } = await import("./edit-offer-form");

const offer = {
  id: "o1",
  remaining: 4,
  price: 100,
  note: "Nova",
  maxQuantity: 10,
  negotiationInProgress: false,
};

describe("EditOfferForm (VES-89)", () => {
  it("starts from the offer's values and caps the quantity at the free stock", () => {
    render(<EditOfferForm offer={offer} />);
    const quantity = screen.getByLabelText("Quantidade disponível");
    expect(quantity).toHaveValue(4);
    expect(quantity).toHaveAttribute("max", "10");
    expect(screen.getByText("Até 10 — o estoque livre desta variação.")).toBeInTheDocument();
    expect(screen.getByLabelText("Preço de transferência (R$)")).toHaveValue(100);
    expect(screen.getByLabelText("Observação")).toHaveValue("Nova");
  });

  it("sends the edited fields and keeps them when the action fails", async () => {
    updateOffer.mockResolvedValueOnce({
      error: "Estoque livre insuficiente",
      fieldErrors: {},
    });
    render(<EditOfferForm offer={offer} />);
    const price = screen.getByLabelText("Preço de transferência (R$)");
    await userEvent.clear(price);
    await userEvent.type(price, "80");
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    const fd = updateOffer.mock.calls.at(-1)![1] as FormData;
    expect(Object.fromEntries(fd)).toMatchObject({
      offerId: "o1",
      quantity: "4",
      transferPrice: "80",
      note: "Nova",
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Estoque livre insuficiente");
    expect(price).toHaveValue(80);
  });

  it("explains instead of showing the form while a negotiation is in progress", () => {
    render(<EditOfferForm offer={{ ...offer, negotiationInProgress: true }} />);
    expect(screen.getByText(/negociação em andamento/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /salvar alterações/i })).toBeNull();
  });
});
