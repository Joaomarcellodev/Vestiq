import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SupplierProductCard } from "./supplier-product-card";
import { SupplierCard } from "./supplier-card";

const product = {
  id: "p1",
  supplierId: "s1",
  supplierName: "Fábrica Modah",
  name: "Vestido Midi",
  brand: "Modah",
  categoryName: "Vestidos",
  imageUrl: null,
  minOrderQuantity: 12,
  sizeGrid: ["P", "M", "G"],
  minPrice: 79.9,
  maxPrice: 89.9,
  variantCount: 2,
  inStock: true,
};

describe("SupplierProductCard", () => {
  it("links to the supplier product and shows price range and wholesale conditions", () => {
    render(<SupplierProductCard product={product} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/fornecedores/produtos/p1");
    expect(link).toHaveTextContent("Fábrica Modah · Modah · Vestidos");
    expect(link.textContent?.replace(/\s/g, " ")).toContain("R$ 79,90 – R$ 89,90");
    expect(screen.getByText("Em estoque")).toBeInTheDocument();
    expect(screen.getByText("Pedido mínimo: 12 peças")).toBeInTheDocument();
    expect(screen.getByText("P · M · G")).toBeInTheDocument();
  });

  it("hides the supplier on the supplier's own page and handles missing data", () => {
    render(
      <SupplierProductCard
        product={{
          ...product,
          brand: null,
          categoryName: null,
          minPrice: null,
          maxPrice: null,
          minOrderQuantity: 1,
          sizeGrid: [],
          inStock: false,
        }}
        showSupplier={false}
      />,
    );
    expect(screen.queryByText(/Fábrica Modah/)).not.toBeInTheDocument();
    expect(screen.getByText("Preço sob consulta")).toBeInTheDocument();
    expect(screen.getByText("Sem estoque")).toBeInTheDocument();
    expect(screen.getByText("Sem pedido mínimo")).toBeInTheDocument();
  });
});

describe("SupplierCard", () => {
  it("links to the supplier with product count and networks", () => {
    render(
      <SupplierCard
        supplier={{
          id: "s1",
          name: "Fábrica Modah",
          networkNames: ["Rede Modah"],
          productCount: 1,
        }}
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/fornecedores/s1");
    expect(link).toHaveTextContent("1 produto · Rede Modah");
  });
});
