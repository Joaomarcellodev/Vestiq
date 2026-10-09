import { Icon } from "@/components/atoms";
import { cn } from "@/lib/utils/cn";

/**
 * Full-page error / not-found state (RNF-USA-003) shared by the route
 * `error.tsx`, `not-found.tsx` and `global-error.tsx` files. `actions` holds
 * the buttons — "Tentar de novo" needs the client `reset`, so callers pass them.
 */
export function ErrorScreen({
  icon = "warning",
  tone = "error",
  title,
  description,
  actions,
}: {
  icon?: string;
  tone?: "error" | "neutral";
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md space-y-lg py-12 text-center">
      <span
        className={cn(
          "mx-auto grid h-16 w-16 place-items-center rounded-full",
          tone === "error"
            ? "bg-error-container text-on-error-container"
            : "bg-surface-container-high text-on-surface-variant",
        )}
      >
        <Icon name={icon} size={28} />
      </span>
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{title}</h1>
        <p className="mt-sm font-body-md text-body-md text-on-surface-variant">{description}</p>
      </div>
      {actions && <div className="flex justify-center gap-2">{actions}</div>}
    </div>
  );
}
