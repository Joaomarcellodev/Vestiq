import { cn } from "@/lib/utils/cn";

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
  label?: string;
}

/** Indeterminate loading indicator (RNF-USA-003). */
export function Spinner({ size = 20, label = "Carregando", className, ...props }: SpinnerProps) {
  return (
    <svg
      role="status"
      aria-label={label}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("animate-spin", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
