import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NegotiationProductSummary } from "./negotiation-product";

const PRODUCT = {
  name: "Bolsa Classic Flap",
  brand: "Chanel",
  variant: "Preto / Único",
  imageUrl: "https://img.test/bolsa.jpg",
};

describe("NegotiationProductSummary (VES-97)", () => {
  it("shows the photo, name, brand and variant, plus extra lines", () => {
    const { container } = render(
      <NegotiationProductSummary product={PRODUCT}>
        <p>Boutique · 2 un.</p>
      </NegotiationProductSummary>,
    );
    expect(screen.getByText("Bolsa Classic Flap")).toBeVisible();
    expect(screen.getByText("Chanel · Preto / Único")).toBeVisible();
    expect(screen.getByText("Boutique · 2 un.")).toBeVisible();
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      encodeURIComponent(PRODUCT.imageUrl),
    );
  });

  it("falls back to an icon without a photo, and skips a missing brand", () => {
    const { container } = render(
      <NegotiationProductSummary product={{ ...PRODUCT, brand: null, imageUrl: null }} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Preto / Único")).toBeVisible();
  });

  it("says the product is unavailable when there is none", () => {
    render(<NegotiationProductSummary product={null} />);
    expect(screen.getByText("Produto indisponível")).toBeVisible();
  });
});
