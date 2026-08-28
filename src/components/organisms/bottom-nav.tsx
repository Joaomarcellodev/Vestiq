"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/atoms";
import { cn } from "@/lib/utils/cn";

type NavItem = { href: string; label: string; icon: string; match: string };

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", match: "/dashboard" },
  { href: "/produtos", label: "Products", icon: "inventory_2", match: "/produtos" },
  { href: "/rede", label: "Network", icon: "hub", match: "/rede" },
  { href: "/vendas", label: "Sales", icon: "point_of_sale", match: "/vendas" },
  { href: "/mais", label: "More", icon: "more_horiz", match: "/mais" },
];

/** Mobile bottom navigation — present on every screen of the design. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface-container-lowest md:hidden"
    >
      <ul className="mx-auto flex max-w-app-mobile items-stretch justify-between px-2">
        {ITEMS.map((item) => {
          const active = pathname === item.match || pathname.startsWith(`${item.match}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-2 text-on-surface-variant"
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary-container text-on-primary",
                  )}
                >
                  <Icon name={item.icon} size={22} filled={active} />
                </span>
                <span
                  className={cn(
                    "font-label-sm text-label-sm",
                    active && "font-semibold text-on-surface",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
