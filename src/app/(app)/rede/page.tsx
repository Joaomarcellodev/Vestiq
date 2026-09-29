import type { Metadata } from "next";
import Link from "next/link";
import { listNetworkOffers } from "@/features/offers/queries";
import { OfferCard } from "@/features/offers/components/offer-card";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { Button, Icon } from "@/components/atoms";

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
            <li key={o.id}>
              <OfferCard offer={o} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
