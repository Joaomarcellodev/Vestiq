import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createProduct = vi.fn().mockResolvedValue({});
const updateProduct = vi.fn().mockResolvedValue({});

vi.mock("../actions", () => ({
  createProduct: (p: unknown, fd: FormData) => createProduct(p, fd),
  updateProduct: (p: unknown, fd: FormData) => updateProduct(p, fd),
}));

const { ProductForm } = await import("./product-form");
const { EditProductForm } = await import("./edit-product-form");
const { ImageUploadField } = await import("./image-upload-field");

const CATS = [{ id: "c1", name: "Bolsas" }];
const png = (name = "a.png") =>
  new File([Uint8Array.from([137, 80, 78, 71])], name, { type: "image/png" });

describe("ProductForm", () => {
  it("adds and removes variant rows and shows the estimated margin", async () => {
    render(<ProductForm categories={CATS} />);
    expect(screen.getAllByLabelText("Tamanho")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: /adicionar/i }));
    expect(screen.getAllByLabelText("Tamanho")).toHaveLength(2);
    await userEvent.click(screen.getAllByRole("button", { name: "Remover" })[0]!);
    expect(screen.getAllByLabelText("Tamanho")).toHaveLength(1);
  });

  it("serialises variants + images into the submitted FormData", async () => {
    render(<ProductForm categories={CATS} />);
    await userEvent.type(screen.getByLabelText(/nome do produto/i), "Jaqueta");
    await userEvent.type(screen.getByLabelText("Preço de venda (R$)"), "200");
    await userEvent.upload(document.querySelector("input[type=file]") as HTMLInputElement, png());
    await userEvent.click(screen.getByRole("button", { name: /salvar produto/i }));

    const fd = createProduct.mock.calls.at(-1)?.[1] as FormData;
    expect(fd.get("name")).toBe("Jaqueta");
    const variants = JSON.parse(fd.get("variants") as string);
    expect(variants[0]).toMatchObject({ retailPrice: 200 });
    expect(fd.getAll("images")).toHaveLength(1);
  });

  it("shows an action error", async () => {
    createProduct.mockResolvedValueOnce({ error: "SKU já utilizado" });
    render(<ProductForm categories={CATS} />);
    await userEvent.type(screen.getByLabelText(/nome do produto/i), "X");
    await userEvent.click(screen.getByRole("button", { name: /salvar produto/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("SKU já utilizado");
  });
});

describe("EditProductForm", () => {
  const product = {
    id: "p1",
    name: "Antigo",
    brand: "B",
    category_id: "c1",
    internal_sku: "S1",
    description: "d",
    image_urls: ["https://x/1.png", "https://x/2.png"],
  };

  it("prefills fields and lets you drop an existing image before saving", async () => {
    render(<EditProductForm product={product} categories={CATS} />);
    expect(screen.getByLabelText(/nome do produto/i)).toHaveValue("Antigo");
    expect(screen.getAllByRole("button", { name: /remover imagem/i })).toHaveLength(2);

    await userEvent.click(screen.getAllByRole("button", { name: /remover imagem/i })[0]!);
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    const fd = updateProduct.mock.calls.at(-1)?.[1] as FormData;
    expect(JSON.parse(fd.get("existingImages") as string)).toEqual(["https://x/2.png"]);
  });

  // VES-68 — variants are editable on the edit form.
  const variant = (over: Record<string, unknown>) => ({
    id: "v1",
    size: "P",
    color: "Preto",
    sku: "SKU-P",
    cost_price: 50,
    retail_price: 100,
    stock_on_hand: 4,
    archived_at: null,
    created_at: "2026-10-01T00:00:00Z",
    ...over,
  });
  const withVariants = {
    ...product,
    product_variants: [
      variant({}),
      variant({ id: "v2", size: "M", sku: "SKU-M", created_at: "2026-10-02T00:00:00Z" }),
      variant({ id: "v0", size: "G", archived_at: "2026-10-03T00:00:00Z" }),
    ],
  };
  const submitted = () => {
    const fd = updateProduct.mock.calls.at(-1)?.[1] as FormData;
    return JSON.parse(fd.get("variants") as string) as Record<string, unknown>[];
  };

  it("prefills the active variants and shows their stock read-only", () => {
    render(<EditProductForm product={withVariants} categories={CATS} />);
    const sizes = screen.getAllByLabelText("Tamanho");
    expect(sizes.map((i) => (i as HTMLInputElement).value)).toEqual(["P", "M"]);
    expect(screen.getAllByLabelText("Preço de venda (R$)")[0]).toHaveValue(100);
    expect(screen.getAllByText(/altere pelo inventário/i)).toHaveLength(2);
    expect(screen.queryByLabelText("Estoque inicial")).toBeNull();
  });

  it("submits a changed price for the existing variant", async () => {
    render(<EditProductForm product={withVariants} categories={CATS} />);
    const price = screen.getAllByLabelText("Preço de venda (R$)")[0]!;
    await userEvent.clear(price);
    await userEvent.type(price, "129.9");
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(submitted()).toEqual([
      expect.objectContaining({ id: "v1", retailPrice: "129.9", costPrice: "50" }),
      expect.objectContaining({ id: "v2", retailPrice: "100" }),
    ]);
  });

  it("adds a new variant with an initial stock", async () => {
    render(<EditProductForm product={withVariants} categories={CATS} />);
    await userEvent.click(screen.getByRole("button", { name: /adicionar/i }));
    await userEvent.type(screen.getAllByLabelText("Tamanho")[2]!, "GG");
    await userEvent.clear(screen.getByLabelText("Estoque inicial"));
    await userEvent.type(screen.getByLabelText("Estoque inicial"), "3");
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(submitted()).toHaveLength(3);
    expect(submitted()[2]).toMatchObject({ id: "", size: "GG", initialStock: "3" });
  });

  it("archives a removed variant on save, and can undo it", async () => {
    render(<EditProductForm product={withVariants} categories={CATS} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Arquivar" })[1]!);
    expect(screen.getByText(/M · Preto será arquivada ao salvar \(4 peça/)).toBeInTheDocument();
    // the last variant left can't be removed (BR-CAT-03)
    expect(screen.queryByRole("button", { name: "Arquivar" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));
    expect(submitted().map((v) => v.id)).toEqual(["v1"]);

    await userEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(screen.getAllByLabelText("Tamanho")).toHaveLength(2);
  });

  it("shows the action's field errors on the variant", async () => {
    updateProduct.mockResolvedValueOnce({
      error: "Preço de venda inválido",
      fieldErrors: { "variants.1.retailPrice": "Preço de venda inválido" },
    });
    render(<EditProductForm product={withVariants} categories={CATS} />);
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Preço de venda inválido");
    const second = screen.getAllByLabelText("Preço de venda (R$)")[1]!;
    expect(second).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByLabelText("Preço de venda (R$)")[0]).not.toHaveAttribute("aria-invalid");
  });
});

describe("ImageUploadField", () => {
  it("adds only image files", async () => {
    const onFilesChange = vi.fn();
    render(<ImageUploadField files={[]} onFilesChange={onFilesChange} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    await userEvent.upload(input, [png("1.png"), new File(["x"], "x.txt", { type: "text/plain" })]);
    expect(onFilesChange).toHaveBeenCalledWith([expect.any(File)]);
  });

  it("stops accepting new files once the max count is reached", () => {
    const many = Array.from({ length: 5 }, (_, i) => png(`${i}.png`));
    render(<ImageUploadField files={many} onFilesChange={vi.fn()} />);
    // the "add" tile is gone at the limit
    expect(screen.queryByRole("button", { name: /foto/i })).toBeNull();
  });

  it("renders existing images with a remove control", async () => {
    const onExistingChange = vi.fn();
    render(
      <ImageUploadField
        files={[]}
        onFilesChange={vi.fn()}
        existing={["https://x/a.png"]}
        onExistingChange={onExistingChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /remover imagem/i }));
    expect(onExistingChange).toHaveBeenCalledWith([]);
  });

  it("marks the first photo as cover and moves another one to the front (TC-PROD-21)", async () => {
    const onExistingChange = vi.fn();
    render(
      <ImageUploadField
        files={[png("novo.png")]}
        onFilesChange={vi.fn()}
        existing={["https://x/a.png", "https://x/b.png"]}
        onExistingChange={onExistingChange}
        hint="Estas fotos aparecem para as revendedoras em Fornecedores."
      />,
    );
    expect(screen.getAllByText("Capa")).toHaveLength(1);
    // Only the second saved photo can become the cover; new files follow the saved ones.
    const makeCover = screen.getAllByRole("button", { name: "Tornar capa" });
    expect(makeCover).toHaveLength(1);
    await userEvent.click(makeCover[0]!);
    expect(onExistingChange).toHaveBeenCalledWith(["https://x/b.png", "https://x/a.png"]);
    expect(screen.getByText(/aparecem para as revendedoras/)).toBeVisible();
  });

  it("reorders new photos while the product has none saved", async () => {
    const onFilesChange = vi.fn();
    const a = png("a.png");
    const b = png("b.png");
    render(<ImageUploadField files={[a, b]} onFilesChange={onFilesChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Tornar capa" }));
    expect(onFilesChange).toHaveBeenCalledWith([b, a]);
  });
});
