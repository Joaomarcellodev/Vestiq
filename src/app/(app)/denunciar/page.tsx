import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/molecules/back-button";
import { PageHeader } from "@/components/molecules/page-header";
import { getOffer } from "@/features/offers/queries";
import { getNegotiation } from "@/features/negotiations/queries";
import { getResellerProfile } from "@/features/network/queries";
import { ReportForm } from "@/features/reports/components/report-form";
import {
  REPORT_TARGET_PARAM,
  reportTargetPath,
  type ReportTarget,
} from "@/features/reports/validation";

export const metadata: Metadata = { title: "Denunciar" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What is being reported, read with the reporter's own access — `null` when she can't see it. */
async function describeTarget(target: ReportTarget, id: string): Promise<string | null> {
  if (target === "OFFER") {
    const result = await getOffer(id).catch(() => null);
    if (!result?.offer || result.isMine) return null;
    return `Oferta “${result.offer.productName}”, de ${result.offer.sellerName}`;
  }
  if (target === "NEGOTIATION") {
    const result = await getNegotiation(id).catch(() => null);
    if (!result?.negotiation) return null;
    const other = result.isSeller
      ? result.negotiation.buyer?.name
      : result.negotiation.seller?.name;
    return `Conversa com ${other ?? "a outra loja"}${result.product ? ` sobre “${result.product.name}”` : ""}`;
  }
  const profile = await getResellerProfile(id);
  if (!profile || profile.isMine) return null;
  return `Revendedora ${profile.name}`;
}

/** VES-43 — report an offer, a negotiation conversation or a reseller. */
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ alvo?: string; id?: string }>;
}) {
  const { alvo, id } = await searchParams;
  const target = alvo ? REPORT_TARGET_PARAM[alvo] : undefined;
  if (!target || !id || !UUID.test(id)) notFound();
  const subject = await describeTarget(target, id);
  if (!subject) notFound();

  return (
    <div className="space-y-lg">
      <BackButton fallback={reportTargetPath(target, id)} label="Voltar" />
      <PageHeader
        title="Denunciar"
        description="Só a moderação do Vestiq vê a sua denúncia. A outra loja não sabe quem denunciou."
      />
      <p className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body-md text-body-md text-on-surface">
        {subject}
      </p>
      <ReportForm targetType={target} targetId={id} />
    </div>
  );
}
