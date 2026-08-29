import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { setPathname } from "@/test/next";
import { isActive } from "./nav-items";
import { BottomNav } from "./bottom-nav";
import { SidebarNav } from "./sidebar-nav";

describe("isActive", () => {
  it("matches exact and nested paths only", () => {
    expect(isActive("/produtos", "/produtos")).toBe(true);
    expect(isActive("/produtos/123", "/produtos")).toBe(true);
    expect(isActive("/produtos-arquivados", "/produtos")).toBe(false);
    expect(isActive("/vendas", "/produtos")).toBe(false);
  });
});

describe("BottomNav", () => {
  it("renders the 5 mobile items and marks the active one", () => {
    setPathname("/vendas/nova");
    render(<BottomNav />);
    for (const label of ["Início", "Produtos", "Vendas", "Rede", "Mais"]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /Vendas/ })).toHaveAttribute("aria-current", "page");
  });
});

describe("SidebarNav", () => {
  it("hides factory-only items from a reseller", () => {
    setPathname("/dashboard");
    render(<SidebarNav role="RESELLER" orgName="Loja" userName="Ana" />);
    expect(screen.queryByRole("link", { name: /rede da fábrica/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Dashboard$/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows factory items for a factory admin", () => {
    setPathname("/rede-fabrica");
    render(<SidebarNav role="FACTORY_ADMIN" orgName="Fábrica" userName="Ana" />);
    expect(screen.getByRole("link", { name: /rede da fábrica/i })).toBeInTheDocument();
  });
});
