import type { Metadata } from "next";
import { getFactoryNetworkOverview } from "@/features/network/queries";
import { disableMember, enableMember } from "@/features/network/actions";
import { MEMBER_STATUS } from "@/lib/i18n/labels";
import {
  CreateNetworkForm,
  InviteResellerForm,
} from "@/features/network/components/factory-network-panel";
import { PageHeader } from "@/components/molecules/page-header";
import { StatCard } from "@/components/molecules/stat-card";
import { Badge, Button } from "@/components/atoms";

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
          hint={`${stats.activeResellers} ativas`}
        />
        <StatCard label="Taxa de utilização" value={`${stats.utilizationRate}%`} />
        <StatCard label="Ofertas" value={String(stats.offers)} />
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
              const status = MEMBER_STATUS[m.status];
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
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {m.status === "ACTIVE" && (
                      <form action={disableMember}>
                        <input type="hidden" name="memberId" value={m.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Desativar
                        </Button>
                      </form>
                    )}
                    {m.status === "DISABLED" && (
                      <form action={enableMember}>
                        <input type="hidden" name="memberId" value={m.id} />
                        <Button type="submit" variant="secondary" size="sm">
                          Reativar
                        </Button>
                      </form>
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
