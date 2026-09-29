import type { Metadata } from "next";
import Link from "next/link";
import { listNetworkOffers } from "@/features/offers/queries";
import { cleanOfferQuery } from "@/features/offers/search";
import { OfferCard } from "@/features/offers/components/offer-card";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { SearchForm } from "@/components/molecules/search-form";
import { Button, Icon } from "@/components/atoms";

export const metadata: Metadata = { title: "Rede" };

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = cleanOfferQuery((await searchParams).q);
  const offers = await listNetworkOffers(query);

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

      <SearchForm query={query} placeholder="Buscar peças, marcas, cores..." />

      {offers.length === 0 ? (
        query ? (
          <EmptyState
            icon="search"
            title="Nenhuma oferta encontrada"
            description="Tente outras palavras, como o nome da peça, a marca, a cor ou a revendedora."
          />
        ) : (
          <EmptyState
            icon="hub"
            title="Nenhuma oferta ativa"
            description="Publique uma peça parada ou aguarde ofertas de parceiros."
          />
        )
      ) : (
        <>
          {query && (
            <p className="font-body-md text-body-md text-on-surface-variant" aria-live="polite">
              {offers.length} oferta{offers.length === 1 ? "" : "s"} para “{query}”
            </p>
          )}
          <ul className="grid gap-md sm:grid-cols-2">
            {offers.map((o) => (
              <li key={o.id}>
                <OfferCard offer={o} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
