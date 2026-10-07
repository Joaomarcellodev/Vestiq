import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MovementList } from "./movement-list";
import type { MovementRow } from "../queries";

const SALE_ID = "6f1c2a8e-1b2c-4d5e-8f90-123456789abc";

const ITEMS: MovementRow[] = [
  {
    id: "m3",
    type: "AJUSTE",
    quantity: -1,
    balanceAfter: 16,
    note: "peça manchada",
    referenceType: "manual",
    referenceId: null,
    createdAt: "2026-10-03T17:30:00Z",
  },
  {
    id: "m2",
    type: "VENDA",
    quantity: -3,
    balanceAfter: 17,
    note: null,
    referenceType: "sale",
    referenceId: SALE_ID,
    createdAt: "2026-10-03T15:00:00Z",
  },
  {
    id: "m1",
    type: "ENTRADA",
    quantity: 20,
    balanceAfter: 20,
    note: "compra jan",
    referenceType: "manual",
    referenceId: null,
    createdAt: "2026-10-02T12:00:00Z",
  },
];

describe("MovementList (AC-INV-004-01)", () => {
  it("shows each movement with its label, signed quantity and resulting balance", () => {
    render(<MovementList items={ITEMS} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);

    expect(within(rows[0]!).getByText("Ajuste")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("-1")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("saldo 16")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("peça manchada")).toBeInTheDocument();

    expect(within(rows[1]!).getByText("Venda")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("saldo 17")).toBeInTheDocument();

    expect(within(rows[2]!).getByText("Entrada")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("+20")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("saldo 20")).toBeInTheDocument();
  });

  it("links a sale movement to the sale", () => {
    render(<MovementList items={ITEMS} />);
    expect(screen.getByRole("link", { name: "Ver venda" })).toHaveAttribute(
      "href",
      `/vendas/${SALE_ID}`,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shows the date and time in Brasília time", () => {
    render(<MovementList items={ITEMS} />);
    const time = screen.getAllByRole("listitem")[0]!.querySelector("time");
    expect(time).toHaveAttribute("datetime", "2026-10-03T17:30:00Z");
    expect(time?.textContent).toMatch(/03\/10\/2026.*14:30/);
  });
});
