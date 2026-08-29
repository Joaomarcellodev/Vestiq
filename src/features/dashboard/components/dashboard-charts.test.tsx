import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SalesTrendChart, TopProductsChart } from "./dashboard-charts";

describe("dashboard charts", () => {
  it("SalesTrendChart shows an empty state when every day is zero", () => {
    render(
      <SalesTrendChart
        data={[
          { label: "01/08", total: 0 },
          { label: "02/08", total: 0 },
        ]}
      />,
    );
    expect(screen.getByText(/sem vendas registradas no período/i)).toBeInTheDocument();
  });

  it("SalesTrendChart renders the chart container when there is data", () => {
    const { container } = render(
      <SalesTrendChart
        data={[
          { label: "01/08", total: 100 },
          { label: "02/08", total: 0 },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: /últimos 14 dias/i })).toBeInTheDocument();
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });

  it("TopProductsChart shows an empty state and a populated state", () => {
    const { rerender, container } = render(<TopProductsChart data={[]} />);
    expect(screen.getByText(/nenhuma venda confirmada ainda/i)).toBeInTheDocument();
    rerender(<TopProductsChart data={[{ name: "Camisa", units: 4 }]} />);
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });
});
