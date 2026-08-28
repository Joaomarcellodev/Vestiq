"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/atoms";
import { cn } from "@/lib/utils/cn";
import { BOTTOM_NAV, isActive } from "./nav-items";

/** Mobile bottom navigation (hidden on lg+, where the sidebar takes over). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface-container-lowest/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {BOTTOM_NAV.map((item) => {
          const active = isActive(pathname, item.match);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-2"
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    active ? "bg-primary-container text-on-primary" : "text-on-surface-variant",
                  )}
                >
                  <Icon name={item.icon} size={22} />
                </span>
                <span
                  className={cn(
                    "font-label-sm text-label-sm",
                    active ? "font-semibold text-on-surface" : "text-on-surface-variant",
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
