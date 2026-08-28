import type { Metadata } from "next";
import { getPublishOptions } from "@/features/offers/queries";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { PublishOfferForm } from "@/features/offers/components/publish-offer-form";
import { PageHeader } from "@/components/molecules/page-header";

export const metadata: Metadata = { title: "Publicar oferta" };

export default async function PublishOfferPage() {
  await requireActiveOrganization();
  const { variants, networks } = await getPublishOptions();
  return (
    <div className="space-y-lg">
      <PageHeader
        title="Publicar oferta"
        description="Disponibilize parte do seu estoque para a rede."
      />
      <PublishOfferForm variants={variants} networks={networks} />
    </div>
  );
}
