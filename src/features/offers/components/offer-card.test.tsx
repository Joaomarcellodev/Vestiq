import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfferCard } from "./offer-card";

const PHOTO = "https://abc.supabase.co/storage/v1/object/public/product-images/org/bolsa.jpg";

const offer = {
  id: "o1",
  remaining: 2,
  price: 21000,
  note: null,
  isMine: false,
  sellerName: "Atelier Sarah",
  productName: "Bolsa Chanel Classic Flap",
  brand: "Chanel",
  imageUrl: PHOTO,
  descriptor: "Preto / Único",
};

describe("OfferCard", () => {
  it("shows the product photo, details, seller and price", () => {
    const { container } = render(<OfferCard offer={offer} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(decodeURIComponent(img!.getAttribute("src") ?? "")).toContain(PHOTO);
    expect(screen.getByText("Bolsa Chanel Classic Flap")).toBeInTheDocument();
    expect(screen.getByText("Chanel · Preto / Único")).toBeInTheDocument();
    expect(screen.getByText("Atelier Sarah · 2 disponíveis")).toBeInTheDocument();
    expect(screen.getByText("Oferta")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/rede/ofertas/o1");
  });

  it("falls back to an icon without a photo, and marks my own offer", () => {
    const { container } = render(
      <OfferCard offer={{ ...offer, imageUrl: null, isMine: true, remaining: 1 }} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Sua oferta")).toBeInTheDocument();
    expect(screen.getByText("Atelier Sarah · 1 disponível")).toBeInTheDocument();
  });
});
