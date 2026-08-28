"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, Logo } from "@/components/atoms";
import { cn } from "@/lib/utils/cn";
import { PRIMARY_NAV, isActive, type NavItem } from "./nav-items";
import { signOut } from "@/features/auth/actions";

export interface SidebarNavProps {
  role?: "RESELLER" | "FACTORY_ADMIN" | "PLATFORM_ADMIN";
  orgName?: string;
  userName?: string;
}

/** Persistent left navigation for desktop (lg+). */
export function SidebarNav({ role, orgName, userName }: SidebarNavProps) {
  const pathname = usePathname();
  const items = PRIMARY_NAV.filter((i: NavItem) => !i.roles || (role && i.roles.includes(role)));

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-outline-variant bg-surface-container-lowest lg:flex">
      <div className="flex h-16 items-center px-6">
        <Logo size={28} />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active = isActive(pathname, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 font-body-md text-body-md transition-colors",
                active
                  ? "bg-primary-fixed font-semibold text-on-primary-fixed-variant"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
              )}
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-outline-variant p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-container-high text-on-surface-variant">
            <Icon name="person" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-body-md text-body-md text-on-surface">
              {userName ?? "Conta"}
            </p>
            <p className="truncate font-label-sm text-label-sm text-on-surface-variant">
              {orgName}
            </p>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-body-md text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            <Icon name="logout" size={20} />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
