import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const dashboardActions = { fetchTopProducts: vi.fn() };

vi.mock("@/features/dashboard/actions", () => ({
  fetchTopProducts: (days: number) => dashboardActions.fetchTopProducts(days),
}));

const { SalesTrendChart, TopProductsChart } = await import("./dashboard-charts");

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

  it("TopProductsChart shows an empty state when there are no sales", () => {
    render(<TopProductsChart data={[]} />);
    expect(screen.getByText(/nenhuma venda confirmada nesse período/i)).toBeInTheDocument();
  });

  it("TopProductsChart renders the chart container when there is data", () => {
    const { container } = render(<TopProductsChart data={[{ name: "Camisa", units: 4 }]} />);
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });

  it("TopProductsChart refetches only when a different period is picked", async () => {
    dashboardActions.fetchTopProducts.mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<TopProductsChart data={[{ name: "Camisa", units: 4 }]} />);

    await user.click(screen.getByRole("button", { name: "30 dias" }));
    expect(dashboardActions.fetchTopProducts).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "7 dias" }));
    expect(dashboardActions.fetchTopProducts).toHaveBeenCalledWith(7);
    expect(screen.getByRole("button", { name: "7 dias" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText(/nenhuma venda confirmada nesse período/i)).toBeInTheDocument();
  });
});
