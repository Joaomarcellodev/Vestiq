import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const publishOffer = vi.fn().mockResolvedValue({});
const updateOfferPhotos = vi.fn().mockResolvedValue({});
vi.mock("../actions", () => ({
  publishOffer: (p: unknown, fd: FormData) => publishOffer(p, fd),
  updateOfferPhotos: (p: unknown, fd: FormData) => updateOfferPhotos(p, fd),
}));

const { PublishOfferForm } = await import("./publish-offer-form");
const { OfferPhotosForm } = await import("./offer-photos-form");

const png = (name: string) =>
  new File([Uint8Array.from([137, 80, 78, 71])], name, { type: "image/png" });

describe("PublishOfferForm (TC-OFFER-13)", () => {
  it("sends the picked photos with the offer", async () => {
    render(
      <PublishOfferForm
        variants={[{ id: "v1", label: "Jaqueta · M (5 un.)" }]}
        networks={[{ id: "n1", name: "Rede Modah" }]}
      />,
    );
    await userEvent.upload(document.querySelector("input[type=file]") as HTMLInputElement, [
      png("a.png"),
      png("b.png"),
    ]);
    await userEvent.type(screen.getByLabelText("Quantidade ofertada"), "2");
    await userEvent.type(screen.getByLabelText("Preço de transferência (R$)"), "150");
    await userEvent.click(screen.getByRole("button", { name: "Publicar na rede" }));

    const fd = publishOffer.mock.calls[0]![1] as FormData;
    expect(fd.getAll("images")).toHaveLength(2);
    expect(fd.get("variantId")).toBe("v1");
  });
});

describe("OfferPhotosForm (TC-OFFER-14)", () => {
  it("saves the new order with the cover first", async () => {
    render(<OfferPhotosForm offerId="o1" photos={["https://x/a.png", "https://x/b.png"]} />);
    const save = screen.getByRole("button", { name: "Salvar fotos" });
    expect(save).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Tornar capa" }));
    await userEvent.click(save);

    const fd = updateOfferPhotos.mock.calls[0]![1] as FormData;
    expect(fd.get("offerId")).toBe("o1");
    expect(JSON.parse(fd.get("existingImages") as string)).toEqual([
      "https://x/b.png",
      "https://x/a.png",
    ]);
  });

  it("explains the fallback and shows the action error", async () => {
    updateOfferPhotos.mockResolvedValueOnce({ error: "Esta oferta não está mais ativa" });
    render(<OfferPhotosForm offerId="o1" photos={["https://x/a.png"]} />);
    await userEvent.click(screen.getByRole("button", { name: "Remover imagem" }));
    expect(screen.getByText(/mostra as fotos do produto/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Salvar fotos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("não está mais ativa");
  });
});
