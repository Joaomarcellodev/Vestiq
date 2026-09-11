import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createProduct = vi.fn().mockResolvedValue({});
const updateProduct = vi.fn().mockResolvedValue({});

vi.mock("../actions", () => ({
  createProduct: (p: unknown, fd: FormData) => createProduct(p, fd),
  updateProduct: (p: unknown, fd: FormData) => updateProduct(p, fd),
}));

const { ProductForm } = await import("./product-form");
const { EditProductForm } = await import("./edit-product-form");
const { WholesaleFields } = await import("./wholesale-fields");
const { WholesaleSummary } = await import("./wholesale-summary");

describe("WholesaleFields", () => {
  it("fills the grid from a preset and previews each size", async () => {
    const onSizeGridChange = vi.fn();
    render(<WholesaleFields onSizeGridChange={onSizeGridChange} />);
    await userEvent.click(screen.getByRole("button", { name: "P ao GG" }));
    expect(screen.getByLabelText("Grade de tamanhos")).toHaveValue("P, M, G, GG");
    const chips = screen.getByRole("list", { name: /tamanhos da grade/i });
    expect(within(chips).getAllByRole("listitem")).toHaveLength(4);
    expect(onSizeGridChange).toHaveBeenLastCalledWith(["P", "M", "G", "GG"]);
  });

  it("prefills the current conditions", () => {
    render(<WholesaleFields defaultMinOrderQuantity={12} defaultSizeGrid={["36", "38"]} />);
    expect(screen.getByLabelText("Pedido mínimo (peças)")).toHaveValue(12);
    expect(screen.getByLabelText("Grade de tamanhos")).toHaveValue("36, 38");
  });
});

describe("ProductForm — wholesale conditions", () => {
  it("does not show the wholesale section to a reseller", () => {
    render(<ProductForm categories={[]} />);
    expect(screen.queryByLabelText("Pedido mínimo (peças)")).toBeNull();
    expect(screen.queryByRole("button", { name: /gerar variantes pela grade/i })).toBeNull();
  });

  it("lets the factory generate one variant per grid size and posts the conditions", async () => {
    render(<ProductForm categories={[]} isFactory />);
    await userEvent.type(screen.getByLabelText(/nome do produto/i), "Vestido Midi");
    const min = screen.getByLabelText("Pedido mínimo (peças)");
    await userEvent.clear(min);
    await userEvent.type(min, "12");
    await userEvent.type(screen.getByLabelText("Grade de tamanhos"), "P, M, G");
    await userEvent.click(screen.getByRole("button", { name: /gerar variantes pela grade/i }));

    const sizes = screen.getAllByLabelText("Tamanho").map((el) => (el as HTMLInputElement).value);
    expect(sizes).toEqual(["P", "M", "G"]);

    await userEvent.click(screen.getByRole("button", { name: /salvar produto/i }));
    const fd = createProduct.mock.calls.at(-1)?.[1] as FormData;
    expect(fd.get("minOrderQuantity")).toBe("12");
    expect(fd.get("sizeGrid")).toBe("P, M, G");
    const variants = JSON.parse(fd.get("variants") as string) as { size: string }[];
    expect(variants.map((v) => v.size)).toEqual(["P", "M", "G"]);
  });
});

describe("EditProductForm — wholesale conditions", () => {
  const product = {
    id: "p1",
    name: "Blusa",
    brand: null,
    category_id: null,
    internal_sku: null,
    description: null,
    image_urls: [],
    min_order_quantity: 24,
    size_grid: ["PP", "P"],
  };

  it("prefills and posts the factory conditions", async () => {
    render(<EditProductForm product={product} categories={[]} isFactory />);
    expect(screen.getByLabelText("Pedido mínimo (peças)")).toHaveValue(24);
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));
    const fd = updateProduct.mock.calls.at(-1)?.[1] as FormData;
    expect(fd.get("minOrderQuantity")).toBe("24");
    expect(fd.get("sizeGrid")).toBe("PP, P");
  });

  it("hides the conditions from a reseller", () => {
    render(<EditProductForm product={product} categories={[]} />);
    expect(screen.queryByLabelText("Grade de tamanhos")).toBeNull();
  });
});

describe("WholesaleSummary", () => {
  it("shows the minimum order and each grid size", () => {
    render(<WholesaleSummary minOrderQuantity={6} sizeGrid={["36", "38", "40"]} />);
    expect(screen.getByText("Pedido mínimo: 6 peças")).toBeInTheDocument();
    const grid = screen.getByRole("list", { name: /grade de tamanhos/i });
    expect(within(grid).getAllByRole("listitem")).toHaveLength(3);
  });

  it("says when no grid is defined", () => {
    render(<WholesaleSummary minOrderQuantity={1} sizeGrid={[]} />);
    expect(screen.getByText("Sem pedido mínimo")).toBeInTheDocument();
    expect(screen.getByText(/grade de tamanhos não definida/i)).toBeInTheDocument();
  });
});
