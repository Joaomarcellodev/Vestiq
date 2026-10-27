import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SaleCancellation } from "./sale-cancellation";

const value = (label: string) => screen.getByText(label).nextElementSibling;

describe("SaleCancellation", () => {
  it("shows the reason, the date and time in Brasília and who cancelled (VES-83)", () => {
    render(
      <SaleCancellation
        reason="Cliente desistiu"
        cancelledAt="2026-10-26T17:30:00Z"
        cancelledBy="Sarah Lima"
      />,
    );
    expect(screen.getByRole("region", { name: "Cancelamento" })).toBeInTheDocument();
    expect(value("Motivo")).toHaveTextContent("Cliente desistiu");
    expect(value("Cancelada em")).toHaveTextContent("26/10/2026, 14:30");
    expect(value("Cancelada por")).toHaveTextContent("Sarah Lima");
  });

  it("fills the gaps of a sale cancelled without those details", () => {
    render(<SaleCancellation reason="  " cancelledAt={null} cancelledBy={null} />);
    expect(value("Motivo")).toHaveTextContent("Não informado");
    expect(value("Cancelada em")).toHaveTextContent("—");
    expect(value("Cancelada por")).toHaveTextContent("—");
  });
});
