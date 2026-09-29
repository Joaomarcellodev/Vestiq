import Link from "next/link";
import Image from "next/image";
import { Badge, Button, Icon } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";
import type { NetworkOffer } from "../queries";

/** Card of the network offer feed (SPEC-008 RF-OFFER-004), with the product photo. */
export function OfferCard({ offer }: { offer: NetworkOffer }) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-container text-outline">
          {offer.imageUrl ? (
            <Image
              src={offer.imageUrl}
              alt=""
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon name="inventory_2" size={22} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-title-lg text-title-lg text-on-surface">{offer.productName}</p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {[offer.brand, offer.descriptor].filter(Boolean).join(" · ")}
          </p>
        </div>
        {offer.isMine ? <Badge tone="primary">Sua oferta</Badge> : <Badge>Oferta</Badge>}
      </div>
      <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
        {offer.sellerName} · {offer.remaining} disponíve{offer.remaining === 1 ? "l" : "is"}
      </p>
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="font-title-lg text-title-lg text-primary-container">
          {formatBRL(offer.price)}
        </span>
        <Link href={`/rede/ofertas/${offer.id}`}>
          <Button variant="secondary" size="sm">
            Ver detalhes
          </Button>
        </Link>
      </div>
    </article>
  );
}
