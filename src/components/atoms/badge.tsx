import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "primary" | "success" | "warning" | "error" | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  neutral: "bg-surface-container-high text-on-surface-variant",
  primary: "bg-primary-fixed text-on-primary-fixed-variant",
  success: "bg-success-container text-on-success-container",
  warning: "bg-warning-container text-on-warning-container",
  error: "bg-error-container text-on-error-container",
  info: "bg-info-container text-on-info-container",
};

/** Pill status tag — DESIGN.md §Chips & Badges (low-saturation tint + high-contrast text). */
export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center rounded-full px-3 font-label-md text-label-md",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
