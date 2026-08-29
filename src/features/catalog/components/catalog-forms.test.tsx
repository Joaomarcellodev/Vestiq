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
});
