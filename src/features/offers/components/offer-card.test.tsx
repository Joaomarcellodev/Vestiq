import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfferCard } from "./offer-card";

const PHOTO = "https://abc.supabase.co/storage/v1/object/public/product-images/org/bolsa.jpg";

/** The "seller · N disponíveis" line, whose name may be a link. */
function sellerLine() {
  return screen
    .getByText(/disponíve/)
    .textContent?.replace(/\s+/g, " ")
    .trim();
}

const offer = {
  id: "o1",
  remaining: 2,
  price: 21000,
  note: null,
  isMine: false,
  sellerId: "org-sarah",
  sellerName: "Atelier Sarah",
  productName: "Bolsa Chanel Classic Flap",
  brand: "Chanel",
  imageUrl: PHOTO,
  descriptor: "Preto / Único",
  editedAt: null,
};

describe("OfferCard", () => {
  it("shows the product photo, details, seller and price", () => {
    const { container } = render(<OfferCard offer={offer} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(decodeURIComponent(img!.getAttribute("src") ?? "")).toContain(PHOTO);
    expect(screen.getByText("Bolsa Chanel Classic Flap")).toBeInTheDocument();
    expect(screen.getByText("Chanel · Preto / Único")).toBeInTheDocument();
    expect(sellerLine()).toBe("Atelier Sarah · 2 disponíveis");
    expect(screen.getByText("Oferta")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver detalhes" })).toHaveAttribute(
      "href",
      "/rede/ofertas/o1",
    );
    // VES-65 — the seller's name opens her public profile.
    expect(screen.getByRole("link", { name: "Atelier Sarah" })).toHaveAttribute(
      "href",
      "/rede/revendedoras/org-sarah",
    );
  });

  it("falls back to an icon without a photo, and marks my own offer", () => {
    const { container } = render(
      <OfferCard offer={{ ...offer, imageUrl: null, isMine: true, remaining: 1 }} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Sua oferta")).toBeInTheDocument();
    expect(sellerLine()).toBe("Atelier Sarah · 1 disponível");
    expect(screen.queryByRole("link", { name: "Atelier Sarah" })).toBeNull();
  });

  it("marks an offer the owner edited (VES-89)", () => {
    render(<OfferCard offer={{ ...offer, editedAt: "2026-10-24T19:00:00Z" }} />);
    expect(sellerLine()).toBe("Atelier Sarah · 2 disponíveis · editada");
  });

  it("doesn't link the seller on her own profile's showcase", () => {
    render(<OfferCard offer={offer} linkSeller={false} />);
    expect(screen.queryByRole("link", { name: "Atelier Sarah" })).toBeNull();
  });
});
