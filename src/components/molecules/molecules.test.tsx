import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { routerSpy } from "@/test/next";
import { FilterTabs } from "./filter-tabs";
import { PageHeader } from "./page-header";
import { EmptyState } from "./empty-state";
import { StockBadge } from "./stock-badge";
import { BackButton } from "./back-button";
import { StatCard } from "./stat-card";

describe("FilterTabs", () => {
  it("marks the current tab and builds hrefs preserving extra params", () => {
    render(
      <FilterTabs
        basePath="/produtos"
        param="scope"
        current="archived"
        extra={{ q: "azul" }}
        tabs={[
          { value: "", label: "Ativos" },
          { value: "archived", label: "Arquivados" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Ativos" })).toHaveAttribute(
      "href",
      "/produtos?q=azul",
    );
    expect(screen.getByRole("link", { name: "Arquivados" })).toHaveAttribute(
      "href",
      "/produtos?q=azul&scope=archived",
    );
  });
});

describe("PageHeader", () => {
  it("renders title, optional description and action", () => {
    render(<PageHeader title="Vendas" description="Resumo" action={<button>Nova</button>} />);
    expect(screen.getByRole("heading", { name: "Vendas" })).toBeInTheDocument();
    expect(screen.getByText("Resumo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nova" })).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders the icon, title, description and action", () => {
    render(
      <EmptyState
        icon="inventory_2"
        title="Nada aqui"
        description="Cadastre algo"
        action={<a>ok</a>}
      />,
    );
    expect(screen.getByText("Nada aqui")).toBeInTheDocument();
    expect(screen.getByText("Cadastre algo")).toBeInTheDocument();
  });
});

describe("StockBadge", () => {
  it("maps each level to a label", () => {
    const { rerender } = render(<StockBadge level="ok" stock={5} />);
    expect(screen.getByText("5 em estoque")).toBeInTheDocument();
    rerender(<StockBadge level="low" stock={2} />);
    expect(screen.getByText("2 — estoque baixo")).toBeInTheDocument();
    rerender(<StockBadge level="out" stock={0} />);
    expect(screen.getByText("Sem estoque")).toBeInTheDocument();
  });
});

describe("BackButton", () => {
  it("goes back when there is history, else to the fallback", async () => {
    const spy = vi.spyOn(window.history, "length", "get");
    spy.mockReturnValue(3);
    const { rerender } = render(<BackButton fallback="/x" label="Voltar" />);
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(routerSpy.back).toHaveBeenCalled();

    spy.mockReturnValue(1);
    rerender(<BackButton fallback="/x" label="Voltar" />);
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(routerSpy.push).toHaveBeenCalledWith("/x");
    spy.mockRestore();
  });
});

describe("StatCard", () => {
  it("renders a static string value", () => {
    render(<StatCard label="Taxa" value="100%" hint="ok" accent="alta" />);
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
    expect(screen.getByText("alta")).toBeInTheDocument();
  });

  it("renders a numeric value through CountUp (final value)", async () => {
    render(<StatCard label="Vendas" value={1234} format="int" />);
    expect(await screen.findByText("1234", {}, { timeout: 2000 })).toBeInTheDocument();
  });
});
