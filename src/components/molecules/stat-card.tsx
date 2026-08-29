"use client";

import { cn } from "@/lib/utils/cn";
import { CountUp } from "@/components/motion";
import { formatBRL } from "@/lib/utils/currency";

type NumberFormat = "int" | "brl" | "percent";

const FORMATTERS: Record<NumberFormat, (n: number) => string> = {
  int: (n) => String(Math.round(n)),
  brl: (n) => formatBRL(n),
  percent: (n) => `${Math.round(n)}%`,
};

export interface StatCardProps {
  label: string;
  /** Static string, or a number to count up to. */
  value: string | number;
  /** How to format a numeric `value` (ignored for strings). */
  format?: NumberFormat;
  hint?: string;
  accent?: string;
  className?: string;
}

/** Bento-style KPI card — DESIGN.md §Cards / Data Widget. */
export function StatCard({ label, value, format = "int", hint, accent, className }: StatCardProps) {
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
      <p className="mt-sm font-headline-md text-headline-md text-on-surface">
        {typeof value === "number" ? <CountUp value={value} format={FORMATTERS[format]} /> : value}
      </p>
      {hint && <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{hint}</p>}
    </div>
  );
}
