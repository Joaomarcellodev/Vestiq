import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-sm rounded-lg font-label-md text-label-md uppercase tracking-wider transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

const variants: Record<Variant, string> = {
  // DESIGN.md §Buttons — buttons use the primary-container fill (see ADR-0006)
  primary: "bg-primary-container text-on-primary shadow-primary hover:bg-primary",
  secondary:
    "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container",
  ghost: "text-on-surface-variant hover:bg-surface-container hover:text-primary-container",
  danger: "bg-error text-on-error hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3",
  md: "h-11 px-4",
  lg: "h-12 px-6",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
});
