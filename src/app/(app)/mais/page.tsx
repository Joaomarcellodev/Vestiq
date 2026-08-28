import type { Metadata } from "next";
import Link from "next/link";
import { getActiveOrganization } from "@/features/organizations/queries";
import { signOut } from "@/features/auth/actions";
import { PageHeader } from "@/components/molecules/page-header";
import { Button, Icon } from "@/components/atoms";

export const metadata: Metadata = { title: "Mais" };

export default async function MorePage() {
  const org = await getActiveOrganization();
  const isFactory = org?.role === "FACTORY_ADMIN" || org?.role === "PLATFORM_ADMIN";

  const links = [
    { href: "/clientes", label: "Clientes", icon: "group" },
    { href: "/negociacoes", label: "Negociações", icon: "swap_horiz" },
    ...(isFactory ? [{ href: "/rede-fabrica", label: "Rede da fábrica", icon: "factory" }] : []),
  ];

  return (
    <div className="space-y-lg">
      <PageHeader title="Mais" description={org ? `${org.name} · ${org.role}` : undefined} />

      <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex items-center gap-3 p-4 hover:bg-surface-container-low"
            >
              <Icon name={l.icon} size={22} className="text-on-surface-variant" />
              <span className="font-body-md text-body-md text-on-surface">{l.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <form action={signOut}>
        <Button type="submit" variant="secondary">
          Sair da conta
        </Button>
      </form>
    </div>
  );
}
