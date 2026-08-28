export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Path prefix that marks this item active. */
  match: string;
  /** Roles allowed to see it; omit = everyone. */
  roles?: ("RESELLER" | "FACTORY_ADMIN" | "PLATFORM_ADMIN")[];
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", match: "/dashboard" },
  { href: "/produtos", label: "Produtos", icon: "inventory_2", match: "/produtos" },
  { href: "/vendas", label: "Vendas", icon: "point_of_sale", match: "/vendas" },
  { href: "/clientes", label: "Clientes", icon: "group", match: "/clientes" },
  { href: "/rede", label: "Rede", icon: "hub", match: "/rede" },
  { href: "/negociacoes", label: "Negociações", icon: "swap_horiz", match: "/negociacoes" },
  {
    href: "/rede-fabrica",
    label: "Rede da fábrica",
    icon: "factory",
    match: "/rede-fabrica",
    roles: ["FACTORY_ADMIN", "PLATFORM_ADMIN"],
  },
];

/** The 5 items shown in the mobile bottom bar. */
export const BOTTOM_NAV: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: "dashboard", match: "/dashboard" },
  { href: "/produtos", label: "Produtos", icon: "inventory_2", match: "/produtos" },
  { href: "/vendas", label: "Vendas", icon: "point_of_sale", match: "/vendas" },
  { href: "/rede", label: "Rede", icon: "hub", match: "/rede" },
  { href: "/mais", label: "Mais", icon: "more_horiz", match: "/mais" },
];

export function isActive(pathname: string, match: string): boolean {
  return pathname === match || pathname.startsWith(`${match}/`);
}
