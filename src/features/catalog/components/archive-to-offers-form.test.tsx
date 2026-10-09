import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const archiveProductToOffers = vi.fn().mockResolvedValue({});
vi.mock("../actions", () => ({
  archiveProductToOffers: (p: unknown, fd: FormData) => archiveProductToOffers(p, fd),
}));

const { ArchiveToOffersForm } = await import("./archive-to-offers-form");

const VARIANTS = [
  { variantId: "v1", label: "Preto / P", stock: 3, costPrice: 40 },
  { variantId: "v2", label: "Preto / M", stock: 2, costPrice: 0 },
];
const NETWORK = [{ id: "n1", name: "Rede Modah" }];

describe("ArchiveToOffersForm (TC-PROD-19)", () => {
  it("prefills all the stock at cost price and posts the edited items", async () => {
    render(<ArchiveToOffersForm productId="p1" variants={VARIANTS} networks={NETWORK} />);

    expect(screen.getByLabelText("Quantidade", { selector: "#qty-v1" })).toHaveValue(3);
    expect(screen.getByLabelText("Preço de repasse (R$)", { selector: "#price-v1" })).toHaveValue(
      40,
    );
    expect(screen.getByRole("button", { name: "Arquivar e publicar 2 ofertas" })).toBeVisible();

    const qty2 = screen.getByLabelText("Quantidade", { selector: "#qty-v2" });
    await userEvent.clear(qty2);
    await userEvent.type(qty2, "0");
    await userEvent.click(screen.getByRole("button", { name: "Arquivar e publicar 1 oferta" }));

    const fd = archiveProductToOffers.mock.calls[0]![1] as FormData;
    expect(fd.get("productId")).toBe("p1");
    expect(fd.get("networkId")).toBe("n1");
    expect(JSON.parse(fd.get("items") as string)).toEqual([
      { variantId: "v1", quantity: 3, transferPrice: 40 },
      { variantId: "v2", quantity: 0, transferPrice: 0 },
    ]);
  });

  it("lets the reseller pick the network when she is in more than one", () => {
    render(
      <ArchiveToOffersForm
        productId="p1"
        variants={VARIANTS}
        networks={[...NETWORK, { id: "n2", name: "Rede Sul" }]}
      />,
    );
    expect(screen.getByLabelText("Rede")).toHaveValue("n1");
  });

  it("only archives without a network (TC-PROD-20)", async () => {
    render(<ArchiveToOffersForm productId="p1" variants={VARIANTS} networks={[]} />);
    expect(screen.getByText(/não participa de nenhuma rede/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Arquivar produto" }));
    const fd = archiveProductToOffers.mock.calls.at(-1)![1] as FormData;
    expect(fd.get("items")).toBe("[]");
  });

  it("shows the error returned by the action", async () => {
    archiveProductToOffers.mockResolvedValueOnce({ error: "Você tem apenas 3 em estoque" });
    render(<ArchiveToOffersForm productId="p1" variants={[]} networks={NETWORK} />);
    expect(screen.getByText(/sem estoque/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Arquivar produto" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Você tem apenas 3 em estoque");
  });
});
