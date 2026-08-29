import { cn } from "@/lib/utils/cn";

/**
 * Inline SVG icon set — no web-font dependency (Material Symbols failed to load
 * reliably in some environments). 24×24 grid, 2px round strokes to match
 * DESIGN.md §Shapes ("rounded terminals and a 2px stroke weight").
 *
 * Add new icons to PATHS keyed by the semantic name used across the app.
 */

type IconName =
  | "add"
  | "add_circle"
  | "check_circle"
  | "chevron_right"
  | "chevron_left"
  | "dashboard"
  | "delete"
  | "edit"
  | "archive"
  | "devices"
  | "factory"
  | "group"
  | "hub"
  | "inbox"
  | "inventory_2"
  | "lock"
  | "mail"
  | "menu"
  | "more_horiz"
  | "notifications"
  | "person"
  | "point_of_sale"
  | "receipt_long"
  | "search"
  | "swap_horiz"
  | "visibility"
  | "visibility_off"
  | "warning"
  | "logout"
  | "google";

const PATHS: Record<IconName, React.ReactNode> = {
  add: <path d="M12 5v14M5 12h14" />,
  add_circle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  check_circle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  chevron_right: <path d="m9 6 6 6-6 6" />,
  chevron_left: <path d="m15 6-6 6 6 6" />,
  edit: <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3ZM13.5 6.5l4 4" />,
  archive: (
    <>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  delete: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </>
  ),
  devices: (
    <>
      <rect x="3" y="5" width="13" height="11" rx="1.5" />
      <path d="M2 20h13" />
      <rect x="17" y="9" width="5" height="11" rx="1.5" />
    </>
  ),
  factory: (
    <>
      <path d="M3 21h18M4 21V10l6 4V10l6 4V7l4-2v16" />
      <path d="M9 21v-4h4v4" />
    </>
  ),
  group: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 3.5a3 3 0 0 1 0 5.8M21 20c0-2.7-1.8-5-4.2-5.7" />
    </>
  ),
  hub: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="m6.7 7.3 3.5 3.4M17.3 7.3l-3.5 3.4M6.7 16.7l3.5-3.4M17.3 16.7l-3.5-3.4" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 12h5l2 3h4l2-3h5" />
      <path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </>
  ),
  inventory_2: (
    <>
      <path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8ZM3 4h18v4H3zM10 12h4" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  logout: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 12H3m0 0 4-4m-4 4 4 4" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  more_horiz: (
    <>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  notifications: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  point_of_sale: (
    <>
      <rect x="4" y="9" width="16" height="12" rx="1.5" />
      <path d="M8 9V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4M8 14h8M8 17h5" />
    </>
  ),
  receipt_long: (
    <>
      <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  swap_horiz: <path d="M7 8h13m0 0-3-3m3 3-3 3M17 16H4m0 0 3-3m-3 3 3 3" />,
  visibility: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  visibility_off: (
    <>
      <path d="M4 4l16 16M9.5 5.8A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.6M6.4 6.5A17 17 0 0 0 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 3.3-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.5 22 20H2L12 3.5Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  google: (
    <path
      fill="currentColor"
      stroke="none"
      d="M21.35 12.2c0-.7-.06-1.2-.18-1.75H12v3.3h5.3a4.5 4.5 0 0 1-1.96 2.96v2.46h3.17c1.85-1.7 2.84-4.2 2.84-6.97ZM12 22c2.55 0 4.7-.84 6.26-2.28l-3.17-2.46c-.88.6-2 .96-3.09.96-2.38 0-4.4-1.6-5.12-3.77H3.6v2.53A9.5 9.5 0 0 0 12 22ZM6.88 12.45a5.7 5.7 0 0 1 0-3.63V6.29H3.6a9.5 9.5 0 0 0 0 8.68l3.28-2.52ZM12 5.55c1.38 0 2.62.48 3.6 1.42l2.7-2.7A9.5 9.5 0 0 0 12 2 9.5 9.5 0 0 0 3.6 6.29l3.28 2.53C7.6 7.15 9.62 5.55 12 5.55Z"
    />
  ),
};

// Backward-compatible aliases for names used across the codebase.
const ALIAS: Record<string, IconName> = {
  email: "mail",
  message: "mail",
  document: "receipt_long",
  note: "receipt_long",
};

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  name: string;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 24, className, filled: _filled, ...props }: IconProps) {
  const key = (ALIAS[name] ?? name) as IconName;
  const content = PATHS[key];
  if (!content) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      {...props}
    >
      {content}
    </svg>
  );
}
