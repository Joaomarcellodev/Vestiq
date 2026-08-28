import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/molecules/back-button";
import { getOffer } from "@/features/offers/queries";
import { cancelOffer } from "@/features/offers/actions";
import { ProposeForm } from "@/features/negotiations/components/propose-form";
import { PageHeader } from "@/components/molecules/page-header";
import { Badge, Button } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Detalhes da oferta" };

export default async function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getOffer(id).catch(() => null);
  if (!result?.offer) notFound();
  const { offer, isMine } = result;
  const variant = offer.product_variants;

  return (
    <div className="space-y-lg">
      <BackButton fallback="/rede" label="Rede" />
      <PageHeader
        title={variant?.products?.name ?? "Oferta"}
        description={[
          variant?.products?.brand,
          [variant?.color, variant?.size].filter(Boolean).join(" / "),
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <Badge tone={offer.status === "ACTIVE" ? "success" : "warning"}>{offer.status}</Badge>
        }
      />

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          Preço de transferência (B2B)
        </p>
        <p className="mt-1 font-headline-lg-mobile text-headline-lg-mobile text-primary-container">
          {formatBRL(Number(offer.transfer_price))}
        </p>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          {offer.organizations?.name} · {offer.quantity_remaining} disponíve
          {offer.quantity_remaining === 1 ? "l" : "is"}
        </p>
        {offer.note && (
          <p className="mt-3 font-body-md text-body-md text-on-surface">{offer.note}</p>
        )}
      </div>

      {isMine ? (
        offer.status !== "CANCELLED" && (
          <form action={cancelOffer}>
            <input type="hidden" name="offerId" value={offer.id} />
            <Button type="submit" variant="danger" size="sm">
              Cancelar oferta
            </Button>
          </form>
        )
      ) : (
        <ProposeForm offerId={offer.id} remaining={offer.quantity_remaining} />
      )}
    </div>
  );
}
