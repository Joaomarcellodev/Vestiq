import type { Metadata } from "next";
import Link from "next/link";
import { listNetworkOffers } from "@/features/offers/queries";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { Badge, Button, Icon } from "@/components/atoms";
import { formatBRL } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Rede" };

export default async function NetworkPage() {
  const offers = await listNetworkOffers();

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Rede de oportunidades"
        description="Ofertas de peças disponíveis na sua rede."
        action={
          <Link href="/rede/publicar" className="block">
            <Button size="md" className="w-full sm:w-auto">
              <Icon name="add" size={18} />
              Publicar oferta
            </Button>
          </Link>
        }
      />

      {offers.length === 0 ? (
        <EmptyState
          icon="hub"
          title="Nenhuma oferta ativa"
          description="Publique uma peça parada ou aguarde ofertas de parceiros."
        />
      ) : (
        <ul className="grid gap-md sm:grid-cols-2">
          {offers.map((o) => (
            <li
              key={o.id}
              className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-surface"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-title-lg text-title-lg text-on-surface">{o.productName}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {[o.brand, o.descriptor].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {o.isMine ? <Badge tone="primary">Sua oferta</Badge> : <Badge>Oferta</Badge>}
              </div>
              <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
                {o.sellerName} · {o.remaining} disponíve{o.remaining === 1 ? "l" : "is"}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-title-lg text-title-lg text-primary-container">
                  {formatBRL(o.price)}
                </span>
                <Link href={`/rede/ofertas/${o.id}`}>
                  <Button variant="secondary" size="sm">
                    Ver detalhes
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
