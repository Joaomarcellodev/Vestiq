import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { BackButton } from "@/components/molecules/back-button";
import { EmptyState } from "@/components/molecules/empty-state";
import { Pager } from "@/components/molecules/pager";
import { Badge, Icon } from "@/components/atoms";
import { getResellerProfile } from "@/features/network/queries";
import { listNetworkOffers } from "@/features/offers/queries";
import { OfferCard } from "@/features/offers/components/offer-card";
import { StarRating } from "@/features/reviews/components/star-rating";
import { ReportLink } from "@/features/reports/components/report-link";
import { parsePage } from "@/lib/pagination";

export const metadata: Metadata = { title: "Perfil da revendedora" };

// Rendered on the server (UTC on Netlify) — pin the reseller's timezone.
const MEMBER_SINCE = new Intl.DateTimeFormat("pt-BR", {
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

/** VES-65 — a network peer's public profile: identity, public counters and her showcase. */
export default async function ResellerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const [{ id }, { pagina }] = await Promise.all([params, searchParams]);
  const profile = await getResellerProfile(id);
  if (!profile) notFound();
  const {
    items: offers,
    page,
    hasNext,
  } = await listNetworkOffers(undefined, parsePage(pagina), profile.id);

  const stats = [
    { label: "Ofertas ativas", value: String(profile.activeOffers) },
    { label: "Negócios concluídos", value: String(profile.completedDeals) },
    { label: "Membro desde", value: MEMBER_SINCE.format(new Date(profile.memberSince)) },
  ];

  return (
    <div className="space-y-lg">
      <BackButton fallback="/rede" label="Rede" />

      <section className="flex flex-col items-center gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg text-center shadow-surface sm:flex-row sm:text-left">
        <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-container-high text-on-surface-variant">
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt=""
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon name="person" size={36} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              {profile.name}
            </h1>
            {profile.isMine && <Badge tone="primary">Seu perfil</Badge>}
          </div>
          <p className="mt-1 flex flex-wrap items-center justify-center gap-2 font-body-md text-body-md text-on-surface-variant sm:justify-start">
            {profile.ratingAverage !== null ? (
              <>
                <StarRating value={profile.ratingAverage} size={16} />
                <span>
                  {profile.ratingAverage.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} (
                  {profile.ratingCount} avaliaç{profile.ratingCount === 1 ? "ão" : "ões"})
                </span>
              </>
            ) : (
              "Ainda sem avaliações"
            )}
          </p>
          {profile.city && (
            <p className="mt-1 inline-flex items-center gap-1 font-body-md text-body-md text-on-surface-variant">
              <Icon name="location_on" size={16} />
              {profile.city}
            </p>
          )}
        </div>
      </section>

      {!profile.isMine && (
        <div className="flex justify-end">
          <ReportLink target="ORGANIZATION" id={profile.id} label="Denunciar revendedora" />
        </div>
      )}

      <dl className="grid grid-cols-3 gap-sm">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-center shadow-surface"
          >
            <dt className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              {s.label}
            </dt>
            <dd className="mt-1 font-title-lg text-title-lg text-on-surface">{s.value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-md">
        <h2 className="font-title-lg text-title-lg text-on-surface">Vitrine</h2>
        {offers.length === 0 ? (
          <EmptyState
            icon="hub"
            title={page > 1 ? "Não há mais ofertas nesta página" : "Nenhuma oferta ativa"}
            description={
              page > 1 ? undefined : "Quando ela publicar peças na rede, elas aparecem aqui."
            }
          />
        ) : (
          <ul className="grid gap-md sm:grid-cols-2">
            {offers.map((o) => (
              <li key={o.id}>
                <OfferCard offer={o} linkSeller={false} />
              </li>
            ))}
          </ul>
        )}
        <Pager
          basePath={`/rede/revendedoras/${profile.id}`}
          params={{}}
          page={page}
          hasNext={hasNext}
        />
      </section>
    </div>
  );
}
