import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SupplyOrderPayment } from "../queries";

const payOrderWithCard = vi.fn().mockResolvedValue({});
const refundSupplyOrderPayment = vi.fn().mockResolvedValue({});
vi.mock("../actions", () => ({
  payOrderWithCard: (p: unknown, fd: FormData) => payOrderWithCard(p, fd),
  refundSupplyOrderPayment: (p: unknown, fd: FormData) => refundSupplyOrderPayment(p, fd),
}));

const { OrderPayment } = await import("./order-payment");

const paid: SupplyOrderPayment = {
  status: "PAID",
  amount: 239.7,
  paidAt: "2026-10-23T14:13:00Z",
  refundedAmount: 0,
  refundedAt: null,
  refundReason: null,
  platformFeePercent: 12.5,
  platformFeeAmount: 29.96,
  netAmount: 209.74,
};

const base = { orderId: "o1", total: 239.7, canRefund: false };
const text = (s: string) => screen.getByText((_, el) => el?.textContent === s);

describe("OrderPayment (SPEC-014 / SPEC-015)", () => {
  it("lets the reseller pay a confirmed order by card", async () => {
    render(<OrderPayment {...base} party="reseller" payment={null} />);
    expect(screen.getByText("Aguardando pagamento")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /^Pagar R\$\s239,70 com cartão$/ }));
    expect((payOrderWithCard.mock.calls[0]![1] as FormData).get("orderId")).toBe("o1");
  });

  it("tells the reseller how the last attempt ended", () => {
    const { rerender } = render(
      <OrderPayment {...base} party="reseller" payment={{ ...paid, status: "EXPIRED" }} />,
    );
    expect(screen.getByText("O último checkout expirou sem pagamento.")).toBeVisible();
    rerender(<OrderPayment {...base} party="reseller" payment={{ ...paid, status: "PENDING" }} />);
    expect(screen.getByText(/Há um checkout aberto/)).toBeVisible();
  });

  it("asks the supplier to set up its payout account before it can be paid (VES-27)", () => {
    const { rerender } = render(
      <OrderPayment {...base} party="supplier" payment={null} supplierReady={false} />,
    );
    expect(screen.getByRole("link", { name: "Ir para Recebimentos" })).toHaveAttribute(
      "href",
      "/recebimentos",
    );
    rerender(<OrderPayment {...base} party="supplier" payment={null} />);
    expect(screen.getByText(/Aguardando o pagamento da revendedora/)).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the supplier the commission and what it receives", () => {
    render(<OrderPayment {...base} party="supplier" payment={paid} />);
    expect(screen.getByText("Pago")).toBeVisible();
    expect(text("Comissão do Vestiq (12,5%)")).toBeVisible();
    expect(screen.getByText("R$ 29,96")).toBeVisible();
    expect(screen.getByText("R$ 209,74")).toBeVisible();
  });

  it("hides the commission from the reseller", () => {
    render(<OrderPayment {...base} party="reseller" payment={paid} />);
    expect(screen.queryByText(/Comissão do Vestiq/)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("lets a supplier admin refund, only after confirming", async () => {
    render(<OrderPayment {...base} party="supplier" payment={paid} canRefund />);
    await userEvent.type(screen.getByLabelText("Motivo (opcional)"), "Sem tecido");
    await userEvent.click(screen.getByLabelText(/Confirmo o reembolso de R\$ 239,70/));
    await userEvent.click(screen.getByRole("button", { name: /^Reembolsar R\$\s239,70$/ }));

    const fd = refundSupplyOrderPayment.mock.calls[0]![1] as FormData;
    expect(fd.get("orderId")).toBe("o1");
    expect(fd.get("reason")).toBe("Sem tecido");
    expect(fd.get("confirm")).toBe("on");
  });

  it("offers to refund only what is left after a partial refund", () => {
    render(
      <OrderPayment
        {...base}
        party="supplier"
        payment={{ ...paid, refundedAmount: 100, refundedAt: "2026-10-23T15:00:00Z" }}
        canRefund
      />,
    );
    expect(screen.getByText(/R\$ 100,00 reembolsados em/)).toBeVisible();
    expect(screen.getByRole("button", { name: /^Reembolsar R\$\s139,70$/ })).toBeVisible();
  });

  it("shows a full refund and tells the reseller to place a new order", () => {
    render(
      <OrderPayment
        {...base}
        party="reseller"
        payment={{
          ...paid,
          status: "REFUNDED",
          refundedAmount: 239.7,
          refundedAt: "2026-10-23T15:00:00Z",
          refundReason: "Sem tecido",
        }}
        canRefund
      />,
    );
    expect(screen.getByText("Reembolsado")).toBeVisible();
    expect(screen.getByText(/Valor total reembolsado em .* no seu cartão\./)).toBeVisible();
    expect(screen.getByText("Sem tecido")).toBeVisible();
    expect(screen.getByText(/faça um novo pedido/)).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
