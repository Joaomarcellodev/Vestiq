import type { Metadata } from "next";
import Link from "next/link";
import { getActiveOrganization } from "@/features/organizations/queries";
import { PageHeader } from "@/components/molecules/page-header";
import { Icon } from "@/components/atoms";
import { MEMBER_ROLE } from "@/lib/i18n/labels";

export const metadata: Metadata = { title: "Mais" };

export default async function MorePage() {
  const org = await getActiveOrganization();
  const isFactory = org?.role === "FACTORY_ADMIN" || org?.role === "PLATFORM_ADMIN";

  const links = [
    { href: "/perfil", label: "Meu perfil", icon: "person" },
    { href: "/clientes", label: "Clientes", icon: "group" },
    { href: "/negociacoes", label: "Negociações", icon: "swap_horiz" },
    ...(isFactory ? [{ href: "/rede-fabrica", label: "Rede da fábrica", icon: "factory" }] : []),
  ];

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Mais"
        description={org ? `${org.name} · ${MEMBER_ROLE[org.role]}` : undefined}
      />

      <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex items-center justify-between gap-3 p-4 hover:bg-surface-container-low"
            >
              <span className="flex items-center gap-3">
                <Icon name={l.icon} size={22} className="text-on-surface-variant" />
                <span className="font-body-md text-body-md text-on-surface">{l.label}</span>
              </span>
              <Icon name="chevron_right" size={20} className="text-outline" />
            </Link>
          </li>
        ))}
      </ul>

      <p className="font-body-md text-body-md text-on-surface-variant">
        Para sair da conta, abra{" "}
        <Link href="/perfil" className="font-semibold text-primary-container">
          Meu perfil
        </Link>
        .
      </p>
    </div>
  );
}
