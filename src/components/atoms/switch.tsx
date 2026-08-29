"use client";

import { cn } from "@/lib/utils/cn";
import { Spinner } from "./spinner";

type Size = "sm" | "md";

export interface SwitchProps {
  /** Accessible name for the control. */
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Shows a spinner in the knob and blocks interaction. */
  loading?: boolean;
  size?: Size;
  /** Optional visible text rendered next to the track. */
  children?: React.ReactNode;
  className?: string;
}

const tracks: Record<Size, string> = {
  sm: "h-5 w-9",
  md: "h-6 w-11",
};

const knobs: Record<Size, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
};

const travel: Record<Size, string> = {
  sm: "translate-x-4",
  md: "translate-x-5",
};

/**
 * Accessible on/off toggle (`role="switch"`). Replaces paired
 * "activate / deactivate" buttons with a single control.
 */
export function Switch({
  label,
  checked,
  onChange,
  disabled = false,
  loading = false,
  size = "md",
  children,
  className,
}: SwitchProps) {
  const blocked = disabled || loading;

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2",
        blocked ? "cursor-not-allowed opacity-70" : "cursor-pointer",
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={blocked}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2",
          tracks[size],
          checked ? "bg-primary-container" : "bg-surface-container-highest",
          !blocked && "hover:brightness-95",
        )}
      >
        <span
          className={cn(
            "grid place-items-center rounded-full bg-surface-container-lowest text-primary-container shadow-sm transition-transform duration-200 motion-reduce:transition-none",
            knobs[size],
            checked ? travel[size] : "translate-x-0.5",
          )}
        >
          {loading && <Spinner size={size === "sm" ? 10 : 12} />}
        </span>
      </button>
      {children && (
        <span className="font-body-md text-body-md text-on-surface-variant">{children}</span>
      )}
    </label>
  );
}
