import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { setPathname } from "@/test/next";
import { hasIcon } from "@/components/atoms/icon";
import { BOTTOM_NAV, PLATFORM_BOTTOM_NAV, PRIMARY_NAV, isActive } from "./nav-items";
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

describe("nav items", () => {
  it("only use icons the icon set can draw", () => {
    const missing = [...PRIMARY_NAV, ...BOTTOM_NAV, ...PLATFORM_BOTTOM_NAV].filter(
      (i) => !hasIcon(i.icon),
    );
    expect(missing.map((i) => i.icon)).toEqual([]);
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
    expect(screen.getByRole("link", { name: /^Fornecedores$/ })).toHaveAttribute(
      "href",
      "/fornecedores",
    );
    expect(screen.getByRole("link", { name: /^Dashboard$/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows factory items for a factory admin", () => {
    setPathname("/pedidos/123");
    render(<SidebarNav role="FACTORY_ADMIN" orgName="Fábrica" userName="Ana" />);
    expect(screen.getByRole("link", { name: /rede da fábrica/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Fornecedores$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Pedidos$/ })).toHaveAttribute("aria-current", "page");
  });
});

describe("platform admin navigation (VES-44)", () => {
  it("shows only the moderation panel, on desktop and mobile", () => {
    setPathname("/moderacao");
    render(<SidebarNav role="PLATFORM_ADMIN" orgName="Vestiq Plataforma" userName="Moderação" />);
    const sidebar = screen.getByRole("complementary");
    expect(sidebar.querySelectorAll("nav a")).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /Moderação/ })[0]).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("gives the platform admin a two-item mobile bar", () => {
    setPathname("/perfil");
    const { container } = render(<BottomNav role="PLATFORM_ADMIN" />);
    expect(container.querySelectorAll("a")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Perfil/ })).toHaveAttribute("aria-current", "page");
  });
});
