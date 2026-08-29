import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CatalogProduct } from "../queries";

const confirmSale = vi.fn().mockResolvedValue({});
vi.mock("../actions", () => ({ confirmSale: (p: unknown, fd: FormData) => confirmSale(p, fd) }));

const { NewSaleForm } = await import("./new-sale-form");

const variants = [
  { id: "v1", label: "Camisa Azul · P", price: 100, stock: 5 },
  { id: "v2", label: "Camisa Azul · M", price: 100, stock: 3 },
];
const catalog: CatalogProduct[] = [
  {
    id: "p1",
    name: "Camisa Azul",
    brand: "Zara",
    imageUrl: null,
    minPrice: 100,
    variants: [
      { id: "v1", label: "P", price: 100, stock: 5 },
      { id: "v2", label: "M", price: 100, stock: 3 },
    ],
  },
  {
    id: "p2",
    name: "Bermuda",
    brand: null,
    imageUrl: null,
    minPrice: 80,
    variants: [{ id: "v3", label: "Único", price: 80, stock: 2 }],
  },
];
const customers = [{ id: "c1", name: "Ana" }];

describe("NewSaleForm", () => {
  it("adds a single-variant product straight to the cart from its card", async () => {
    render(<NewSaleForm variants={variants} catalog={catalog} customers={customers} />);
    expect(screen.getByText(/nenhum item adicionado/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /adicionar bermuda/i }));
    expect(screen.queryByText(/nenhum item adicionado/i)).toBeNull();
    // subtotal + total both show R$ 80,00
    expect(screen.getAllByText("R$ 80,00").length).toBeGreaterThanOrEqual(2);
  });

  it("opens a variant picker for a multi-variant product", async () => {
    render(<NewSaleForm variants={variants} catalog={catalog} customers={customers} />);
    await userEvent.click(screen.getByRole("button", { name: /camisa azul — escolher variante/i }));
    await userEvent.click(screen.getByRole("button", { name: /^P R\$/ }));
    expect(screen.getByText("Camisa Azul · P")).toBeInTheDocument();
  });

  it("adds via the text search dropdown and clamps quantity to stock", async () => {
    render(<NewSaleForm variants={variants} catalog={catalog} customers={customers} />);
    await userEvent.type(screen.getByPlaceholderText(/buscar produto/i), "Camisa Azul · M");
    await userEvent.click(screen.getByRole("button", { name: /Camisa Azul · M/ }));
    const line = screen.getByText("Camisa Azul · M").closest("li")!;
    const qty = within(line).getByRole("spinbutton");
    await userEvent.clear(qty);
    await userEvent.type(qty, "99");
    expect(qty).toHaveValue(3); // stock cap
  });

  it("disables submit for an over-the-subtotal discount and enables it otherwise", async () => {
    render(<NewSaleForm variants={variants} catalog={catalog} customers={customers} />);
    const submit = screen.getByRole("button", { name: /confirmar venda/i });
    expect(submit).toBeDisabled(); // empty cart

    await userEvent.click(screen.getByRole("button", { name: /adicionar bermuda/i }));
    expect(submit).toBeEnabled();

    const discountInput = screen.getByDisplayValue("0");
    await userEvent.clear(discountInput);
    await userEvent.type(discountInput, "9999");
    expect(await screen.findByText(/desconto maior que o subtotal/i)).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  it("serialises the cart, payment method and customer into the submitted FormData", async () => {
    render(<NewSaleForm variants={variants} catalog={catalog} customers={customers} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "c1");
    await userEvent.click(screen.getByRole("button", { name: /adicionar bermuda/i }));
    await userEvent.click(screen.getByRole("button", { name: "Cartão" }));
    await userEvent.click(screen.getByRole("button", { name: /confirmar venda/i }));

    const fd = confirmSale.mock.calls.at(-1)?.[1] as FormData;
    expect(fd.get("customerId")).toBe("c1");
    expect(fd.get("paymentMethod")).toBe("CARTAO");
    expect(JSON.parse(fd.get("items") as string)).toEqual([
      { variantId: "v3", quantity: 1, unitPrice: 80 },
    ]);
  });
});
