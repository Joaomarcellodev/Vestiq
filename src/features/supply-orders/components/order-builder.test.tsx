import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OrderCatalogProduct } from "../order-math";

const placeSupplyOrder = vi.fn().mockResolvedValue({ error: "Fornecedor indisponível" });

vi.mock("../actions", () => ({
  placeSupplyOrder: (p: unknown, fd: FormData) => placeSupplyOrder(p, fd),
}));

const { OrderBuilder } = await import("./order-builder");

const catalog: OrderCatalogProduct[] = [
  {
    id: "dress",
    name: "Vestido Midi",
    brand: "Modah",
    imageUrl: null,
    minOrderQuantity: 12,
    colors: ["Preto", "Terracota"],
    sizes: ["P", "M"],
    variants: [
      { id: "d-pt-p", color: "Preto", size: "P", sku: null, price: 79.9, inStock: true },
      { id: "d-pt-m", color: "Preto", size: "M", sku: null, price: 79.9, inStock: true },
      { id: "d-te-m", color: "Terracota", size: "M", sku: null, price: 79.9, inStock: false },
    ],
  },
  {
    id: "shirt",
    name: "Camisa de Línho",
    brand: null,
    imageUrl: null,
    minOrderQuantity: 1,
    colors: ["Branco"],
    sizes: ["G"],
    variants: [{ id: "s-br-g", color: "Branco", size: "G", sku: null, price: 99.9, inStock: true }],
  },
];

const submit = () => screen.getByRole("button", { name: "Enviar pedido" });
const text = (el: HTMLElement) => el.textContent?.replace(/\s/g, " ") ?? "";

describe("OrderBuilder", () => {
  it("renders a colour × size grid and marks combinations the supplier doesn't offer", () => {
    render(<OrderBuilder supplierId="s1" catalog={catalog} />);
    const table = screen.getByRole("table", { name: /Vestido Midi por cor e tamanho/ });
    expect(within(table).getAllByRole("spinbutton")).toHaveLength(3);
    expect(within(table).getByText("—")).toBeInTheDocument(); // Terracota / P
    expect(screen.getByLabelText("Vestido Midi Terracota M")).toHaveAttribute(
      "title",
      expect.stringContaining("sob encomenda"),
    );
  });

  it("keeps the order blocked until every product reaches its minimum", async () => {
    const user = userEvent.setup();
    render(<OrderBuilder supplierId="s1" catalog={catalog} />);
    expect(submit()).toBeDisabled();

    await user.type(screen.getByLabelText("Vestido Midi Preto P"), "6");
    await user.type(screen.getByLabelText("Vestido Midi Preto M"), "4");
    expect(screen.getByText("Faltam 2 peças para o mínimo")).toBeInTheDocument();
    expect(submit()).toBeDisabled();

    await user.type(screen.getByLabelText("Vestido Midi Terracota M"), "2");
    expect(screen.getByText("Mínimo atingido")).toBeInTheDocument();
    expect(submit()).toBeEnabled();
    expect(text(screen.getByText(/12 peças · 1 produto/).parentElement!)).toContain("R$ 958,80");
  });

  it("posts only the variants with a quantity and shows the server error", async () => {
    const user = userEvent.setup();
    render(<OrderBuilder supplierId="s1" catalog={catalog} />);
    await user.type(screen.getByLabelText("Camisa de Línho Branco G"), "3");
    await user.type(screen.getByLabelText("Observação para o fornecedor (opcional)"), "Urgente");
    await user.click(submit());

    const fd = placeSupplyOrder.mock.calls[0]![1] as FormData;
    expect(fd.get("supplierId")).toBe("s1");
    expect(JSON.parse(String(fd.get("items")))).toEqual([{ variantId: "s-br-g", quantity: 3 }]);
    expect(fd.get("note")).toBe("Urgente");
    expect(await screen.findByRole("alert")).toHaveTextContent("Fornecedor indisponível");
  });

  it("filters products ignoring accents and puts the focused product first", async () => {
    const user = userEvent.setup();
    render(<OrderBuilder supplierId="s1" catalog={catalog} focusProductId="shirt" />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Camisa de Línho", "Vestido Midi"]);

    await user.type(screen.getByPlaceholderText("Filtrar produtos..."), "linho");
    expect(screen.queryByText("Vestido Midi")).not.toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText("Filtrar produtos..."));
    await user.type(screen.getByPlaceholderText("Filtrar produtos..."), "xyz");
    expect(screen.getByText("Nenhum produto encontrado.")).toBeInTheDocument();
  });

  it("explains when the supplier has nothing to order", () => {
    render(<OrderBuilder supplierId="s1" catalog={[]} />);
    expect(screen.getByText(/não tem produtos disponíveis para pedido/)).toBeInTheDocument();
  });
});

describe("OrderBuilder before hydration", () => {
  it("adopts quantities typed into the server-rendered inputs", async () => {
    const { renderToString } = await import("react-dom/server");
    const { hydrateRoot } = await import("react-dom/client");
    const { act } = await import("react");

    const container = document.createElement("div");
    container.innerHTML = renderToString(<OrderBuilder supplierId="s1" catalog={catalog} />);
    document.body.appendChild(container);
    // the user types while the JS is still loading
    container.querySelector<HTMLInputElement>('input[data-variant-id="s-br-g"]')!.value = "2";

    await act(async () => {
      hydrateRoot(container, <OrderBuilder supplierId="s1" catalog={catalog} />);
    });

    expect(within(container).getByText(/2 peças · 1 produto/)).toBeInTheDocument();
    expect(within(container).getByRole("button", { name: "Enviar pedido" })).toBeEnabled();
    container.remove();
  });
});
