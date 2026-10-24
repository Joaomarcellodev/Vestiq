import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { BackButton } from "@/components/molecules/back-button";
import { getOffer } from "@/features/offers/queries";
import { cancelOffer } from "@/features/offers/actions";
import { ProposeForm } from "@/features/negotiations/components/propose-form";
import { OfferPhotosForm } from "@/features/offers/components/offer-photos-form";
import { PageHeader } from "@/components/molecules/page-header";
import { ActionForm, SubmitButton } from "@/components/molecules/action-form";
import Link from "next/link";
import { Badge, Button, Icon } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";
import { OFFER_STATUS } from "@/lib/i18n/labels";

export const metadata: Metadata = { title: "Detalhes da oferta" };

// Rendered on the server (UTC on Netlify) — pin the reseller's timezone.
const EDITED_AT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getOffer(id).catch(() => null);
  if (!result?.offer) notFound();
  const { offer, isMine } = result;

  return (
    <div className="space-y-lg">
      <BackButton fallback="/rede" label="Rede" />
      <PageHeader
        title={offer.productName}
        description={[offer.brand, offer.descriptor].filter(Boolean).join(" · ")}
        action={
          <Badge tone={OFFER_STATUS[offer.status].tone}>{OFFER_STATUS[offer.status].label}</Badge>
        }
      />
      {offer.imageUrls.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {offer.imageUrls.map((url) => (
            <div
              key={url}
              className="h-40 w-40 shrink-0 overflow-hidden rounded-xl bg-surface-container"
            >
              <Image
                src={url}
                alt=""
                width={160}
                height={160}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid h-40 w-40 place-items-center rounded-xl bg-surface-container text-outline">
          <Icon name="inventory_2" size={32} />
        </div>
      )}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          Preço de transferência (B2B)
        </p>
        <p className="mt-1 font-headline-lg-mobile text-headline-lg-mobile text-primary-container">
          {formatBRL(offer.price)}
        </p>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          {offer.sellerName} · {offer.remaining} disponíve
          {offer.remaining === 1 ? "l" : "is"}
        </p>
        {offer.note && (
          <p className="mt-3 font-body-md text-body-md text-on-surface">{offer.note}</p>
        )}
        {offer.editedAt && (
          <p className="mt-3 font-label-md text-label-md text-on-surface-variant">
            Editada em {EDITED_AT.format(new Date(offer.editedAt))}
          </p>
        )}
        {isMine && ["ACTIVE", "PARTIALLY_NEGOTIATED"].includes(offer.status) && (
          <Link href={`/rede/ofertas/${offer.id}/editar`} className="mt-md inline-block">
            <Button variant="secondary" size="sm">
              <Icon name="edit" size={16} />
              Editar oferta
            </Button>
          </Link>
        )}
      </div>
      {isMine && ["ACTIVE", "PARTIALLY_NEGOTIATED"].includes(offer.status) && (
        <OfferPhotosForm offerId={offer.id} photos={offer.ownImageUrls} />
      )}
      {isMine ? (
        offer.status !== "CANCELLED" && (
          <ActionForm action={cancelOffer} className="space-y-sm">
            <input type="hidden" name="offerId" value={offer.id} />
            <SubmitButton variant="danger" size="sm">
              Cancelar oferta
            </SubmitButton>
          </ActionForm>
        )
      ) : (
        <ProposeForm offerId={offer.id} remaining={offer.remaining} />
      )}
    </div>
  );
}
