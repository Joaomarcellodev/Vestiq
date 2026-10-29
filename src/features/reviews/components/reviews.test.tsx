import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { transactionPath } from "../validation";

const submitReview = vi.fn();
vi.mock("../actions", () => ({
  submitReview: (p: unknown, fd: FormData) => submitReview(p, fd),
}));

const { ReviewSection } = await import("./review-section");
const { StarRating } = await import("./star-rating");

const REVIEW = { rating: 4, comment: "Entrega rápida", createdAt: "2026-10-29T12:00:00Z" };

describe("reviews (VES-42)", () => {
  it("StarRating fills the stars up to the rounded value and labels it", () => {
    const { container } = render(<StarRating value={3.6} />);
    expect(screen.getByRole("img", { name: "Nota 3,6 de 5" })).toBeInTheDocument();
    const filled = container.querySelectorAll('svg[fill="currentColor"]');
    expect(filled).toHaveLength(4);
  });

  it("sends the chosen stars and the comment", async () => {
    submitReview.mockResolvedValueOnce({});
    render(
      <ReviewSection
        kind="negotiation"
        transactionId="n1"
        counterpartyName="Clara Boutique"
        mine={null}
        received={null}
      />,
    );
    expect(screen.getByText("Como foi negociar com Clara Boutique?")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("4 — Boa"));
    expect(screen.getByText("Boa")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Comentário (opcional)"), "Tudo certo");
    await userEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));

    const fd = submitReview.mock.calls.at(-1)![1] as FormData;
    expect(Object.fromEntries(fd)).toEqual({
      kind: "negotiation",
      transactionId: "n1",
      rating: "4",
      comment: "Tudo certo",
    });
  });

  it("shows the action's error", async () => {
    submitReview.mockResolvedValueOnce({ error: "Você já avaliou esta transação" });
    render(
      <ReviewSection
        kind="supply_order"
        transactionId="o1"
        counterpartyName="Fábrica Modah"
        mine={null}
        received={null}
      />,
    );
    await userEvent.click(screen.getByLabelText("5 — Excelente"));
    await userEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Você já avaliou esta transação");
  });

  it("after rating, shows both reviews instead of the form", () => {
    render(
      <ReviewSection
        kind="negotiation"
        transactionId="n1"
        counterpartyName="Clara Boutique"
        mine={REVIEW}
        received={{ ...REVIEW, rating: 5, comment: null }}
      />,
    );
    expect(screen.queryByRole("button", { name: "Enviar avaliação" })).toBeNull();
    expect(screen.getByText("Sua avaliação de Clara Boutique")).toBeInTheDocument();
    expect(screen.getByText("Entrega rápida")).toBeInTheDocument();
    expect(screen.getByText("Clara Boutique avaliou você")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Nota 5 de 5" })).toBeInTheDocument();
  });

  it("transactionPath points back to the transaction page", () => {
    expect(transactionPath("negotiation", "n1")).toBe("/negociacoes/n1");
    expect(transactionPath("supply_order", "o1")).toBe("/pedidos/o1");
  });
});
