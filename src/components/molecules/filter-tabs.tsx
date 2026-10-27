import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface FilterTabsProps {
  /** Base pathname the tabs link to. */
  basePath: string;
  param: string;
  current: string;
  /** `count` > 0 shows a highlighted counter next to the label (e.g. pending items). */
  tabs: { value: string; label: string; count?: number }[];
  /** Extra query params to preserve (e.g. search). */
  extra?: Record<string, string | undefined>;
}

export function FilterTabs({ basePath, param, current, tabs, extra }: FilterTabsProps) {
  return (
    <div className="inline-flex rounded-lg border border-outline-variant bg-surface-container-low p-1">
      {tabs.map((t) => {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(extra ?? {})) if (v) params.set(k, v);
        if (t.value) params.set(param, t.value);
        const qs = params.toString();
        const active = current === t.value;
        return (
          <Link
            key={t.value || "default"}
            href={qs ? `${basePath}?${qs}` : basePath}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-body-md text-body-md font-semibold transition-colors",
              active
                ? "bg-surface-container-lowest text-on-surface shadow-surface"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {t.label}
            {t.count ? (
              <span className="rounded-full bg-warning-container px-1.5 font-label-sm text-label-sm text-on-warning-container">
                {t.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
