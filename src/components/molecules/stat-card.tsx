import { cn } from "@/lib/utils/cn";

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  className?: string;
}

/** Bento-style KPI card — DESIGN.md §Cards / Data Widget. */
export function StatCard({ label, value, hint, accent, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          {label}
        </p>
        {accent && (
          <span className="font-label-md text-label-md text-primary-container">{accent}</span>
        )}
      </div>
      <p className="mt-sm font-headline-md text-headline-md text-on-surface">{value}</p>
      {hint && <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{hint}</p>}
    </div>
  );
}
