import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SaleTotals } from "./sale-totals";

const row = (label: string) => screen.getByText(label).parentElement!;

describe("SaleTotals", () => {
  it("shows the subtotal, the discount and the total of a discounted sale (VES-82)", () => {
    render(<SaleTotals subtotal={2400} discount={100} total={2300} paymentLabel="Cartão" />);
    expect(row("Subtotal")).toHaveTextContent("R$ 2.400,00");
    expect(row("Desconto")).toHaveTextContent("− R$ 100,00");
    expect(row("Total · Cartão")).toHaveTextContent("R$ 2.300,00");
  });

  it("shows a zero discount when the sale had none", () => {
    render(<SaleTotals subtotal={80} discount={0} total={80} paymentLabel="Pix" />);
    expect(row("Desconto")).toHaveTextContent("R$ 0,00");
    expect(row("Desconto")).not.toHaveTextContent("−");
  });
});
