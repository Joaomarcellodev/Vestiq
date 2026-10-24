import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOffer } from "@/features/offers/queries";
import { EditOfferForm } from "@/features/offers/components/edit-offer-form";
import { PageHeader } from "@/components/molecules/page-header";
import { BackButton } from "@/components/molecules/back-button";

export const metadata: Metadata = { title: "Editar oferta" };

/** VES-89 — only the owner, and only while the offer is open. */
export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getOffer(id).catch(() => null);
  const offer = result?.offer;
  if (!offer?.edit || !["ACTIVE", "PARTIALLY_NEGOTIATED"].includes(offer.status)) notFound();

  return (
    <div className="space-y-lg">
      <BackButton fallback={`/rede/ofertas/${id}`} label="Oferta" />
      <PageHeader
        title="Editar oferta"
        description={[offer.productName, offer.descriptor].filter(Boolean).join(" · ")}
      />
      <EditOfferForm
        offer={{
          id: offer.id,
          remaining: offer.remaining,
          price: offer.price,
          note: offer.note,
          maxQuantity: offer.edit.maxQuantity,
          negotiationInProgress: offer.edit.negotiationInProgress,
        }}
      />
    </div>
  );
}
