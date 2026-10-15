import type { Metadata } from "next";
import { getFactoryNetworkOverview } from "@/features/network/queries";
import { EXPIRED_INVITE, MEMBER_STATUS } from "@/lib/i18n/labels";
import {
  CreateNetworkForm,
  InviteResellerForm,
} from "@/features/network/components/factory-network-panel";
import { MemberActiveSwitch } from "@/features/network/components/member-active-switch";
import { CopyInviteLink } from "@/features/network/components/copy-invite-link";
import { PendingInviteActions } from "@/features/network/components/pending-invite-actions";
import { PageHeader } from "@/components/molecules/page-header";
import { StatCard } from "@/components/molecules/stat-card";
import { Badge } from "@/components/atoms";

export const metadata: Metadata = { title: "Rede da fábrica" };

export default async function FactoryNetworkPage() {
  const { factoryName, networks, members, stats } = await getFactoryNetworkOverview();

  return (
    <div className="space-y-lg">
      <PageHeader title="Rede da fábrica" description={factoryName} />

      <div className="grid gap-md sm:grid-cols-3">
        <StatCard
          label="Revendedoras"
          value={String(stats.resellers)}
          hint={
            stats.pendingInvites > 0
              ? `${stats.activeResellers} ativas · ${stats.pendingInvites} ${
                  stats.pendingInvites === 1 ? "convite pendente" : "convites pendentes"
                }`
              : `${stats.activeResellers} ativas`
          }
        />
        <StatCard label="Taxa de utilização" value={`${stats.utilizationRate}%`} />
        <StatCard
          label="Ofertas ativas"
          value={String(stats.offers)}
          hint={`${stats.totalOffers} publicadas no total`}
        />
        <StatCard label="Negociações iniciadas" value={String(stats.negotiationsStarted)} />
        <StatCard label="Negociações concluídas" value={String(stats.negotiationsCompleted)} />
      </div>

      {networks.length === 0 ? (
        <section className="rounded-xl border border-outline-variant p-lg">
          <h2 className="mb-sm font-headline-md text-headline-md text-on-surface">Crie sua rede</h2>
          <CreateNetworkForm />
        </section>
      ) : (
        <InviteResellerForm networks={networks} />
      )}

      <section>
        <h2 className="mb-sm font-headline-md text-headline-md text-on-surface">Membros</h2>
        {members.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            Nenhuma revendedora convidada ainda.
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
            {members.map((m) => {
              const status =
                m.status === "INVITED" && !m.invitePending
                  ? EXPIRED_INVITE
                  : MEMBER_STATUS[m.status];
              return (
                <li
                  key={m.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-body-md text-body-md text-on-surface">
                      {m.reseller?.name ?? m.invited_email}
                    </p>
                    <p className="truncate font-body-md text-body-md text-on-surface-variant">
                      {m.invited_email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {m.invitePending && (
                      <CopyInviteLink token={m.invite_token} email={m.invited_email} />
                    )}
                    {m.status === "INVITED" && (
                      <PendingInviteActions memberId={m.id} email={m.invited_email} />
                    )}
                    {m.status !== "INVITED" && (
                      <MemberActiveSwitch
                        memberId={m.id}
                        active={m.status === "ACTIVE"}
                        resellerName={m.reseller?.name ?? m.invited_email}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
